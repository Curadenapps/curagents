# Yogurt: notes from any Webex call, video chat or recording

[Yogurt](https://github.com/FrigadeHQ/yogurt) (MIT, free, no account) records the
microphone and the sound playing on the PC, then transcribes and summarises on the PC
(whisper.cpp + a local llama.cpp model). No bot joins the call. It has a local MCP
server, so Claude reads its meetings directly. Added 23 Nov 2026.

## Why we use it

Webex's AI Assistant only recaps **recorded meetings**. Yogurt fills the gaps:

| Webex situation | Webex recap? | Yogurt |
|-----------------|:-:|--------|
| Scheduled meeting, recorded with AI Assistant | yes | Not needed (meeting-notes uses Webex first); Sean's own typed notes in Yogurt are still used |
| Meeting nobody recorded | no | Records it |
| Call in a space, 1:1 call, video chat | no | Records it |
| Webex recording (MP4) with no transcript | no | Sean downloads it, `scripts/webex-recording-to-yogurt.ps1`, then **Upload a file** |

The meeting-notes agent picks the source on its own (`agents/meeting-notes.md` → Routing).

## Setup (once, on Sean's PC)

1. **Install** Yogurt for Windows x64 from the
   [latest release](https://github.com/FrigadeHQ/yogurt/releases/latest)
   (`Yogurt-windows-x64.exe`, per-user, no admin, signed by Frigade Inc.). Installed on
   Sean's PC 25 Nov (v0.3.76); it updates itself.
2. **Open it once**: it checks the PC (8 GB RAM minimum) and downloads its models.
   Set the spoken language to **multi** (German, English and more in one call).
   Add the Outlook calendar's private ICS link in Settings > Calendars if you want
   meeting titles and attendees filled in.
3. In Yogurt > Settings, **turn on the MCP server for AI apps**. Leave "AI apps can make
   changes" off.
4. Register it with Claude Code:

   ```powershell
   .\scripts\setup-yogurt.ps1
   ```

   It adds the `yogurt` MCP server at **user scope** (`%LOCALAPPDATA%\Programs\Yogurt\resources\bin\yogurt-mcp.exe`),
   so it exists on this PC only and the cloud Routines never try to reach it.
   `~/.claude.json` is shared by every Claude Code session on the PC, Curaden and
   Personal accounts alike, so one registration covers all of them (done 25 Nov).
   `-Check` reports without changing anything. Restart the Claude desktop app after.

## Using it

- **Webex desktop app**: Yogurt sees `webex.exe` / `CiscoCollabHost.exe` on the mic and
  offers to record when the call starts; it stops by itself when the call ends.
- **Webex in a browser**: no auto-prompt (Yogurt only spots Meet, Teams and Zoom
  tabs). Start it with **New note**, stop it by hand.
- **Recordings**: download in Webex, then

  ```powershell
  .\scripts\webex-recording-to-yogurt.ps1 "$env:USERPROFILE\Downloads\<recording>.mp4"
  ```

  and drag the `.m4a` from `Downloads\Yogurt uploads` into Yogurt's **Upload a file**.
- Then say **"meeting notes from Yogurt"** (or just "recap the call") and the
  meeting-notes agent writes the Notion recap.
- **One-tap send**: the agent also writes the Webex message as a **Held** row in the
  Webex outbox (App Team for Curaden-only calls, a partner-safe cut for the common
  chat when Phinamic was on). Tick **Approved** on the row (or say "post it") and the
  courier posts it. Nothing is sent without that tick; unapproved rows lapse after
  7 days. Rules in `agents/meeting-notes.md` "Share with the team".

## Limits and rules

- **Tell people you're recording.** No bot shows up, so nobody else can see it.
  Partner and external calls: say it at the start.
- **Speakers**: Yogurt names speakers only on Zoom, Teams and Meet. On Webex the
  transcript reads `You` and `Them`; the agent names people only when it's certain
  (`skills/curaden-communications/references/meeting-notes.md` §3b).
- **PC only.** Audio, transcripts and notes stay in `%APPDATA%\Yogurt`; only the recap
  the agent writes goes to Notion. Cloud sessions have no Yogurt: they fall back to paste mode.
- **Summary quality**: the local model is smaller than Webex AI, so Webex stays first
  whenever it has a recap.
- Agents only read Yogurt. Its change tools (rename, move, trash, import) stay off.
