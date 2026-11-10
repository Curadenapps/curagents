# App Support: quickstart for Fabian (and Sean)

App Support answers the people who send requests through the Asana form "App
Requests & Feedback". It reads each new submission on **App Tasks, Requests &
Feedback**, drafts a reply to the submitter on the task, tells you exactly what to
change when they answer, and closes the task once you say it's done.

Requests are split by owner:

- **BOB** goes to **Sean**.
- **Everything else** goes to **Fabian**: Curaprox app, iTOP, Admin Panel, HubSpot,
  vouchers and general questions.

You only ever post replies for your own requests, from your own Asana account. The
full rules are in [`agents/app-support.md`](../agents/app-support.md).

## What you need (once)

1. **Claude** with Claude Code: the Claude desktop app (Code tab) or the `claude` CLI,
   signed in with your Curaden account.
2. **Read access to the GitHub repo** `Curadenapps/curagents`. Ask Sean if you can't
   open it.
3. **Connectors** in Claude, signed in as you:
   - **Asana** (posts replies and subtasks as you)
   - **Notion** (reads the Market Rollout Academy how-tos)
4. **A local copy of the repo.** In a terminal:

```bash
git clone https://github.com/Curadenapps/curagents.git
```

Then open the `curagents` folder in the Claude desktop app (Code tab → choose
folder), or run `claude` inside it.

## Using it on request (start here)

Say one of these in a session opened on the `curagents` folder:

| You say | What happens |
|---------|--------------|
| `my support requests` | Checks the board for your requests only and shows each draft reply |
| `app support` | Checks every new request; drafts for both Sean and you |
| `reply to <Asana task link>` | Drafts the reply for one task |
| `post the support replies` | Posts the drafts you approved (all, or name the tasks), from your account |
| `done on <Asana task link>` | You've made the change: it posts "All done" to the submitter and closes the task |

Nothing is posted until you say "post". When a submitter answers, you get a subtask
"Fabian: change in {system}" with the exact change. Make the change, tick the subtask,
and App Support closes the loop.

Before each session, pull the latest version so you run the current rules:

```bash
git -C curagents pull
```

## Running it on a schedule (optional)

Only one account should run the schedule, otherwise every request is handled twice.
The Notion **Agent registry** decides which account: ask Sean to set the App Support
row's **Started by** to your Routine's name before you turn it on.

Create a Claude Routine on your account:

- **Repository:** `Curadenapps/curagents`
- **Connectors:** Asana, Notion
- **Schedule:** weekdays 08:20 and 14:20, Europe/Zurich
- **Name:** `App Support (Fabian)`

Prompt (paste as is):

> Fetch `Curadenapps/curagents` and read every file from `origin/main` (never merge or
> push). Find the Agent registry row whose Started by names "App Support (Fabian)"
> (`RUNTIME.md`, "The switch"). If there is none, or its Account is `Paused`, log
> `no-op` in the Agent run log and stop.
> Then run App Support as `agents/app-support.md` describes, as operator Fabian
> (`1196321462158324`). Post only replies Fabian owns whose type is `auto` in
> "Auto-post approvals". Everything else stays a draft in the summary, including all
> BOB requests (they're Sean's). Don't commit or push.
> Finish with a short summary: new requests (task links only), drafts waiting for
> Fabian, drafts waiting for Sean, changes to make, tasks closed. Last step, always,
> also on failure: one row in the Agent run log as `RUNTIME.md` describes
> (Agent `app-support`, Where Cloud).

While every type is still `draft`, the scheduled run only prepares drafts. You post
them with "post the support replies" in a normal session.

## Good to know

- **Never** ask a user for a password or post one. Point them to "Forgot password"
  in the app.
- **No patient data** in comments. If a user posts some, remove it in Asana.
- **Every comment on a form task emails the submitter** (they follow the task as a
  guest). Keep internal notes in the subtask, not in comments.
- **Product gaps and bugs** become one Jira-ready ticket that Sean approves. You don't
  need to write one yourself.
- **Mailboxes** support@bobscore.com and info@bobscore.com: planned. App Support will
  draft (and, on your "send", send) replies there once Curaden IT approves a mail
  connector. Until then it doesn't touch email.
