# Meeting Notes — Reference

## 1. Webex → Fireflies Setup (one-time)

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

## 3. Field Mapping: Fireflies → Notion

| Fireflies field | Notion target | Notes |
|----------------|---------------|-------|
| `title` | Page `Name` property | Prefix with `📅` + date suffix |
| `date` | `Date` property | ISO 8601 string |
| `duration` | `Duration` property | Fireflies returns **seconds** — divide by 60 |
| `meeting_attendees[].displayName` | `Attendees` property | Comma-separated; fall back to `organizer_email` if list is empty |
| `id` | `Fireflies ID` property | Stored for idempotency — see §7 |
| `summary.overview` | **Summary** body section | Verbatim from Fireflies; 2–4 sentences |
| `summary.outline` | **Topics Covered** body section | Structured list of what was actually discussed |
| `summary.action_items` | **Next Steps** table | Owner assigned by Claude judgment — see §4 |
| `summary.keywords` | Footer `🏷` line | Comma-separated |

---

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
| `"I'll send the updated brief by Monday"` | Whoever said "I" — cross-reference sentence speaker | Use `sentences` field if needed for high-value items |

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
| `Source` | Select | `Fireflies` or `Manual` |
| `Fireflies ID` | Rich text | Transcript ID; used for duplicate prevention |

Copy the database ID from the Notion URL (32-character hex string after
`notion.so/`) and set it as `NOTION_MEETING_NOTES_DB_ID` in your `.env`.

---

## 6. Notion Page Body Template

```
## Summary
{summary.overview — verbatim from Fireflies, or 2–3 sentence condensation for paste mode}

---

## Topics Covered
{summary.outline — each topic on its own line as a bullet}

---

## Next Steps

| Action | Owner | Due |
|--------|-------|-----|
| {action item} | {owner from judgment or TBD} | {due date or —} |

---

**Attendees:** {displayName list, or "Not recorded"}
**Duration:** {N} min
**Date:** {YYYY-MM-DD}
**Source:** {Fireflies — {id} | Manual}
🏷 {keywords, comma-separated}
```

### Language rule

Output the Notion page **in the same language as the meeting** unless the user
explicitly asks for a translation. Do not silently translate a German meeting
into English — if the team speaks German, the notes should be in German.

---

## 7. Idempotency Check

Before creating a Notion page, query the Meeting Notes database for an existing
entry with a matching `Fireflies ID` property using an exact-match filter:

```
mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-query-database
database_id: {NOTION_MEETING_NOTES_DB_ID}
filter: {
  "property": "Fireflies ID",
  "rich_text": { "equals": "{fireflies_transcript_id}" }
}
```

If a result is returned → skip creation and return the existing page URL:
"Already logged: {URL}"

Do not use Notion search (`notion-search`) for this check — full-text search
is fuzzy and will produce false positives.
