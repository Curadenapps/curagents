/**
 * scripts/truth-scan.ts
 * Deterministic half of Truth Catcher: Asana BOB App tasks vs the Notion Product Roadmap (BOB + Curaprox app).
 * Claude only judges what needs judgement (see agents/truth-catcher.md):
 *   - unlinked tasks: matched / non_product / not_on_roadmap
 *   - roadmap tasks showing delay signals: ok (rationale or Sean's call) / question
 *
 *   prepare — sync roadmap.json, fetch changed tasks, rule checks, delay candidates,
 *             unanswered questions due for escalation → scan-input.json
 *   post    — merge Claude's decisions, post comments, escalate, record state
 *
 * Usage: npx -y tsx scripts/truth-scan.ts <prepare|post>
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { syncRoadmap, type RoadmapRow } from "../src/truth-cache/sync";
import { escapeHtml, mention, postComment } from "../src/asana/post-verdict";

const CACHE_DIR = ".truth-cache";
const ASANA_API = "https://app.asana.com/api/1.0";
const PROJECT_GID = process.env.ASANA_PROJECT_GID || "1204489225205419"; // BOB App
const BOB_V2_MILESTONE_GID = "1217949875186079";
const ROADMAP_URL = "https://www.notion.so/751b6071283e43e8b1a91054319e0db6";
/** Roadmap rules (reviewed by Sean). Live only when DRY_RUN=false. */
const DRY_RUN = process.env.DRY_RUN !== "false";
/** Delay questions + escalations address colleagues by name — separate switch, previewed first */
const DELAY_DRY_RUN = DRY_RUN || process.env.DELAY_DRY_RUN !== "false";
/** Comments post from the token owner's account; the signature says who they are posted for */
const ON_BEHALF_OF = process.env.TRUTH_CATCHER_ON_BEHALF_OF || "Sean Dunne";
const ESCALATE_AFTER_WORKING_DAYS = 3;
const MAX_DELAY_CANDIDATES = 20;

/** Releases being built now — delays here put a launch at risk */
const CURRENT_RELEASES = ["Soft Launch Oct-26", "Web Nov-26", "Hard Launch Dec-26"];
/** Releases that are not being built now — active work on them is "too early" */
const LATER_RELEASES = ["V2 P1 Apr-27", "Rollout Apr–Aug-27", "Future", "Parked", "Unscheduled"];
/** Sections that mean work is happening. */
const ACTIVE_SECTION = /implementation|in progress|development|review|qa/i;
/** Sections that mean work is waiting on someone. */
const WAITING_SECTION = /blocked|feedback|waiting|on hold|decision|pending/i;

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
  due_on: string | null;
  section: string | null;
  parent_gid: string | null;
  url: string;
  assignee: { gid: string; name: string } | null;
}

interface Story {
  gid: string;
  created_at: string;
  author: { gid: string; name: string } | null;
  kind: "comment" | "system";
  text: string;
}

interface Verdict {
  task_gid: string;
  fingerprint: string;
  findings: string[];
  posted_at: string;
}

interface OpenQuestion {
  task_gid: string;
  task_name: string;
  task_url: string;
  ask_user_gid: string;
  ask_user_name: string;
  question: string;
  asked_at: string;
  escalated_at?: string;
  resolved_at?: string;
}

interface VerdictsFile {
  last_scan_at?: string;
  verdicts: Verdict[];
  open_questions?: OpenQuestion[];
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

/** Mon–Fri days elapsed after `from` up to `to` */
function workingDaysBetween(from: string, to: Date): number {
  let days = 0;
  const d = new Date(from);
  d.setUTCHours(0, 0, 0, 0);
  for (d.setUTCDate(d.getUTCDate() + 1); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) days++;
  }
  return days;
}

// ── Asana ────────────────────────────────────────────────────────────────────

const TASK_FIELDS =
  "name,completed,modified_at,due_on,parent.gid,memberships.section.name,memberships.project.gid,permalink_url,assignee.name";
const STORY_FIELDS = "created_at,created_by.name,resource_subtype,type,text";

async function asana(path: string, params: Record<string, string> = {}): Promise<any> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${ASANA_API}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${process.env.ASANA_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Asana ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function asanaPages(path: string, params: Record<string, string>, fields: string): Promise<any[]> {
  const out: any[] = [];
  let offset: string | undefined;
  do {
    const data = await asana(path, { ...params, opt_fields: fields, limit: "100", ...(offset ? { offset } : {}) });
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
    due_on: t.due_on ?? null,
    section: membership?.section?.name ?? null,
    parent_gid: t.parent?.gid ?? null,
    url: t.permalink_url,
    assignee: t.assignee ? { gid: t.assignee.gid, name: t.assignee.name } : null,
  };
}

/** Baseline: all open tasks. Incremental: tasks modified since the last scan. */
async function fetchTasks(since: string | undefined): Promise<Task[]> {
  const filter: Record<string, string> = since
    ? { modified_since: since }
    : { completed_since: "now" }; // Asana: "now" returns incomplete tasks only
  // GET /tasks (not /projects/{gid}/tasks) because only it supports modified_since
  const top = await asanaPages("/tasks", { project: PROJECT_GID, ...filter }, TASK_FIELDS);
  const v2 = await asanaPages(`/tasks/${BOB_V2_MILESTONE_GID}/subtasks`, {}, TASK_FIELDS);
  const v2Changed = v2.filter((t) => (since ? t.modified_at > since : !t.completed));
  const byGid = new Map<string, Task>();
  for (const t of [...top, ...v2Changed]) byGid.set(t.gid, toTask(t));
  return [...byGid.values()];
}

/** Comments plus due-date / section system stories since `since`, oldest first, text trimmed */
async function fetchStories(taskGid: string, since: string): Promise<Story[]> {
  const stories = await asanaPages(`/tasks/${taskGid}/stories`, {}, STORY_FIELDS);
  return stories
    .filter((s) => s.created_at >= since)
    .filter((s) => s.type === "comment" || /due_date|section_changed|unassigned|assigned/.test(s.resource_subtype ?? ""))
    .map((s) => ({
      gid: s.gid,
      created_at: s.created_at,
      author: s.created_by ? { gid: s.created_by.gid, name: s.created_by.name } : null,
      kind: s.type === "comment" ? ("comment" as const) : ("system" as const),
      text: String(s.text ?? "").slice(0, 400),
    }));
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

/** Signals that a launch-relevant roadmap task may be slipping */
function delaySignals(task: Task, row: RoadmapRow, today: string): string[] {
  const signals: string[] = [];
  const roadmapDate = row.date_end ?? row.date_start;
  if (task.section && WAITING_SECTION.test(task.section)) signals.push(`in waiting section "${task.section}"`);
  if (task.due_on && task.due_on < today) signals.push(`overdue since ${task.due_on}`);
  if (task.due_on && roadmapDate && task.due_on > roadmapDate) signals.push(`due ${task.due_on}, after roadmap date ${roadmapDate}`);
  return signals;
}

// ── prepare ──────────────────────────────────────────────────────────────────

async function prepare(): Promise<void> {
  const now = new Date();
  const scanStartedAt = now.toISOString();
  const today = scanStartedAt.slice(0, 10);
  rmSync(join(CACHE_DIR, "scan-decisions.json"), { force: true }); // never reuse a previous run's judgement

  const rowCount = await syncRoadmap();
  const { rows } = readJson<{ rows: RoadmapRow[] }>("roadmap.json", { rows: [] });
  const verdicts = readJson<VerdictsFile>("verdicts.json", { verdicts: [] });
  const openQuestions = (verdicts.open_questions ?? []).filter((q) => !q.resolved_at && !q.escalated_at);
  const owner = (await asana("/users/me", { opt_fields: "name" })).data as { gid: string; name: string };
  const tasks = await fetchTasks(verdicts.last_scan_at);

  const rowByGid = new Map<string, RoadmapRow>();
  for (const row of rows) for (const gid of row.asana_gids) if (!rowByGid.has(gid)) rowByGid.set(gid, row);
  const seen = new Set(verdicts.verdicts.map((v) => `${v.task_gid}:${v.fingerprint}`));
  const questioned = new Set(openQuestions.map((q) => q.task_gid));
  // Look back over the last scan window (14 days on the baseline) for delay evidence
  const storiesSince = verdicts.last_scan_at ?? new Date(now.getTime() - 14 * 86400000).toISOString();

  const flagged: any[] = [];
  const unlinked: any[] = [];
  const delayCandidates: any[] = [];
  let aligned = 0;
  let alreadyCommented = 0;

  for (const task of tasks) {
    const row = rowByGid.get(task.gid) ?? (task.parent_gid ? rowByGid.get(task.parent_gid) : undefined) ?? null;
    const findings: FindingType[] = row ? classify(task, row) : ["not_on_roadmap"];

    if (findings.length === 0) aligned++;
    else {
      const fp = fingerprint(task, row, findings);
      if (seen.has(`${task.gid}:${fp}`)) alreadyCommented++;
      else (row ? flagged : unlinked).push({ task, row, findings, fingerprint: fp });
    }

    // Delay check: open, launch-relevant roadmap tasks not already waiting on an answer
    const launchRelevant = row && (CURRENT_RELEASES.includes(row.release ?? "") || row.priority === "P1");
    if (!row || !launchRelevant || task.completed || questioned.has(task.gid)) continue;
    if (delayCandidates.length >= MAX_DELAY_CANDIDATES) continue;
    const signals = delaySignals(task, row, today);
    const stories = await fetchStories(task.gid, storiesSince);
    const recentDueChange = stories.some((s) => s.kind === "system" && /due/i.test(s.text));
    if (recentDueChange) signals.push("due date changed recently");
    if (signals.length === 0 && !stories.some((s) => s.kind === "comment")) continue;
    delayCandidates.push({
      task,
      row: { id: row.id, name: row.name, url: row.url, release: row.release, priority: row.priority, date: row.date_end ?? row.date_start },
      signals,
      stories,
    });
  }

  // Unanswered questions: resolved by a reply from the person asked, escalated after N working days
  const toEscalate: OpenQuestion[] = [];
  const resolved: string[] = [];
  for (const q of openQuestions) {
    const replies = (await fetchStories(q.task_gid, q.asked_at)).filter(
      (s) => s.kind === "comment" && s.author && s.author.gid !== owner.gid
    );
    // Any reply from someone other than the token owner counts as an answer; Claude re-judges on the next change
    if (replies.length > 0) resolved.push(q.task_gid);
    else if (workingDaysBetween(q.asked_at, now) >= ESCALATE_AFTER_WORKING_DAYS) toEscalate.push(q);
  }

  const roadmapFeatures = rows
    .filter((r) => r.level !== "Task" && r.status !== "Cut")
    .map((r) => ({ id: r.id, name: r.name, product: r.product, level: r.level, epic: r.epic, release: r.release, status: r.status }));

  atomicWrite("scan-input.json", {
    scan_started_at: scanStartedAt,
    baseline: !verdicts.last_scan_at,
    dry_run: DRY_RUN,
    delay_dry_run: DELAY_DRY_RUN,
    owner,
    counts: {
      roadmap_rows: rowCount, tasks: tasks.length, aligned, already_commented: alreadyCommented,
      flagged: flagged.length, unlinked: unlinked.length, delay_candidates: delayCandidates.length,
      questions_resolved: resolved.length, questions_to_escalate: toEscalate.length,
    },
    flagged,
    unlinked,
    delay_candidates: delayCandidates,
    resolved_questions: resolved,
    escalate: toEscalate,
    roadmap_features: unlinked.length ? roadmapFeatures : [],
  });

  console.log(
    `truth-scan prepare: ${rowCount} roadmap rows, ${tasks.length} tasks → ${aligned} aligned, ` +
      `${flagged.length} flagged, ${unlinked.length} unlinked, ${delayCandidates.length} delay candidates, ` +
      `${toEscalate.length} to escalate, ${alreadyCommented} already commented`
  );
  output("needs_judgement", String(unlinked.length > 0 || delayCandidates.length > 0));
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
    "Not on roadmap: no Product Roadmap row links to this task.",
    "Add a Product Roadmap row (or put this task's link in an existing row's Asana Link) before work continues.",
  ],
};

const signature = (runId: string) => `— Truth Catcher, on behalf of ${ON_BEHALF_OF} · run ${runId}`;

function findingComment(task: Task, row: RoadmapRow | null, findings: FindingType[], reason: string | null, runId: string): string {
  const critical = findings.includes("roadmap_cut_asana_open");
  const lines = findings.map((f) => LINES[f](task, row));
  return [
    `🔎 Truth Catcher: ${critical ? "🔴 cut from" : "⚠️ not aligned with"} the Product Roadmap`,
    "",
    ...lines.map(([what]) => `• ${what}`),
    ...(reason ? [`  ${reason}`] : []),
    "",
    `Roadmap: ${row?.url ?? ROADMAP_URL}`,
    `Suggested fix: ${lines.map(([, fix]) => fix).join(" ")}`,
    "",
    signature(runId),
  ].join("\n");
}

/** Question comment: plain text for logs/preview, rich text with a real @mention for Asana */
function questionComment(c: any, d: any, runId: string): { text: string; html: string } {
  const head = "🔎 Truth Catcher: ❓ roadmap item at risk";
  const why = `${d.reason} Roadmap row "${c.row.name}" is planned for ${c.row.release ?? "an unscheduled release"}${c.row.date ? ` (${c.row.date})` : ""}.`;
  const ask = d.question;
  const deadline = `Please reply here with the decision or the reason. If there's no reply within ${ESCALATE_AFTER_WORKING_DAYS} working days, this is reported to ${ON_BEHALF_OF}.`;
  const text = [head, "", `• ${why}`, "", `@${d.ask_user_name} ${ask}`, deadline, "", `Roadmap: ${c.row.url}`, "", signature(runId)].join("\n");
  const html = [
    `<strong>${escapeHtml(head)}</strong>`,
    "",
    `• ${escapeHtml(why)}`,
    "",
    `${mention(d.ask_user_gid)} ${escapeHtml(ask)}`,
    escapeHtml(deadline),
    "",
    `Roadmap: <a href="${escapeHtml(c.row.url)}">${escapeHtml(c.row.name)}</a>`,
    "",
    `<em>${escapeHtml(signature(runId))}</em>`,
  ].join("\n");
  return { text, html };
}

function escalationComment(q: OpenQuestion, runId: string): string {
  return [
    "🔎 Truth Catcher: 🔺 escalated",
    "",
    `No reply from ${q.ask_user_name} within ${ESCALATE_AFTER_WORKING_DAYS} working days to: "${q.question}"`,
    `This has been reported to ${ON_BEHALF_OF}.`,
    "",
    signature(runId),
  ].join("\n");
}

/** One GitHub issue per escalation so it survives the CI cache and shows up in reports */
async function openEscalationIssue(q: OpenQuestion): Promise<string | null> {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return null;
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({
      title: `Truth Catcher escalation: ${q.task_name}`,
      labels: ["truth-catcher-escalation"],
      body: [
        `**Task:** [${q.task_name}](${q.task_url})`,
        `**Waiting on:** ${q.ask_user_name}`,
        `**Question:** ${q.question}`,
        `**Asked:** ${q.asked_at} — no reply after ${ESCALATE_AFTER_WORKING_DAYS} working days.`,
        "",
        "Close this issue once the decision is made.",
      ].join("\n"),
    }),
  });
  if (!res.ok) { console.error(`escalation issue failed: ${res.status} ${await res.text()}`); return null; }
  return ((await res.json()) as any).html_url;
}

async function post(): Promise<void> {
  const input = readJson<any>("scan-input.json", null);
  if (!input) throw new Error("scan-input.json missing — run prepare first");
  // Claude's decisions — see agents/truth-catcher.md Step 2
  const { decisions = [], delay_decisions = [] } = readJson<any>("scan-decisions.json", {});
  const decisionByGid = new Map<string, any>(decisions.map((d: any) => [d.task_gid, d]));
  const delayByGid = new Map<string, any>(delay_decisions.map((d: any) => [d.task_gid, d]));
  const verdicts = readJson<VerdictsFile>("verdicts.json", { verdicts: [] });
  verdicts.open_questions ??= [];
  const runId = input.scan_started_at;
  const now = new Date().toISOString();

  // 1. Roadmap findings (rules reviewed by Sean)
  const toPost: { item: any; reason: string | null }[] = input.flagged.map((item: any) => ({ item, reason: null }));
  const matched: string[] = [];
  const nonProduct: string[] = [];
  for (const item of input.unlinked) {
    const d = decisionByGid.get(item.task.gid);
    if (d?.decision === "matched") { matched.push(`${item.task.name} → ${d.row_name ?? d.row_id} (${d.reason})`); continue; }
    if (d?.decision === "non_product") { nonProduct.push(`${item.task.name} (${d.reason})`); continue; }
    toPost.push({ item, reason: d?.reason ?? null });
  }

  summary(`## Truth Catcher\n`);
  summary(`Roadmap rules: ${input.dry_run ? "**dry run**" : "live"} · delay questions: ${input.delay_dry_run ? "**dry run**" : "live"}\n`);
  summary(`Tasks scanned: ${input.counts.tasks} · aligned: ${input.counts.aligned} · roadmap comments: ${toPost.length} · ` +
    `matched (no comment): ${matched.length} · non-product (no comment): ${nonProduct.length} · ` +
    `delay candidates: ${input.counts.delay_candidates} · already commented: ${input.counts.already_commented}\n`);

  let posted = 0;
  for (const { item, reason } of toPost) {
    const text = findingComment(item.task, item.row, item.findings, reason, runId);
    summary(`### [${item.task.name}](${item.task.url})${item.task.section ? ` — ${item.task.section}` : ""}\n\`\`\`\n${text}\n\`\`\`\n`);
    if (await postComment(item.task.gid, text, input.dry_run)) {
      posted++;
      verdicts.verdicts.push({ task_gid: item.task.gid, fingerprint: item.fingerprint, findings: item.findings, posted_at: now });
    }
  }
  if (matched.length) summary(`### Unlinked but matched — add the Asana Link to these rows\n${matched.map((m) => `- ${m}`).join("\n")}\n`);
  if (nonProduct.length) summary(`### Non-product work (no comment)\n${nonProduct.map((m) => `- ${m}`).join("\n")}\n`);

  // 2. Delay questions (separate switch)
  const okDelays: string[] = [];
  for (const c of input.delay_candidates) {
    const d = delayByGid.get(c.task.gid);
    if (!d || d.decision !== "question" || !d.ask_user_gid) { if (d) okDelays.push(`${c.task.name} (${d.reason})`); continue; }
    const { text, html } = questionComment(c, d, runId);
    summary(`### ❓ [${c.task.name}](${c.task.url}) — asks ${d.ask_user_name}\n\`\`\`\n${text}\n\`\`\`\n`);
    if (await postComment(c.task.gid, text, input.delay_dry_run, html)) {
      posted++;
      verdicts.open_questions.push({
        task_gid: c.task.gid, task_name: c.task.name, task_url: c.task.url,
        ask_user_gid: d.ask_user_gid, ask_user_name: d.ask_user_name, question: d.question, asked_at: now,
      });
    }
  }
  if (okDelays.length) summary(`### Delays with a rationale (no comment)\n${okDelays.map((m) => `- ${m}`).join("\n")}\n`);

  // 3. Resolve answered questions, escalate unanswered ones
  for (const gid of input.resolved_questions) {
    const q = verdicts.open_questions.find((x) => x.task_gid === gid && !x.resolved_at && !x.escalated_at);
    if (q) q.resolved_at = now;
  }
  for (const e of input.escalate as OpenQuestion[]) {
    const text = escalationComment(e, runId);
    summary(`### 🔺 Escalation: [${e.task_name}](${e.task_url}) — waiting on ${e.ask_user_name}\n\`\`\`\n${text}\n\`\`\`\n`);
    if (input.delay_dry_run) { console.log(`[DRY RUN] Would escalate task ${e.task_gid}`); continue; }
    await postComment(e.task_gid, text, false);
    const issue = await openEscalationIssue(e);
    if (issue) summary(`Reported: ${issue}\n`);
    const q = verdicts.open_questions.find((x) => x.task_gid === e.task_gid && x.asked_at === e.asked_at);
    if (q) q.escalated_at = now;
  }

  // Dry runs leave state untouched so the first live run sees the same tasks
  if (!input.dry_run) {
    verdicts.last_scan_at = runId;
    atomicWrite("verdicts.json", verdicts);
  }
  console.log(
    `truth-scan post: ${posted} posted · ${toPost.length} roadmap comments, ` +
      `${input.delay_candidates.length} delay candidates, ${input.escalate.length} escalations ` +
      `(roadmap ${input.dry_run ? "dry run" : "live"}, delay ${input.delay_dry_run ? "dry run" : "live"})`
  );
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "post") await post();
else {
  console.error("usage: truth-scan.ts <prepare|post>");
  process.exit(2);
}
