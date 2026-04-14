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

If you don't want calendar access, invite `notetaker@fireflies.ai` to any Webex
meeting. The bot joins, records, and uploads automatically.

### Alternative: Upload a Recording

Download the Webex recording (`.mp4`) and upload at **app.fireflies.ai → Upload**.
Fireflies transcribes and summarises it — useful for past meetings or meetings
the bot couldn't join.

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
      bullet_gist
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
      bullet_gist
      action_items
      keywords
    }
  }
}
```

### Check if summary is ready

If `summary` is `null` or `summary.overview` is empty, the transcript is still
being processed. Tell the user to try again in a few minutes.

---

## 3. Field Mapping: Fireflies → Notion

| Fireflies field | Notion target | Notes |
|----------------|---------------|-------|
| `title` | Page `Name` property | Prefix with `📅` + date suffix |
| `date` | `Date` property | ISO 8601 string |
| `duration` | `Duration` property | Fireflies returns **seconds** — divide by 60 |
| `meeting_attendees[].displayName` | `Attendees` property | Comma-separated; fall back to `organizer_email` if empty |
| `id` | `Fireflies ID` property | Store for idempotency — skip if this ID already exists in DB |
| `summary.overview` | **Summary** body section | Verbatim from Fireflies |
| `summary.bullet_gist` | **Key Takeaways** body section | Each bullet becomes a list item; keep all (typically 3–7) |
| `summary.action_items` | **Next Steps** table | Parse owner + action from each item (see §4) |
| `summary.keywords` | Footer tags line | Comma-separated, prefixed with `🏷` |

---

## 4. Parsing Action Items → Owner + Action + Due

Fireflies formats `action_items` in one of these patterns:

| Fireflies format | Owner | Action |
|-----------------|-------|--------|
| `"Sean: Update the Figma tokens"` | Sean | Update the Figma tokens |
| `"Update the Figma tokens (Sean)"` | Sean | Update the Figma tokens |
| `"Update the Figma tokens by Friday"` | TBD | Update the Figma tokens |
| `"Update the Figma tokens"` | TBD | Update the Figma tokens |

**Parsing rules:**
1. If the text starts with `Word Word?:` (1–3 words before a colon) → treat everything before `:` as the owner
2. If the text ends with `(Name)` → extract as owner
3. Otherwise → owner = `TBD`
4. Due date: extract temporal phrases like "by Friday", "end of week", "by {date}". If none → leave `—`

---

## 5. Notion Database Schema

Create a database in Notion titled **"Meeting Notes"** with these exact properties:

| Property name | Notion type | Required | Purpose |
|--------------|-------------|----------|---------|
| `Name` | Title | Yes | Auto-set to `📅 {title} — {YYYY-MM-DD}` |
| `Date` | Date | Yes | Meeting date |
| `Attendees` | Rich text | Yes | Participant display names, comma-separated |
| `Duration` | Number (format: minutes) | Yes | Meeting length in minutes |
| `Source` | Select | Yes | `Fireflies` or `Manual` |
| `Fireflies ID` | Rich text | Yes | Transcript ID from Fireflies API; used to prevent duplicates |

Copy the database ID from the Notion URL (the 32-character hex string) and set
it as `NOTION_MEETING_NOTES_DB_ID` in your `.env` file.

---

## 6. Notion Page Body Template

Every meeting notes page uses this exact structure:

```
## Summary
{summary.overview — verbatim from Fireflies, or 2–3 sentence condensation for paste mode}

---

## Key Takeaways
{Each bullet_gist item on its own line, prefixed with •}

---

## Next Steps

| Action | Owner | Due |
|--------|-------|-----|
| {parsed action} | {parsed owner or TBD} | {parsed due or —} |
| ... | ... | ... |

---

**Attendees:** {displayName list or "Not recorded"}
**Duration:** {N} min
**Date:** {YYYY-MM-DD}
**Source:** {Fireflies transcript {id} | Manual paste}
🏷 {keywords, comma-separated}
```

---

## 7. Idempotency Check

Before creating a Notion page, search for an existing entry with the same
Fireflies ID:

```
mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-search
query: "{fireflies_transcript_id}"
```

If a page is found → skip and return the existing URL with message
"Already logged: {URL}".
