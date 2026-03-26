# Webex Broadcast — Reference

Details for the Webex delivery step of Procedure 3 (`bob-weekly-broadcast`) in `curaden-communications`.

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `WEBEX_BOT_TOKEN` | Bearer token for the Webex bot (from developer.webex.com) |

If `WEBEX_BOT_TOKEN` is unset or empty, skip Webex delivery and log a warning to the user.

**No room ID needed** — add the bot to the target Webex space and the room is discovered automatically (see below).

## Room Discovery

Once the bot has been added to the target Webex space, list all rooms it has access to and pick the right one:

```bash
curl -s https://webexapis.com/v1/rooms \
  -H "Authorization: Bearer $WEBEX_BOT_TOKEN"
```

The response returns an array of rooms. Use the `id` of the space where the broadcast should be posted. If the bot is only in one space, use that. If in multiple, match by `title` (e.g. "BOB Weekly Update" or similar).

## API Endpoint

```
POST https://webexapis.com/v1/messages
Authorization: Bearer $WEBEX_BOT_TOKEN
Content-Type: application/json
```

## Message Format

Webex supports a subset of Markdown. Use this template — adapted from the Notion broadcast template but trimmed for chat delivery:

```markdown
## BOB Weekly Broadcast — {DATE}
**Sprint:** {sprint name, or omit line if unavailable}

---

**Done This Week**
{For each resolved issue: "- **{KEY}** — {Summary}"}
_(None this week.)_ if empty

**In Progress**
{For each active issue: "- **{KEY}** — {Summary} _(Assignee)_"}
_(None this week.)_ if empty

**Blockers / Watch**
{For each flagged issue: "- **{KEY}** — {Summary} ⚠️ {Blocked / High Priority}"}
_(None this week.)_ if empty

---
_BOB is part of the iTOP program by Curaden. Full report: {Notion page URL}_
```

Always append the Notion page URL at the bottom so readers can navigate to the full formatted page.

## Delivery Command

```bash
curl -s -X POST https://webexapis.com/v1/messages \
  -H "Authorization: Bearer $WEBEX_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roomId\":\"$DISCOVERED_ROOM_ID\",\"markdown\":\"$WEBEX_MESSAGE\"}"
```

Capture the response JSON. On success (HTTP 200), the response contains an `id` field and a `webLink` field — return the `webLink` to the user.

## Dry-Run Guard

If `DRY_RUN=true` (the default), do **not** call the API. Instead, print the full payload that would be sent:

```
[DRY RUN] Webex delivery skipped. Payload that would be sent:
  roomId: {discovered room ID}
  markdown: ...
```

Only send when `DRY_RUN=false` is explicitly set.

## Error Handling

- If the curl call fails or returns a non-200 status, log the error and status code.
- Do **not** fail the entire broadcast — the Notion page has already been created successfully.
- Report to the user: "Notion page created ✓. Webex delivery failed: {error}. Share the Notion URL directly."
