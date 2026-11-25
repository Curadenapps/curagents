# App Support: quickstart for Fabian

App Support answers the people who send requests through the Asana form "App
Requests & Feedback". Since 18 Nov 2026 **you own every request, BOB included**, and
it runs on your Claude account. Sean's Routine only covers on Fridays and when yours
is off.

What it does for you:

- **Every hour** (07:20 to 19:20, Monday to Thursday, in the cloud) it reads new
  submissions on **App Tasks, Requests & Feedback**, researches the answer and writes
  the reply in your voice, signed as your support assistant (automated). Nobody sees a
  reply until you've checked it.
- **Three times a day** (09:10, 13:10, 16:10, on your PC) it adds the people whose
  reply you approved to their task, so Asana emails them the answer.
- Bugs and product gaps go straight to Jira for Phinamic.

The full rules are in [`agents/app-support.md`](../agents/app-support.md).

## Set it up (about 10 minutes, once)

**Before you start:** have the Notion key Sean sent you privately at hand. Don't
paste it into the chat; step 5 opens a secure form for it.

1. **Claude desktop app.** Open it, signed in with your Curaden account, and go to the
   **Code** tab.
2. **Connectors.** In Settings → Connectors, check that **Asana** is connected
   (signed in as you). Notion doesn't go through the connector for you: your Notion
   login is a guest in Sean's workspace, so the connector can't reach it. Your runs
   use a Notion key Sean sends you privately instead ("Notion through the API" below).
3. **Chrome.** Install the **Claude in Chrome** extension, and in Chrome sign in to
   Asana (app.asana.com). Leave Chrome open during work hours: the invite run uses it.
4. **The repo.** In the Code tab, open a new session in any folder and paste:

   > Clone https://github.com/Curadenapps/curagents.git into my home folder and
   > open the curagents folder.

5. **Paste this one prompt** in a session on the `curagents` folder. It sets
   everything up and asks you before anything goes out:

   > Set up App Support for me from `docs/app-support-quickstart.md`, section
   > "Setup details". Create the cloud Routine "App Support (Fabian)" and the desktop
   > scheduled task "App Support invites (Fabian)" with exactly the names, schedules
   > and prompts given there. Set up Notion as "Notion through the API" says: open
   > the secure credential form so I can paste the Notion key myself, and never show,
   > echo or save it anywhere. Then check that Asana is connected, that the Notion
   > key can read the Agent registry, and that Chrome is signed in to Asana, and run
   > the invite task once as a test. Ask me
   > before you invite anyone in that test. Finish with a short list of what's set up
   > and anything I still need to do.

6. **Tell Sean it's on.** The Notion **Agent registry** row "App Support (Fabian)"
   is already there with Account `Fabian`. Set it to `Paused` any time to stop yours:
   Sean's Routine then covers.

## What you do every day (all in Asana)

Your task **"App Support: needs you (Fabian)"** (in My Tasks, not on the board, so
requesters never see it) gets a **"Review: {title}"** subtask for every reply. Its
first line says the route:

- **Route: Asana** (they need to answer back, or it's a change or a bug): open the
  form task and read the reply. Wrong? Edit or delete the comment. Right? **Tick the
  subtask.** The next invite run adds them and they get the answer by email. Not
  sending: comment **"skip"**.
- **Route: email** (a one-off answer): copy the email in the subtask into a new mail
  from the support mailbox in Outlook, send it, and tick the subtask. App Support notes
  it on the task and closes it.
- **They already follow the task** (a follow-up): the reply is in the subtask above a
  `---` line. Fix it if needed and tick it; the next hourly run posts it.

Then:

1. **Make the changes.** When a requester sends the details App Support asked for, you
   get a subtask on the form task, "Fabian: change in {system}", with the exact change
   (BOB Admin included; if you can't open BOB Admin yet, reassign it to Sean). Make it,
   tick it, and App Support tells them and closes the task.
2. **Answer what it can't.** The same "needs you" task gets a subtask for anything it
   couldn't answer alone. Write the reply above `---` and tick it, reply on the form
   task yourself, or comment "skip".
3. **Correct it when it's wrong.** Reply on the form task with the right answer. App
   Support learns from your correction and from how you word it.

Nothing new is assigned to you Friday to Sunday. On Fridays Sean's Routine writes the
replies and Sean checks them.

## Your voice

Your runs write every reply the way
[`docs/app-support-voice-fabian.md`](app-support-voice-fabian.md) says. Sean wrote a
starting point: change anything that doesn't sound like you (or tell Claude "my
support voice: …"), and merge it.

## How it gets smarter

It answers from the product FAQs (BOB — FAQ, Curaprox — FAQ and the How-Tos in
Notion), the board's history, Jira and Notion. When you answer something those don't
cover, or correct a reply, the answer is saved without names or contact details in
[`docs/app-support-faq.md`](app-support-faq.md), and the next person who asks gets it.

## Setup details

Claude reads this section when you paste the setup prompt in step 5. You don't need
to do any of it by hand.

### 1. Cloud Routine "App Support (Fabian)"

- **Name:** `App Support (Fabian)`
- **Repository:** `Curadenapps/curagents`
- **Connectors:** Asana only (signed in as Fabian). No Notion connector: Notion goes
  through the API ("Notion through the API" below)
- **Environment:** the Routine's cloud environment has the variable `NOTION_API_KEY`
  (the key Sean sent you) and its network access allows `api.notion.com`
- **Model:** Claude Sonnet
- **Schedule:** every hour, Monday to Thursday, 07:20 to 19:20 Zurich. Routines use
  UTC: `20 6-18 * * 1-4` (in summer time that runs an hour later; that's fine)
- **Prompt:**

> Account: Fabian. Fetch `Curadenapps/curagents` and read every file from
> `origin/main` (never merge or push). Check the switch as `RUNTIME.md` describes:
> find the Agent registry row whose Started by names "App Support (Fabian)"; if its
> Account isn't Fabian, log `no-op` and stop. If `agents/app-support.md` isn't on
> `origin/main`, log `no-op` ("spec not merged") and stop.
> This Routine handles every request (BOB included). Write every reply in Fabian's
> voice exactly as `docs/app-support-voice-fabian.md` says, with its sign-off. Do the
> run exactly as `agents/app-support.md` "Scheduled run" describes: write the answer
> to every request after researching it and hold it on a Review subtask for Fabian;
> send bugs and product gaps to Jira by moving one ticket into In Development on BOB
> App; post the held replies Fabian ticked; record anonymised FAQ candidates and
> voice notes. Nothing new since the last run: log `no-op` and stop. Never edit any
> app or admin system, invite anyone, handle passwords or write personal data
> outside Asana. Don't commit or push.
> Last step, always, also on failure: one row in the Agent run log as `RUNTIME.md`
> describes (Agent `app-support`, Where Cloud, Account Fabian). Use the Asana
> connector for Asana. For Notion use the REST API with `NOTION_API_KEY` exactly as
> `docs/app-support-quickstart.md` "Notion through the API" says, never the Notion
> connector, and never print the key. If the Asana connector or the key is missing,
> log `failed` with which one (no key: say so in your final message, since the run
> log can't be written).

### 2. Desktop scheduled task "App Support invites (Fabian)"

- **Name:** `App Support invites (Fabian)`
- **Folder:** the `curagents` folder
- **Schedule:** Monday to Thursday at 09:10, 13:10 and 16:10 (cron
  `10 9,13,16 * * 1-4`, local time)
- **Prompt:**

> Account: Fabian. In my curagents folder run `git fetch origin main`. If the
> checkout is on `main` and clean, `git pull --ff-only`; otherwise don't merge
> anything and read every file from `origin/main`. Do the "Invite run" exactly as
> `agents/app-support.md` describes, using Claude in Chrome (Chrome is signed in to
> Asana). Live: don't ask me first. Only invite people from a Review subtask I
> ticked, always untick "Also invite to App Tasks, Requests & Feedback project", and
> never type a password. For Notion use the REST API with `NOTION_API_KEY` as
> `docs/app-support-quickstart.md` "Notion through the API" says, and never print the
> key. End with one row in the Agent run log (Agent `app-support`, Where PC, Account
> Fabian).

The PC has to be on, with the Claude desktop app and Chrome open, for the invite run
to work. If it misses a run, the next one catches up.

### 3. Notion through the API

Fabian's Notion login is a guest in Sean's workspace (seandunne), so the Notion
connector on his account can only open the Curaden workspace. His runs use Sean's
internal integration **"App Support (Fabian)"** instead: read and insert only, shared
with the Agent control room (registry and run log), the product FAQs, the Support
replies page (📋 Support, `3287e8aabbb480b79f16f460a1c35a00`), BOB Kit and its
how-tos, the Product Roadmap, the Market Rollout Academy and the Education Hub
markets pages. Nothing else in the workspace is visible to it.

**The key.** Sean sends it to Fabian privately. It lives only in:
- the cloud environment of the Routine "App Support (Fabian)", as the environment
  variable `NOTION_API_KEY` (claude.ai → Code → the Routine's environment →
  environment variables); that environment's network access must allow
  `api.notion.com`;
- Fabian's PC, for the invite run, as a Windows user environment variable
  `NOTION_API_KEY` (Start → "Edit environment variables for your account" → New),
  then restart the Claude desktop app.

Never in a prompt, the repo, a file, chat, Notion, Asana or Webex. If it leaks, Sean
deletes the integration in Notion (Developer tools → Developer connections) and makes
a new one.

**How a run uses it.** Every call sends `Authorization: Bearer $NOTION_API_KEY` and
`Notion-Version: 2025-09-03`, with the key read from the environment, never typed
out. Never print it: no `echo`, `env`, `set -x` or verbose `curl`.

| Need | Call |
|------|------|
| Registry rows (the switch) | `POST https://api.notion.com/v1/data_sources/ca4bcf81-b541-49e6-9da5-1fc8bfd38418/query`, paging with `start_cursor` |
| Run-log columns | `GET https://api.notion.com/v1/data_sources/9b260587-5c0d-4d90-947e-b6e10ba159df` (property names and options) |
| Write the run-log row | `POST https://api.notion.com/v1/pages` with parent `{"type": "data_source_id", "data_source_id": "9b260587-5c0d-4d90-947e-b6e10ba159df"}`, the columns from `RUNTIME.md` "Agent run log", and the body (FAQ candidates, voice notes) as `children` |
| A page (FAQ, how-to, market) | `GET https://api.notion.com/v1/pages/{id}` and `GET https://api.notion.com/v1/blocks/{id}/children`, paging |
| Other databases (Roadmap, Markets) | `POST https://api.notion.com/v1/data_sources/{data source id}/query`; the data source ids are the `collection://` ids in the spec and `RUNTIME.md` |
| Search | `POST https://api.notion.com/v1/search` with a `query`; it only finds what's shared with the integration |

These API reads don't use the workspace's hourly query allowance ("Reading Notion" in
`RUNTIME.md` is about the connector). The key can't edit an existing page; a run
only ever creates its run-log row. A `401` means the key is wrong or missing; a `404`
on a page means it isn't shared with the integration: log `failed` with the page id
so Sean can share it.

## Running it yourself (optional)

In a session on the `curagents` folder (pull first: `git -C curagents pull`):

| You say | What happens |
|---------|--------------|
| `my support requests` | Runs App Support now |
| `invite <Asana task link>` | Adds that task's requester now (Chrome signed in to Asana) |
| `support faq <question>` | Answers from the FAQs and what App Support has learned |
| `teach support: <question> → <answer>` | Adds your answer to the learned FAQ (a PR) |
| `done on <Asana task link>` | You've made the change: it tells the requester and closes the task |

Don't set up a second Routine or invite task: one of each, or requests get answered
twice.

## Good to know

- **Never** ask a user for a password or post one. Point them to "Forgot password"
  in the app.
- **No patient data** in comments. If a user posts some, remove it in Asana.
- **Every comment on a form task emails everyone following it**, including the
  requester once they're added. Keep internal notes in subtasks.
- **Bugs and product gaps** become one Jira-ready ticket in BOB App, moved to In
  Development so Phinamic gets it in Jira.
- **Mailboxes** info@bobscore.com (support@bobscore.com is only the system sender) and
  curaden.apps@curaden.ch: App Support doesn't
  read or send email. IT decided against an Outlook connector for now (17 Nov).
