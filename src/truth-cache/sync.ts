/**
 * truth-cache/sync.ts
 * Fetches Notion workspace pages and writes structured JSON to .truth-cache/
 * Called by notion-sync agent. All other agents read from cache — never Notion directly.
 */

import { writeFileSync, mkdirSync, renameSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const CACHE_DIR = ".truth-cache";
const NOTION_API = "https://api.notion.com/v1";
const ROOT_DB_ID = process.env.NOTION_ROOT_DATABASE_ID!;
const NOTION_KEY = process.env.NOTION_API_KEY!;

const headers = {
  Authorization: `Bearer ${NOTION_KEY}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

/** Atomic write: write to .tmp then rename to prevent partial reads */
function atomicWrite(filename: string, data: unknown): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  const target = join(CACHE_DIR, filename);
  const tmp = `${target}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, target);
}

/** Search Notion workspace for a page/database by query string */
async function searchNotion(query: string): Promise<any[]> {
  const res = await fetch(`${NOTION_API}/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, page_size: 5 }),
  });
  const data = await res.json() as any;
  return data.results ?? [];
}

/** Discover and cache all required Notion pages */
export async function syncNotionCache(): Promise<void> {
  const meta: Record<string, string> = {};
  const targets: Record<string, string> = {
    requirements: "BOB Requirements",
    roadmap: "Roadmap",
    brand_guidelines: "Brand Guidelines",
    app_hub: "BOB App Hub",
    bob_broadcast_parent: "BOB Weekly Broadcast",
  };

  // Load existing meta to skip re-discovery if IDs already known
  const metaPath = join(CACHE_DIR, "notion-sync-meta.json");
  if (existsSync(metaPath)) {
    const existing = JSON.parse(readFileSync(metaPath, "utf-8"));
    Object.assign(meta, existing.page_ids ?? {});
  }

  for (const [key, query] of Object.entries(targets)) {
    if (!meta[key]) {
      const pages = await searchNotion(query);
      if (pages.length > 0) meta[key] = pages[0].id;
    }
  }

  // Write meta
  atomicWrite("notion-sync-meta.json", {
    last_sync: new Date().toISOString(),
    page_ids: meta,
    workspace: "seandunne",
    root_database_id: ROOT_DB_ID,
  });

  // Write requirements cache
  atomicWrite("requirements.json", {
    synced_at: new Date().toISOString(),
    notion_page_id: meta.requirements ?? null,
    requirements: [],
  });

  // Write app-hub cache
  atomicWrite("app-hub.json", {
    synced_at: new Date().toISOString(),
    notion_page_id: meta.app_hub ?? null,
    bob_broadcast_parent_id: meta.bob_broadcast_parent ?? null,
    last_release_version: null,
    last_release_date: null,
  });

  console.log("notion-sync: cache updated", meta);
}
