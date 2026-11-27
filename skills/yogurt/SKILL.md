---
name: yogurt
description: >
  Local recordings of any Webex call through Yogurt (github.com/FrigadeHQ/yogurt), the
  open-source notetaker that records the mic and the call audio on the PC, with no bot
  in the call, and transcribes and summarizes on the PC. Covers the calls Webex itself
  doesn't record or summarize: 1:1 and space calls, video chats started from a space,
  meetings hosted by other companies, meetings where the host didn't turn on the AI
  assistant. Agents read them through Yogurt's local MCP server. Load it for "yogurt",
  "local recording", "record the Webex call", "the call wasn't recorded", "call with
  X" with no Webex recap, or whenever meeting-notes or webex-sweep reaches Yogurt mode.
---

# Yogurt: any Webex call, recorded on the PC

Webex only gives us an AI summary and transcript (`skills/webex-web` Recipe 4) for
**meetings that were recorded with the AI assistant on**. Most calls aren't: a call
from a space, a 1:1 video chat, a partner's meeting, a meeting someone forgot to
record. **Yogurt** fills that gap. It runs on the PC, records the microphone and
the sound of the call (any app: the Webex desktop app, Webex in the browser), and
writes a transcript with timestamps and a summary, all on the PC. Nothing is uploaded.

Agents never record. A person records in Yogurt; agents only **read** what Yogurt
has, through its local MCP server.

## Where it works

| | |
|---|---|
| Runs on | The PC with Yogurt installed (Sean's, Fabian's). **Never in the cloud**: cloud Routines can't reach it |
| Account | Any Claude desktop app or Claude Code on that PC. It isn't browser automation, so the Curaden account can use it too (RUNTIME.md) |
| Data | `%APPDATA%\Yogurt` on that PC. Each person's Yogurt only has the calls they recorded |

## Setup (once per PC)

1. **Ask IT first** on a Curaden PC: Yogurt is an unsigned-by-Curaden open-source
   app that records audio. Install from the official release only:
   `https://github.com/FrigadeHQ/yogurt/releases/latest/download/Yogurt-windows-x64.exe`.
2. Open Yogurt, finish setup (it downloads its models once), and set:
   - **Settings › Language**: spoken language "Multi-language" (Swiss German,
     German and English calls); summary language as you like.
   - **Settings › Custom words**: `BOB, Curaprox, Curaden, Phinamic, RevolveNote,
     Yotpo, bobscore` (so the transcript spells them right).
   - **Settings › Recording reminders** on, **Automatic stop** on.
   - **Settings › AI apps**: turn on "Let AI apps read your meetings". Leave
     "Let AI apps make changes" **off**.
3. Register the MCP server for Claude:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/setup-yogurt.ps1
   ```

   It finds `yogurt-mcp.exe` and runs `claude mcp add yogurt --scope user`. In the
   Claude desktop app, add the same command as a local MCP server named `yogurt`
   (the script prints it). Restart Claude; tools then show as `mcp__yogurt__*`.
4. Test: ask "list my yogurt meetings". You should get `list_meetings` back.

## Recording a Webex call

- **Webex desktop app:** Yogurt sees Webex take the mic and offers to record. Click
  Record. It stops by itself when the call ends.
- **Webex in the browser (web.webex.com) or a space call with no calendar link:**
  Yogurt may not offer on its own. Click **New note** in Yogurt when the call starts.
- **Tell the others you're recording.** No bot joins, so nobody sees it. Say it at
  the start ("I'm taking notes with a local recorder, OK?"). If anyone objects, stop.
  Partner calls (Phinamic, markets) included.
- **Name the note** after the meeting ("BOB Weekly", "Call with Derek") or link it
  to the calendar event, so the agents can match it.
- Webex speaker names: on Windows Yogurt can't read the Webex participant list yet,
  so the other side is "Them". Agents work out who spoke from context and the
  calendar attendees, and say when they're unsure.

## Reading: the MCP tools

All read-only. Use only these:

| Tool | Use |
|------|-----|
| `list_meetings` `{ query?, person?, folder? }` | Newest first: `id`, `title`, `start`, `end`, `attendees`, `app` (the call app: `Webex` for Webex calls), folders |
| `get_meeting` `{ id }` | Details, attendees with emails, linked calendar event, the person's own notes (`myNotes`) and Yogurt's summary (Markdown) |
| `get_transcript` `{ id, format: "text" }` | `[mm:ss] Name: words` lines. `"lines"` gives JSON with `start_ms`, `speaker`, `is_me` |
| `search` `{ query, person? }` | Words across every meeting, with a snippet |
| `list_people`, `upcoming_meetings`, `calendar_day` | Who was in what; what's on today's calendar |
| `ask` | Yogurt answers a question from the meetings with sources. Slow: prefer `search` + `get_transcript` |
| `export_meeting` | One Markdown document (title, people, notes, transcript) |

**Never call** `get_audio`, `create_meeting`, `import_meetings`, or any other tool that
changes or deletes a meeting. Audio stays on the PC.

**Which meetings are Webex calls:** `app` is `Webex`, or the linked calendar
event has a `webex.com` link, or the title names a Webex space or meeting. A note
started with New note has no call app: match it on title, time and attendees.

**Identity of a Yogurt meeting:** `yogurt:{meeting id}`. Use it as the `Source` on
Notion pages and as the meeting part of a fingerprint, the same way the Webex
container id is used.

## Combining with Webex

When the same meeting exists in both (Webex recorded it with AI on **and** someone
recorded it in Yogurt):

- **Webex summary and action items stay the backbone** (Sean prefers them).
- Use Yogurt's transcript to fill gaps: parts Webex didn't capture, the speaker's own
  mic (clearer), and anything said before Webex's recording started.
- One recap page, one set of items: never two recaps for one meeting. Put both
  sources on the page (`Source: Webex — {id} · Yogurt — {id}`).

## Rules

- Read-only. No recording, no deleting, no changes in Yogurt, no audio leaves the PC.
- Speech-to-text gets names and products wrong ("Bob" = BOB, "Coura" = Curaprox).
  Fix them in your own words; keep quotes as said; never record a decision from the
  transcript alone when the speakers hadn't settled it.
- A 1:1 call is private: a recap or items from it only when the person who recorded
  it asks, or names it for the sweep (`agents/webex-sweep.md`).
- MCP not reachable (Yogurt closed or MCP off): the helper starts Yogurt hidden; if it
  still fails, say "Yogurt not reachable on this PC" and fall back to Webex or paste mode.
