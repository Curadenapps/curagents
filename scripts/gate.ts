/**
 * scripts/gate.ts
 * Cheap change detection run before each scheduled Claude step. Calls the source
 * API directly (no LLM) and writes `changed=true|false` to $GITHUB_OUTPUT so the
 * workflow can skip the Claude run — and its tokens — when nothing has changed.
 *
 * Usage: npx -y tsx scripts/gate.ts <notion|asana|figma>
 * Any error fails open (changed=true): a broken gate must never hide real work.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { getRecentActivity } from "../src/asana/get-recent-activity";
import { fetchFigmaFile } from "../src/figma/poller";

const CACHE_DIR = ".truth-cache";
mkdirSync(CACHE_DIR, { recursive: true });

function readCache(file: string): any {
  const path = join(CACHE_DIR, file);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : null;
}

/** Changed if any Notion page was edited after the last notion-sync run */
async function notionChanged(): Promise<[boolean, string]> {
  const lastSync: string | undefined = readCache("notion-sync-meta.json")?.last_sync;
  if (!lastSync) return [true, "no previous sync"];

  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 1,
    }),
  });
  if (!res.ok) throw new Error(`Notion API ${res.status}`);
  const latest: string | undefined = ((await res.json()) as any).results?.[0]?.last_edited_time;
  if (!latest) return [false, "no pages visible to integration"];
  return [Date.parse(latest) > Date.parse(lastSync), `latest edit ${latest}, last sync ${lastSync}`];
}

/** Changed if the Asana project has events since the stored sync token */
async function asanaChanged(): Promise<[boolean, string]> {
  // Without a stored token the first call only mints one, so we can't tell — run the agent.
  const hadToken = Boolean(readCache("directives.json")?.sync_token);
  const { events, hasMore } = await getRecentActivity();
  if (!hadToken) return [true, "no previous sync token"];
  return [events.length > 0 || hasMore, `${events.length} event(s)${hasMore ? "+" : ""}`];
}

/** Changed if the Figma file was modified since the figma agent's last run */
async function figmaChanged(): Promise<[boolean, string]> {
  const known: string | undefined = readCache("figma-state.json")?.file_last_modified;
  const { fileLastModified } = await fetchFigmaFile();
  if (!known) return [true, "no previous figma state"];
  return [fileLastModified !== known, `file ${fileLastModified}, known ${known}`];
}

const checks: Record<string, () => Promise<[boolean, string]>> = {
  notion: notionChanged,
  asana: asanaChanged,
  figma: figmaChanged,
};

const source = process.argv[2];
const check = checks[source];
if (!check) {
  console.error(`usage: gate.ts <${Object.keys(checks).join("|")}>`);
  process.exit(2);
}

let changed: boolean;
let reason: string;
try {
  [changed, reason] = await check();
} catch (err) {
  [changed, reason] = [true, `gate error, failing open: ${(err as Error).message}`];
}

console.log(`gate ${source}: changed=${changed} (${reason})`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
