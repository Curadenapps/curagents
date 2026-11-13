# App Support: quickstart for Fabian (and Sean)

App Support answers the people who send requests through the Asana form "App
Requests & Feedback". It runs on its own in the cloud every hour (07:20 to 19:20
Zurich), reads each new submission on **App Tasks, Requests & Feedback**, and
answers the submitter on the task, in the owner's own voice, with a short sign-off
saying it was sent by their support assistant (automated). Bugs and product gaps go
straight to Jira.

Requests are split by owner:

- **BOB** goes to **Sean**.
- **Everything else** goes to **Fabian**: Curaprox app, iTOP, Admin Panel, HubSpot,
  vouchers and general questions.

The owner doesn't write the replies, but they sound like the owner: Sean's are written
from [`docs/app-support-voice-sean.md`](app-support-voice-sean.md), Fabian's from
[`docs/app-support-voice-fabian.md`](app-support-voice-fabian.md). The owner does the
things only a person can do.
The full rules are in [`agents/app-support.md`](../agents/app-support.md).

## What you do (all in Asana, nothing to install)

1. **Make the changes.** When a submitter sends the details App Support asked for, you
   get a subtask on the form task, "Fabian: change in {system}", with the exact change.
   Make it, tick the subtask, and App Support tells the submitter and closes the task.
2. **Answer what it can't.** Your task **"App Support: needs you (Fabian)"** (in My
   Tasks, not on the board, so submitters never see it) gets one subtask per request
   it held back: no answer in the FAQs, patient data, spam, or something it wasn't
   sure about. The submitter has already been told the team will get back to them.
   For each one, either:
   - write or fix the reply above the `---` line in the subtask's notes and **tick
     it**: the next hourly run posts it; or
   - reply on the form task yourself; or
   - comment **"skip"**.
3. **Correct it when it's wrong.** Reply on the form task with the right answer. App
   Support learns from your correction, and from how you word it.

## Your voice

Your Routine writes every reply the way
[`docs/app-support-voice-fabian.md`](app-support-voice-fabian.md) says. It's a
starting point Sean wrote: open it, change anything that doesn't sound like you (or
tell Claude "my support voice: …"), and merge it. The weekday maintenance session also
adds what it notices in your own replies to its "Learned" section, by PR. When Sean's
Routine covers your requests on a Friday, it writes in Sean's voice.

Nothing is sent to you Friday to Sunday; held requests wait for Monday.

## How it gets smarter

App Support answers from the existing FAQs first (BOB — FAQ, Curaprox — FAQ and the
How-Tos in Notion, which the curaprox-apps.com FAQ is built from). When you or Sean
answer something those don't cover, or correct one of its replies, the answer is
saved without names or contact details in
[`docs/app-support-faq.md`](app-support-faq.md). The next person who asks the same
thing gets your answer on its own.

## Your Routine (set up once)

App Support runs as two Routines, one per owner. Yours answers your requests (everything
that isn't BOB) from your own Asana account, Monday to Thursday. On Fridays, and
whenever yours is off, Sean's Routine covers your requests, so nothing waits for you.

1. In Claude (signed in with your account), create a **Routine** (claude.ai → Code →
   Routines, or ask Claude Code "create a routine"):
   - **Name:** `App Support (Fabian)`
   - **Repository:** `Curadenapps/curagents`
   - **Connectors:** Asana and Notion only (both signed in as you)
   - **Model:** Claude Sonnet
   - **Schedule:** every hour, Monday to Thursday, 07:20 to 19:20 Zurich. Routines
     use UTC: `20 6-18 * * 1-4` in winter time (in summer time that runs an hour
     later; that's fine)
2. Paste this prompt as is:

> Account: Fabian. Fetch `Curadenapps/curagents` and read every file from
> `origin/main` (never merge or push). Check the switch as `RUNTIME.md` describes:
> find the Agent registry row whose Started by names "App Support (Fabian)"; if its
> Account isn't Fabian, log `no-op` and stop. If `agents/app-support.md` isn't on
> `origin/main`, log `no-op` ("spec not merged") and stop.
> This Routine handles Fabian's requests only (everything that isn't BOB); leave BOB
> requests alone. Write every reply in Fabian's voice exactly as
> `docs/app-support-voice-fabian.md` says, with its sign-off. Do the run exactly as
> `agents/app-support.md` "Scheduled run" describes: answer every request on its own
> from the FAQs;
> send Curaprox app bugs and product gaps to Jira by moving one ticket into In
> Development on BOB App; hold only what the spec says for Fabian's "App Support:
> needs you" task; post the held replies Fabian ticked; record anonymised FAQ
> candidates and voice notes. Nothing new since the last run: log `no-op` and stop. Never edit any
> app or admin system, handle passwords or write personal data outside Asana. Don't
> commit or push.
> Last step, always, also on failure: one row in the Agent run log as `RUNTIME.md`
> describes (Agent `app-support`, Where Cloud, Account Fabian), with the FAQ
> candidates, voice notes and dev tickets in its body. Use the Asana and Notion connectors; if
> either is missing, log `failed` with which one.

   Or, quicker: open the repo in Claude Code on your account and say "create my App
   Support routine from docs/app-support-quickstart.md". It reads this section and
   sets it up for you to confirm.
3. Tell Sean it's on. The Notion **Agent registry** row "App Support (Fabian)" is
   already there; its **Account** says `Fabian`. Set it to `Paused` any time to stop
   yours: Sean's Routine then covers your requests automatically.

## Running it yourself (optional)

You don't need this for the everyday work above. It's for asking it things directly.

1. **Claude** with Claude Code (the Claude desktop app's Code tab, or the `claude`
   CLI), signed in with your Curaden account, with the **Asana** and **Notion**
   connectors.
2. **Access to the GitHub repo** `Curadenapps/curagents` and a copy of it:

```bash
git clone https://github.com/Curadenapps/curagents.git
```

Open the `curagents` folder in Claude, pull before each session (`git -C curagents
pull`), and say:

| You say | What happens |
|---------|--------------|
| `my support requests` | Runs App Support now for your requests only |
| `app support` | Runs it now for every new request |
| `support faq <question>` | Answers from the BOB / Curaprox FAQs and what App Support has learned |
| `teach support: <question> → <answer>` | Adds your answer to the learned FAQ (a PR) |
| `done on <Asana task link>` | You've made the change: it tells the submitter and closes the task |

Don't set up a second Routine of your own: one per owner, or requests get answered
twice.

## Good to know

- **Never** ask a user for a password or post one. Point them to "Forgot password"
  in the app.
- **No patient data** in comments. If a user posts some, remove it in Asana.
- **Every comment on a form task emails the submitter** (they follow the task as a
  guest). Keep internal notes in subtasks, not in comments.
- **Bugs and product gaps** become one Jira-ready ticket in BOB App, moved to In
  Development so Phinamic gets it in Jira. Sean sees each one in the run log, and Truth
  Catcher flags any that aren't on the roadmap.
- **Mailboxes** info@bobscore.com and support@bobscore.com (BOB) and
  curaden.apps@curaden.ch (Curaprox app), agreed 12 Nov: App Support reads them
  through the Outlook MCP, makes a task on the App Tasks board for each thread and
  drafts the reply; Janine reviews and sends. Form requests stay with Sean (BOB) and
  you (the rest). Not active until the Outlook MCP is connected.
