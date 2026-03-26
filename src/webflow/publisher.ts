/**
 * webflow/publisher.ts
 * Creates and publishes Webflow CMS collection items.
 * Used by webflow agent for asset sync and release note publishing.
 */

const WEBFLOW_API = "https://api.webflow.com/v2";
const TOKEN = process.env.WEBFLOW_API_TOKEN!;
const SITE_ID = process.env.WEBFLOW_SITE_ID!;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
  "accept-version": "2.0.0",
};

export interface CollectionItem {
  fieldData: Record<string, unknown>;
  isDraft?: boolean;
  isArchived?: boolean;
}

/** Get all collections for the site */
export async function getCollections(): Promise<
  Array<{ id: string; displayName: string; slug: string }>
> {
  const res = await fetch(
    `${WEBFLOW_API}/sites/${SITE_ID}/collections`,
    { headers }
  );
  const data = await res.json() as any;
  return data.collections ?? [];
}

/** Create a new item in a CMS collection */
export async function createCollectionItem(
  collectionId: string,
  item: CollectionItem,
  dryRun = false
): Promise<{ id: string } | null> {
  if (dryRun) {
    console.log(`[DRY RUN] Would create item in collection ${collectionId}:`, item);
    return null;
  }

  const res = await fetch(
    `${WEBFLOW_API}/collections/${collectionId}/items`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ fieldData: item.fieldData }),
    }
  );

  const data = await res.json() as any;
  if (!res.ok) {
    console.error(`webflow: create item failed`, data);
    return null;
  }

  return { id: data.id };
}

/** Publish staged items to the live site */
export async function publishSite(dryRun = false): Promise<boolean> {
  if (dryRun) {
    console.log(`[DRY RUN] Would publish site ${SITE_ID}`);
    return true;
  }

  const res = await fetch(`${WEBFLOW_API}/sites/${SITE_ID}/publish`, {
    method: "POST",
    headers,
    body: JSON.stringify({ domains: [] }), // publish to all domains
  });

  return res.ok;
}

/** Clinical claims scan — returns flagged phrases found in content */
export function scanClinicalClaims(content: string): string[] {
  const triggers = [
    "improves", "prevents", "reduces", "clinically proven",
    "whitens", "heals", "treats", "effective against",
    "recommended by", "scientifically proven", "removes plaque",
    "fights bacteria", "strengthens", "restores",
  ];
  return triggers.filter((t) =>
    content.toLowerCase().includes(t.toLowerCase())
  );
}
