#!/usr/bin/env node
// Boom Boom Derek Webex helper — no dependencies (Node 20+).
//
//   node scripts/derek-ping.mjs post    <message.md>
//   node scripts/derek-ping.mjs replies [since ISO date]
//
// post    posts the message to the Webex space "Curaden / Phinamic", with Derek La
//         @mentioned at the top. It is the only space this script will post to.
// replies lists messages in that space that @mention the bot since the given time
//         (a bot only sees group messages that mention it), so Derek's replies
//         ("@Boom Boom Derek done …") reach the next run.
//
// Needs WEBEX_BOT_TOKEN; the bot must be a member of the space. DRY_RUN=true
// prints instead of posting (the agent is live, so the default is to post).

import { existsSync, readFileSync } from "node:fs";

const SPACE_TITLE = "Curaden / Phinamic";
const DEREK_EMAIL = "derek.la@phinamic.com";
const API = "https://webexapis.com/v1";

const [, , command, ...args] = process.argv;

try {
  if (command === "post") await post(args[0]);
  else if (command === "replies") await replies(args[0]);
  else usage();
} catch (err) {
  console.error(`derek-ping: ${err.message}`);
  process.exit(1);
}

function usage() {
  console.error("Usage:\n  node scripts/derek-ping.mjs post <message.md>\n  node scripts/derek-ping.mjs replies [since ISO date]");
  process.exit(2);
}

async function webex(path, init = {}) {
  const token = process.env.WEBEX_BOT_TOKEN;
  if (!token) throw new Error("WEBEX_BOT_TOKEN is not set");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Webex ${res.status}: ${body.message || JSON.stringify(body)}`);
  return body;
}

async function findSpace() {
  const { items = [] } = await webex("/rooms?type=group&max=1000");
  const matches = items.filter((room) => room.title === SPACE_TITLE);
  if (matches.length !== 1) {
    throw new Error(`expected exactly one space titled "${SPACE_TITLE}" for the bot, found ${matches.length}; add the bot to the space`);
  }
  return matches[0];
}

async function post(messagePath) {
  if (!messagePath || !existsSync(messagePath)) throw new Error(`message not found: ${messagePath}`);
  const lines = readFileSync(messagePath, "utf8").trim().split("\n");
  // The mention goes on the first text line, after the title, so the heading still renders.
  const first = lines.findIndex((line) => line.trim() && !line.startsWith("#"));
  if (first === -1) throw new Error("message has no text line to put the @mention on");
  lines[first] = `<@personEmail:${DEREK_EMAIL}|Derek> ${lines[first]}`;
  const markdown = lines.join("\n");
  if (markdown.length > 7000) throw new Error(`${markdown.length} characters; keep it under 7000, the Notion page carries the detail`);

  if ((process.env.DRY_RUN ?? "false").toLowerCase() === "true") {
    console.log(`[DRY_RUN] would post to Webex "${SPACE_TITLE}":\n\n${markdown}`);
    return;
  }

  const space = await findSpace();
  const body = await webex("/messages", { method: "POST", body: JSON.stringify({ roomId: space.id, markdown }) });
  console.log(`Posted to Webex "${SPACE_TITLE}" — message ${body.id}`);
}

async function replies(since) {
  const space = await findSpace();
  const { items = [] } = await webex(`/messages?roomId=${encodeURIComponent(space.id)}&mentionedPeople=me&max=100`);
  const cutoff = since ? Date.parse(since) : 0;
  const recent = items
    .filter((m) => Date.parse(m.created) >= cutoff)
    .map((m) => ({ created: m.created, from: m.personEmail, text: m.text }));
  console.log(JSON.stringify(recent, null, 2));
}
