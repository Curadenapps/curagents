/**
 * asana/get-recent-activity.ts
 * Polls Asana /events with a sync token — fallback when webhook is unavailable.
 * Stores sync token in .truth-cache/directives.json between runs.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ASANA_API = "https://app.asana.com/api/1.0";
const TOKEN = process.env.ASANA_ACCESS_TOKEN!;
const PROJECT_GID = process.env.ASANA_PROJECT_GID!;
const CACHE_FILE = join(".truth-cache", "directives.json");

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

interface DirectivesCache {
  sync_token?: string;
  allowlist?: string[];
  directives?: unknown[];
}

function loadCache(): DirectivesCache {
  if (!existsSync(CACHE_FILE)) return {};
  return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
}

function saveToken(token: string): void {
  const cache = loadCache();
  cache.sync_token = token;
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/** Fetch up to 100 events since last sync token */
export async function getRecentActivity(): Promise<{
  events: unknown[];
  hasMore: boolean;
  newSyncToken: string;
}> {
  const cache = loadCache();
  const params = new URLSearchParams({ resource: PROJECT_GID });
  if (cache.sync_token) params.set("sync", cache.sync_token);

  const res = await fetch(`${ASANA_API}/events?${params}`, { headers });

  // 412 means sync token expired — get fresh token
  if (res.status === 412) {
    const fresh = await res.json() as any;
    saveToken(fresh.sync);
    return { events: [], hasMore: false, newSyncToken: fresh.sync };
  }

  const data = await res.json() as any;
  if (data.sync) saveToken(data.sync);

  return {
    events: data.data ?? [],
    hasMore: data.has_more ?? false,
    newSyncToken: data.sync ?? cache.sync_token ?? "",
  };
}
