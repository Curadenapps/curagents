/**
 * figma/poller.ts
 * Fetches the BOB Figma file and returns components + tokens with checksums.
 * Used by figma agent for design diff detection.
 */

import { createHash } from "crypto";

const FIGMA_API = "https://api.figma.com/v1";
const TOKEN = process.env.FIGMA_API_TOKEN!;
const FILE_KEY = process.env.FIGMA_FILE_KEY!;

const headers = { "X-Figma-Token": TOKEN };

export interface FigmaComponent {
  id: string;
  name: string;
  lastModified: string;
  checksum: string;
  assetType: string | null;
}

export interface FigmaToken {
  id: string;
  name: string;
  value: string;
  checksum: string;
  assetType: string;
}

/** Extract asset type from component name prefix (e.g. "icon/arrow" → "icon") */
function extractAssetType(name: string): string | null {
  const prefix = name.split("/")[0].toLowerCase().trim();
  const approved = [
    "icon", "logo", "typography", "color", "illustration",
    "3d", "store_screenshot", "web_asset", "template",
  ];
  return approved.includes(prefix) ? prefix : null;
}

/** Compute a short checksum for change detection */
function checksum(value: string): string {
  return createHash("md5").update(value).digest("hex").slice(0, 8);
}

/** Fetch the Figma file and return components + styles */
export async function fetchFigmaFile(): Promise<{
  fileLastModified: string;
  components: FigmaComponent[];
  tokens: FigmaToken[];
}> {
  const res = await fetch(
    `${FIGMA_API}/files/${FILE_KEY}?depth=1`,
    { headers }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Figma API error: ${res.status} ${err}`);
  }

  const data = await res.json() as any;
  const fileLastModified: string = data.lastModified;

  // Components
  const components: FigmaComponent[] = Object.entries(
    data.components ?? {}
  ).map(([id, comp]: [string, any]) => ({
    id,
    name: comp.name,
    lastModified: fileLastModified,
    checksum: checksum(`${comp.name}:${fileLastModified}:${id}`),
    assetType: extractAssetType(comp.name),
  }));

  // Styles (design tokens: colors, typography, etc.)
  const tokens: FigmaToken[] = Object.entries(
    data.styles ?? {}
  ).map(([id, style]: [string, any]) => ({
    id,
    name: style.name,
    value: style.description ?? "",
    checksum: checksum(`${style.name}:${style.description ?? ""}:${id}`),
    assetType: extractAssetType(style.name) ?? "color",
  }));

  return { fileLastModified, components, tokens };
}
