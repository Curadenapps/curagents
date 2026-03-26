/**
 * asana/post-verdict.ts
 * Posts verdict/audit/update comments to Asana tasks.
 * Used by truth-catcher, brand-asset, asana-maintenance, and github agents.
 */

const ASANA_API = "https://app.asana.com/api/1.0";
const TOKEN = process.env.ASANA_ACCESS_TOKEN!;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

export type VerdictType =
  | "violation_critical"
  | "violation_warning"
  | "verified"
  | "audit_trail"
  | "update_snippet"
  | "figma_change"
  | "pr_linked"
  | "pr_missing_link"
  | "publish_confirmed";

/** Post a comment (story) to an Asana task */
export async function postComment(
  taskGid: string,
  text: string,
  dryRun = false
): Promise<{ gid: string } | null> {
  if (dryRun) {
    console.log(`[DRY RUN] Would post to task ${taskGid}:\n${text}`);
    return null;
  }

  const res = await fetch(`${ASANA_API}/tasks/${taskGid}/stories`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: { text } }),
  });

  const data = await res.json() as any;
  if (!res.ok) {
    console.error(`post-verdict: failed for task ${taskGid}`, data);
    return null;
  }

  return { gid: data.data.gid };
}

/** Move a task to a Kanban section */
export async function moveTaskToSection(
  sectionGid: string,
  taskGid: string,
  dryRun = false
): Promise<boolean> {
  if (dryRun) {
    console.log(`[DRY RUN] Would move task ${taskGid} to section ${sectionGid}`);
    return true;
  }

  const res = await fetch(`${ASANA_API}/sections/${sectionGid}/addTask`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: { task: taskGid } }),
  });

  if (!res.ok) {
    const err = await res.json() as any;
    console.error(`move-task: failed task ${taskGid} → section ${sectionGid}`, err);
    return false;
  }

  return true;
}

/** Get all sections for a project (used for section name → GID resolution) */
export async function getProjectSections(
  projectGid: string
): Promise<Array<{ gid: string; name: string }>> {
  const res = await fetch(
    `${ASANA_API}/projects/${projectGid}/sections?opt_fields=gid,name`,
    { headers }
  );
  const data = await res.json() as any;
  return data.data ?? [];
}
