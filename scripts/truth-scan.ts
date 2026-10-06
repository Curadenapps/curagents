/**
 * scripts/truth-scan.ts
 * Deterministic half of truth-catcher: Asana BOB App tasks vs the Notion BOB Roadmap.
 * Claude only judges tasks that no roadmap row links to (see agents/truth-catcher.md).
 *
 *   prepare — sync roadmap.json, fetch changed Asana tasks, classify, write scan-input.json
 *   post    — merge Claude's decisions, post one comment per misaligned task, record verdicts
 *
 * Usage: npx -y tsx scripts/truth-scan.ts <prepare|post>
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { syncRoadmap, type RoadmapRow } from "../src/truth-cache/sync";
import { postComment } from "../src/asana/post-verdict";

const CACHE_DIR = ".truth-cache";
const ASANA_API = "https://app.asana.com/api/1.0";
const PROJECT_GID = process.env.ASANA_PROJECT_GID || "1204489225205419"; // BOB App
const BOB_V2_MILESTONE_GID = "1217949875186079";
const DRY_RUN = process.env.DRY_RUN !== "false";
/** Comments post from the token owner's account; the signature says who they are posted for */
const ON_BEHALF_OF = process.env.TRUTH_CATCHER_ON_BEHALF_OF || "Sean Dunne";

/** Releases that are not being built now — active work on them is "too early" */
const LATER_RELEASES = ["V2 P1 Apr-27", "Rollout Apr–Aug-27", "Future", "Parked", "Unscheduled"];
/** Sections that mean work is happening. Confirm against real section names in the first dry run. */
const ACTIVE_SECTION = /implementation|in progress|development|review|qa/i;

type FindingType =
  | "wrong_release"
  | "asana_done_roadmap_open"
  | "roadmap_done_asana_open"
  | "roadmap_cut_asana_open"
  | "not_on_roadmap";

interface Task {
  gid: string;
  name: string;
  completed: boolean;
  modified_at: string;
  section: string | null;
  parent_gid: string | null;
  url: string;
  assignee: string | null;
}

interface Verdict {
  task_gid: string;
  fingerprint: string;
  findings: FindingType[];
  posted_at: string;
}

interface VerdictsFile {
  last_scan_at?: string;
  verdicts: Verdict[];
}

// ── cache helpers ────────────────────────────────────────────────────────────

mkdirSync(CACHE_DIR, { recursive: true });

function readJson<T>(file: string, fallback: T): T {
  const path = join(CACHE_DIR, file);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : fallback;
}

function atomicWrite(file: string, data: unknown): void {
  const target = join(CACHE_DIR, file);
  writeFileSync(`${target}.tmp`, JSON.stringify(data, null, 2));
  renameSync(`${target}.tmp`, target);
}

function output(key: string, value: string): void {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}

function summary(md: string): void {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  else console.log(md);
}

// ── Asana ────────────────────────────────────────────────────────────────────

const OPT_FIELDS =
  "name,completed,modified_at,parent.gid,memberships.section.name,memberships.project.gid,permalink_url,assignee.name";

async function asanaPages(path: string, params: Record<string, string>): Promise<any[]> {
  const out: any[] = [];
  let offset: string | undefined;
  do {
    const qs = new URLSearchParams({ ...params, opt_fields: OPT_FIELDS, limit: "100" });
    if (offset) qs.set("offset", offset);
    const res = await fetch(`${ASANA_API}${path}?${qs}`, {
      headers: { Authorization: `Bearer ${process.env.ASANA_ACCESS_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Asana ${path} ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as any;
    out.push(...data.data);
    offset = data.next_page?.offset;
  } while (offset);
  return out;
}

function toTask(t: any): Task {
  const membership = (t.memberships ?? []).find((m: any) => m.project?.gid === PROJECT_GID);
  return {
    gid: t.gid,
    name: t.name,
    completed: Boolean(t.completed),
    modified_at: t.modified_at,
    section: membership?.section?.name ?? null,
    parent_gid: t.parent?.gid ?? null,
    url: t.permalink_url,
    assignee: t.assignee?.name ?? null,
  };
}

/** Baseline: all open tasks. Incremental: tasks modified since the last scan. */
async function fetchTasks(since: string | undefined): Promise<Task[]> {
  const filter: Record<string, string> = since
    ? { modified_since: since }
    : { completed_since: "now" }; // Asana: "now" returns incomplete tasks only
  // GET /tasks (not /projects/{gid}/tasks) because only it supports modified_since
  const top = await asanaPages("/tasks", { project: PROJECT_GID, ...filter });
  const v2 = await asanaPages(`/tasks/${BOB_V2_MILESTONE_GID}/subtasks`, {});
  const v2Changed = v2.filter((t) => (since ? t.modified_at > since : !t.completed));
  const byGid = new Map<string, Task>();
  for (const t of [...top, ...v2Changed]) byGid.set(t.gid, toTask(t));
  return [...byGid.values()];
}

// ── classification ───────────────────────────────────────────────────────────

function classify(task: Task, row: RoadmapRow): FindingType[] {
  const findings: FindingType[] = [];
  const active = !task.completed && task.section !== null && ACTIVE_SECTION.test(task.section);
  if (active && (LATER_RELEASES.includes(row.release ?? "") || row.priority === "Parked")) {
    findings.push("wrong_release");
  }
  if (task.completed && row.status !== "Done" && row.status !== "Cut") findings.push("asana_done_roadmap_open");
  if (!task.completed && row.status === "Done") findings.push("roadmap_done_asana_open");
  if (!task.completed && row.status === "Cut") findings.push("roadmap_cut_asana_open");
  return findings;
}

function fingerprint(task: Task, row: RoadmapRow | null, findings: string[]): string {
  return [findings.join("+"), row?.release, row?.status, row?.priority, task.section, task.completed].join("|");
}

// ── prepare ──────────────────────────────────────────────────────────────────

async function prepare(): Promise<void> {
  const scanStartedAt = new Date().toISOString();
  rmSync(join(CACHE_DIR, "scan-decisions.json"), { force: true }); // never reuse a previous run's judgement
  const rowCount = await syncRoadmap();
  const { rows } = readJson<{ rows: RoadmapRow[] }>("roadmap.json", { rows: [] });
  const verdicts = readJson<VerdictsFile>("verdicts.json", { verdicts: [] });
  const tasks = await fetchTasks(verdicts.last_scan_at);

  const rowByGid = new Map<string, RoadmapRow>();
  for (const row of rows) for (const gid of row.asana_gids) if (!rowByGid.has(gid)) rowByGid.set(gid, row);
  const seen = new Set(verdicts.verdicts.map((v) => `${v.task_gid}:${v.fingerprint}`));

  const flagged: any[] = [];
  const unlinked: any[] = [];
  let aligned = 0;
  let alreadyCommented = 0;

  for (const task of tasks) {
    const row = rowByGid.get(task.gid) ?? (task.parent_gid ? rowByGid.get(task.parent_gid) : undefined) ?? null;
    const findings: FindingType[] = row ? classify(task, row) : ["not_on_roadmap"];
    if (findings.length === 0) { aligned++; continue; }
    const fp = fingerprint(task, row, findings);
    if (seen.has(`${task.gid}:${fp}`)) { alreadyCommented++; continue; }
    const item = { task, row, findings, fingerprint: fp };
    (row ? flagged : unlinked).push(item);
  }

  // Compact roadmap list for Claude's matching of unlinked tasks
  const roadmapFeatures = rows
    .filter((r) => r.level !== "Task" && r.status !== "Cut")
    .map((r) => ({ id: r.id, name: r.name, level: r.level, epic: r.epic, release: r.release, status: r.status }));

  atomicWrite("scan-input.json", {
    scan_started_at: scanStartedAt,
    baseline: !verdicts.last_scan_at,
    dry_run: DRY_RUN,
    counts: { roadmap_rows: rowCount, tasks: tasks.length, aligned, already_commented: alreadyCommented, flagged: flagged.length, unlinked: unlinked.length },
    flagged,
    unlinked,
    roadmap_features: unlinked.length ? roadmapFeatures : [],
  });

  console.log(
    `truth-scan prepare: ${rowCount} roadmap rows, ${tasks.length} tasks → ${aligned} aligned, ` +
      `${flagged.length} flagged, ${unlinked.length} unlinked for review, ${alreadyCommented} already commented`
  );
  output("needs_judgement", String(unlinked.length > 0));
}

// ── post ─────────────────────────────────────────────────────────────────────

const LINES: Record<FindingType, (task: Task, row: RoadmapRow | null) => [string, string]> = {
  wrong_release: (t, r) => [
    `Too early: this task is in "${t.section}", but roadmap row "${r!.name}" is planned for ${r!.priority === "Parked" ? "Parked priority" : r!.release}.`,
    "Move the roadmap row into a current release (Soft Launch Oct-26, Web Nov-26, Hard Launch Dec-26), or pause this task.",
  ],
  asana_done_roadmap_open: (_t, r) => [
    `Status drift: this task is complete, but roadmap row "${r!.name}" is "${r!.status ?? "no status"}".`,
    "Set the roadmap row to Done, or reopen this task if work remains.",
  ],
  roadmap_done_asana_open: (_t, r) => [
    `Status drift: roadmap row "${r!.name}" is Done, but this task is still open.`,
    "Complete this task, or set the roadmap row back to In Progress.",
  ],
  roadmap_cut_asana_open: (_t, r) => [
    `Cut from roadmap: roadmap row "${r!.name}" is Cut, but this task is still open.`,
    "Stop work and close this task, or restore the row in Notion if the decision changed.",
  ],
  not_on_roadmap: () => [
    "Not on roadmap: no BOB Roadmap row links to this task.",
    "Add a BOB Roadmap row (or put this task's link in an existing row's Asana Link) before work continues.",
  ],
};

function commentText(task: Task, row: RoadmapRow | null, findings: FindingType[], reason: string | null, runId: string): string {
  const critical = findings.includes("roadmap_cut_asana_open");
  const lines = findings.map((f) => LINES[f](task, row));
  return [
    `🔎 Truth Catcher: ${critical ? "🔴 cut from" : "⚠️ not aligned with"} the BOB Roadmap`,
    "",
    ...lines.map(([what]) => `• ${what}`),
    ...(reason ? [`  ${reason}`] : []),
    "",
    `Roadmap: ${row?.url ?? "https://www.notion.so/751b6071283e43e8b1a91054319e0db6"}`,
    `Suggested fix: ${lines.map(([, fix]) => fix).join(" ")}`,
    "",
    `— Truth Catcher, on behalf of ${ON_BEHALF_OF} · run ${runId}`,
  ].join("\n");
}

async function post(): Promise<void> {
  const input = readJson<any>("scan-input.json", null);
  if (!input) throw new Error("scan-input.json missing — run prepare first");
  // Claude's decisions for unlinked tasks: { decisions: [{ task_gid, decision: "matched"|"not_on_roadmap", row_id?, reason }] }
  const { decisions = [] } = readJson<any>("scan-decisions.json", {});
  const decisionByGid = new Map<string, any>(decisions.map((d: any) => [d.task_gid, d]));
  const verdicts = readJson<VerdictsFile>("verdicts.json", { verdicts: [] });
  const runId = input.scan_started_at;

  const toPost: { item: any; reason: string | null }[] = input.flagged.map((item: any) => ({ item, reason: null }));
  const matched: string[] = [];
  for (const item of input.unlinked) {
    const d = decisionByGid.get(item.task.gid);
    if (d?.decision === "matched") { matched.push(`${item.task.name} → ${d.row_name ?? d.row_id} (${d.reason})`); continue; }
    toPost.push({ item, reason: d?.reason ?? null });
  }

  summary(`## Truth Catcher ${input.dry_run ? "(dry run — nothing posted)" : ""}\n`);
  summary(`Tasks scanned: ${input.counts.tasks} · aligned: ${input.counts.aligned} · comments: ${toPost.length} · ` +
    `unlinked but matched (no comment): ${matched.length} · already commented: ${input.counts.already_commented}\n`);

  let posted = 0;
  for (const { item, reason } of toPost) {
    const text = commentText(item.task, item.row, item.findings, reason, runId);
    summary(`### [${item.task.name}](${item.task.url})${item.task.section ? ` — ${item.task.section}` : ""}\n\`\`\`\n${text}\n\`\`\`\n`);
    const result = await postComment(item.task.gid, text, input.dry_run);
    if (result) {
      posted++;
      verdicts.verdicts.push({ task_gid: item.task.gid, fingerprint: item.fingerprint, findings: item.findings, posted_at: new Date().toISOString() });
    }
  }
  if (matched.length) summary(`### Unlinked but matched — add the Asana Link to these rows\n${matched.map((m) => `- ${m}`).join("\n")}\n`);

  // Dry runs leave state untouched so the first live run sees the same tasks
  if (!input.dry_run) {
    verdicts.last_scan_at = runId;
    atomicWrite("verdicts.json", verdicts);
  }
  console.log(`truth-scan post: ${posted} posted, ${toPost.length} comments ${input.dry_run ? "previewed" : "attempted"}, ${matched.length} matched`);
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "post") await post();
else {
  console.error("usage: truth-scan.ts <prepare|post>");
  process.exit(2);
}
