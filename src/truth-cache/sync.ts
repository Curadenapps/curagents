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

/** BOB Roadmap database — roadmap of record (dream.md §2) */
const BOB_ROADMAP_DB_ID = "751b6071283e43e8b1a91054319e0db6";

export interface RoadmapRow {
  id: string;
  url: string;
  name: string;
  level: string | null;
  epic: string | null;
  release: string | null;
  status: string | null;
  priority: string | null;
  date_start: string | null;
  date_end: string | null;
  asana_gids: string[];
  jira_key: string | null;
  last_edited_time: string;
}

const select = (p: any): string | null => p?.select?.name ?? null;
const text = (p: any): string | null =>
  (p?.rich_text ?? p?.title ?? []).map((t: any) => t.plain_text).join("") || null;

/** Every long numeric id in an Asana URL — covers /0/{project}/{task} and /task/{gid} forms */
function asanaGids(url: string | null): string[] {
  return url ? [...url.matchAll(/\d{10,}/g)].map((m) => m[0]) : [];
}

/** Fetch all BOB Roadmap rows and write .truth-cache/roadmap.json (no LLM) */
export async function syncRoadmap(): Promise<number> {
  const rows: RoadmapRow[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`${NOTION_API}/databases/${BOB_ROADMAP_DB_ID}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });
    if (!res.ok) throw new Error(`Notion roadmap query ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as any;
    for (const page of data.results) {
      const p = page.properties;
      const asanaLink = p["Asana Link"]?.url ?? null;
      rows.push({
        id: page.id,
        url: page.url,
        name: text(p["Name"]) ?? "(untitled)",
        level: select(p["Level"]),
        epic: select(p["Epic"]),
        release: select(p["Release"]),
        status: select(p["Status"]),
        priority: select(p["Priority"]),
        date_start: p["Date"]?.date?.start ?? null,
        date_end: p["Date"]?.date?.end ?? null,
        // Asana URLs also contain the project gid; matching only ever looks up task gids
        asana_gids: asanaGids(asanaLink),
        jira_key: text(p["Jira Key"]),
        last_edited_time: page.last_edited_time,
      });
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  atomicWrite("roadmap.json", {
    synced_at: new Date().toISOString(),
    notion_database_id: BOB_ROADMAP_DB_ID,
    rows,
  });
  return rows.length;
}
