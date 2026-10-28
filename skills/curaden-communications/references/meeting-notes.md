# Meeting Notes — Reference

## 0. Webex web (default source)

Webex's AI Assistant writes a summary and action items for every recorded
meeting, plus a transcript with speakers and timestamps. Read them in Webex web
in the desktop app's built-in browser (Claude in Chrome as fallback) on Sean's sign-in with `scripts/webex-meetings.js`; the
steps are in `skills/webex-web/SKILL.md` Recipe 4. Nothing to set up, no API key.

## 3a. Field Mapping: Webex → Notion

| Webex | Notion target | Notes |
|-------|---------------|-------|
| Meeting title + date (list / page header) | Page `Name` | `📅 {title} — {YYYY-MM-DD}` |
| Date | `Date` property | |
| Start–end time | `Duration` property | Minutes between the two times |
| Transcript `speakers` | `Attendees` property | Only people who spoke; add silent attendees if the summary names them |
| Meeting container id (end of the decoded url) | `Fireflies ID` property | Idempotency key; `Source = Webex` |
| Summary "Overview" | **Summary** section | Condense to 2–4 sentences, keep the decisions |
| Summary "Detailed Summary" headings | **Topics Covered** | One bullet per heading, one line each |
| "Action items" | **Next Steps** table | Owner and due from the item; transcript confirms (§4) |
| Transcript | Checks only | Owners, dates, decisions the summary missed; never pasted whole |

## 1. Fireflies fallback: Webex → Fireflies Setup (one-time)

Fireflies joins your Webex meetings as a bot and transcribes them automatically.
Supports German and other languages — Webex's own transcription does not.

### Recommended: Fireflies ↔ Webex Calendar Integration

1. Go to **app.fireflies.ai → Integrations → Video Conferencing → Webex**
2. Click **Connect** and authorise via OAuth (your Webex account)
3. Fireflies reads your calendar and auto-sends the AirNote bot to every scheduled Webex meeting
4. After each meeting ends, the transcript and AI summary are ready within ~15 minutes

### Alternative: Add the Bot Manually

Invite `notetaker@fireflies.ai` to any Webex meeting. The bot joins, records,
and uploads automatically — no calendar access required.

### Alternative: Upload a Recording

Download the Webex recording (`.mp4`) and upload at **app.fireflies.ai → Upload**.
Useful for past meetings or meetings the bot couldn't join.

---

## 2. Fireflies GraphQL API

**Endpoint:** `https://api.fireflies.ai/graphql`
**Auth header:** `Authorization: Bearer {FIREFLIES_API_KEY}`
**Get your key:** app.fireflies.ai → Settings → API

### Fetch the most recent transcript

```graphql
query {
  transcripts(limit: 1) {
    id
    title
    date
    duration
    organizer_email
    meeting_attendees {
      displayName
      email
    }
    summary {
      overview
      outline
      action_items
      keywords
    }
  }
}
```

### Fetch a specific transcript by ID

```graphql
query Transcript($id: String!) {
  transcript(id: $id) {
    id
    title
    date
    duration
    organizer_email
    meeting_attendees {
      displayName
      email
    }
    summary {
      overview
      outline
      action_items
      keywords
    }
  }
}
```

**Note:** `bullet_gist` is intentionally excluded — it duplicates information
already in `overview`. Using both creates redundancy in the Notion page.

### Check if summary is ready

If `summary` is `null` or `summary.overview` is empty, Fireflies is still
processing. Tell the user to try again in a few minutes.

---

## 3. Field Mapping: Fireflies → recap page

| Fireflies field | Recap page | Notes |
|----------------|-----------|-------|
| `title`, `date`, `duration` | Page title + **Date / Who / Source** line | Same title format as §0; duration is in **seconds** |
| `meeting_attendees[].displayName` | **Who** | Fall back to `organizer_email` if empty |
| `summary.overview` | **Decided** / **Still open** | Split decisions from open questions |
| `summary.outline` | **Other notes** | Only what isn't already above |
| `summary.action_items` | **Actions** | Owner by judgment (§4) |
| `id` | **Source** line | `Fireflies {id}` |

## 4. Assigning Owners to Action Items

Do **not** use regex or pattern-matching rules to extract owners from action item
text. Fireflies produces too many formats (including multilingual passive
constructions) for fixed rules to be reliable.

Instead: read the full `summary.action_items` list alongside `meeting_attendees`
and use judgment to assign the most plausible owner for each item based on
context — who was speaking about it, whose name appears near it, or whose role
it matches. If it is genuinely ambiguous after reading the context, mark the
owner as `TBD`.

Examples of how to apply judgment:

| Action item text | Likely owner | Reasoning |
|-----------------|-------------|-----------|
| `"The design team needs to review the new components by Q2"` | Design Lead (from attendee list) or TBD | No individual named — assign team lead if present, otherwise TBD |
| `"Sean and Anna: coordinate on localization"` | Sean / Anna | Two owners — list both, separated by ` & ` |
| `"Follow up with the client about the proposal"` | Meeting organiser or TBD | Typically the organiser's responsibility if no one else named |
| `"Bis Freitag sollen die Tokens aktualisiert werden"` (German) | TBD | Passive voice, no owner stated — flag as TBD |

For **due dates**: extract temporal phrases naturally ("by Friday", "end of
month", "bis Freitag"). If none stated, leave `—`. Do not infer due dates.

---

## 5. Notion Database Schema

Create a database in Notion titled **"Meeting Notes"** with these properties:

| Property name | Notion type | Purpose |
|--------------|-------------|---------|
| `Name` | Title | Auto-set to `📅 {title} — {YYYY-MM-DD}` |
| `Date` | Date | Meeting date |
| `Attendees` | Rich text | Participant display names, comma-separated |
| `Duration` | Number (format: number) | Meeting length in minutes |
| `Source` | Select | `Webex`, `Fireflies` or `Manual` |
| `Fireflies ID` | Rich text | Webex meeting container id or Fireflies transcript id; used for duplicate prevention |

There is **no Meeting Notes database**. Every recap is a child page of
**Decision Log & Meeting Recaps** (`3f27e8aabbb481baa16ce7cb9e7514dd`, Curaden
App Hub → Goals & Objectives). That page is also what the announcements agent and
Boom Boom Derek read, so a recap filed here reaches them automatically.

1. Create the child page with `notion-create-pages`, parent = that page id, icon 🎙️.
2. Add one row to the index table at the top of the Decision Log
   (Date · Meeting · Key decision), newest first, with `notion-update-page`.
   Change nothing else on the page.

## 6. Recap page body

Follow **Template — Meeting recap** (`3f37e8aabbb481ca86edd64d1939c4e2`); the
7 Oct 2026 Curaden × Phinamic page is the reference for tone and length.

```
**Who:** {names by company}. Webex, {HH:MM}–{HH:MM}.
**Sources:** {Webex meeting summary | Fireflies {id} | pasted transcript}

## Decided
1. **{decision}.** {one line of why, if stated}

## Still open
- {open question}

## Other notes
- {note}

## Actions
**{Curaden person}:** {action} ({due}) · …
**Phinamic ({name}):** {action} ({due}) · …

| Action | Owner | Due |
|--------|-------|-----|
| {action item} | {owner from judgment or TBD} | {due date or —} |

---

**Attendees:** {displayName list, or "Not recorded"}
**Duration:** {N} min
**Date:** {YYYY-MM-DD}
**Source:** {Webex — {container id} | Fireflies — {id} | Manual}
🏷 {keywords, comma-separated}
```

If clinical or efficacy language comes up, add a `⚠️ Clinical language` callout
at the top.

### Language rule

Write the recap **in the same language as the meeting** unless the user
explicitly asks for a translation. Do not silently translate a German meeting
into English.

## 7. Idempotency Check

Before creating a page, fetch Decision Log & Meeting Recaps and look at its
child pages and index table. A page with the same date and meeting name (e.g.
"7 Oct 2026 — Curaden × Phinamic") means it is already logged: return that
page's URL ("Already logged: {URL}") and stop. Two meetings with the same name
on one day are told apart by the start time on the **Who** line.

Do not use `notion-search` for this check — full-text search is fuzzy and will
produce false positives.
