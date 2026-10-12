/**
 * notion/create-broadcast.ts
 * Creates Notion pages for BOB Weekly Broadcast and release changelogs.
 * Used by curaden-communications skill and release agent.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const NOTION_API = "https://api.notion.com/v1";
const KEY = process.env.NOTION_API_KEY!;

const headers = {
  Authorization: `Bearer ${KEY}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

function getParentId(): string | null {
  const metaPath = join(".truth-cache", "app-hub.json");
  if (!existsSync(metaPath)) return null;
  const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
  return meta.bob_broadcast_parent_id ?? null;
}

/** Create a Notion page with markdown content under the broadcast parent */
export async function createBroadcastPage(
  title: string,
  markdownContent: string,
  dryRun = false
): Promise<{ url: string; id: string } | null> {
  const parentId = getParentId();

  if (!parentId) {
    console.error("create-broadcast: no broadcast parent ID in app-hub.json");
    return null;
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would create Notion page: "${title}" under ${parentId}`);
    return null;
  }

  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [{ text: { content: title } }],
        },
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: markdownContent } }],
          },
        },
      ],
    }),
  });

  const data = await res.json() as any;
  if (!res.ok) {
    console.error("create-broadcast: Notion API error", data);
    return null;
  }

  return { url: data.url, id: data.id };
}
