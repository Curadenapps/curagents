# App Support: quickstart for Fabian (and Sean)

App Support answers the people who send requests through the Asana form "App
Requests & Feedback". It runs on its own in the cloud every hour on weekdays (07:20 to
19:20 Zurich), reads each new submission on **App Tasks, Requests & Feedback**, and
answers the submitter on the task. Every reply is signed "Curaden App Support
(automated reply)". Bugs and product gaps go straight to Jira.

Requests are split by owner:

- **BOB** goes to **Sean**.
- **Everything else** goes to **Fabian**: Curaprox app, iTOP, Admin Panel, HubSpot,
  vouchers and general questions.

The owner doesn't write the replies. The owner does the things only a person can do.
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
   Support learns from your correction.

Nothing is sent to you Friday to Sunday; held requests wait for Monday.

## How it gets smarter

App Support answers from the existing FAQs first (BOB — FAQ, Curaprox — FAQ and the
How-Tos in Notion, which the curaprox-apps.com FAQ is built from). When you or Sean
answer something those don't cover, or correct one of its replies, the answer is
saved without names or contact details in
[`docs/app-support-faq.md`](app-support-faq.md). The next person who asks the same
thing gets your answer on its own.

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

Only one account runs the hourly schedule (the Notion **Agent registry** row "App
Support" decides, today Curaden). Don't set up a second schedule, or every request
gets answered twice.

## Good to know

- **Never** ask a user for a password or post one. Point them to "Forgot password"
  in the app.
- **No patient data** in comments. If a user posts some, remove it in Asana.
- **Every comment on a form task emails the submitter** (they follow the task as a
  guest). Keep internal notes in subtasks, not in comments.
- **Bugs and product gaps** become one Jira-ready ticket in BOB App, moved to In
  Development so Phinamic gets it in Jira. Sean sees each one in the run log, and Truth
  Catcher flags any that aren't on the roadmap.
- **Mailboxes** support@bobscore.com and info@bobscore.com: planned. App Support will
  draft (and, on your "send", send) replies there once Curaden IT approves a mail
  connector. Until then it doesn't touch email.
