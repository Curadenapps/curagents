/**
 * Webex Transcript Fetcher
 * Fetches meeting transcripts from the Webex REST API and normalises them
 * into a plain-text format suitable for Claude to condense.
 *
 * Required env: WEBEX_ACCESS_TOKEN
 * Required Webex scope: meeting:transcripts_read  (or spark:all)
 */

const WEBEX_API_BASE = "https://webexapis.com/v1";

export interface TranscriptItem {
  id: string;
  meetingId: string;
  topic: string;
  hostEmail: string;
  scheduledStartTime: string;
  scheduledEndTime?: string;
}

export interface TranscriptSegment {
  speaker: string;
  startTime: string;
  text: string;
}

export interface MeetingTranscript {
  meetingId: string;
  transcriptId: string;
  topic: string;
  hostEmail: string;
  scheduledStartTime: string;
  durationMinutes: number | null;
  segments: TranscriptSegment[];
  rawText: string;
}

/** Lists available transcripts for a given Webex meeting ID. */
export async function listTranscripts(
  meetingId: string
): Promise<TranscriptItem[]> {
  const token = requireToken();
  const url = `${WEBEX_API_BASE}/meetings/transcripts?meetingId=${encodeURIComponent(meetingId)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    throw new WebexError(
      "NOT_FOUND",
      `Meeting not found: ${meetingId}. Verify the ID and token scopes.`
    );
  }
  if (!res.ok) {
    throw new WebexError("API_ERROR", `Webex API error ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as { items?: TranscriptItem[] };
  return body.items ?? [];
}

/** Downloads and parses a transcript by its Webex transcript ID. */
export async function fetchTranscript(
  transcriptId: string,
  meta: Pick<TranscriptItem, "meetingId" | "topic" | "hostEmail" | "scheduledStartTime"> & {
    scheduledEndTime?: string;
  }
): Promise<MeetingTranscript> {
  const token = requireToken();
  const url = `${WEBEX_API_BASE}/meetings/transcripts/${encodeURIComponent(transcriptId)}/download`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new WebexError("API_ERROR", `Failed to download transcript ${transcriptId}: ${res.status}`);
  }

  const raw = await res.text();
  const segments = parseVtt(raw);

  const durationMinutes = meta.scheduledEndTime
    ? Math.round(
        (new Date(meta.scheduledEndTime).getTime() -
          new Date(meta.scheduledStartTime).getTime()) /
          60_000
      )
    : null;

  // Flatten segments into readable plain text for Claude
  const rawText = segments
    .map((s) => (s.speaker ? `${s.speaker}: ${s.text}` : s.text))
    .join("\n");

  return {
    meetingId: meta.meetingId,
    transcriptId,
    topic: meta.topic,
    hostEmail: meta.hostEmail,
    scheduledStartTime: meta.scheduledStartTime,
    durationMinutes,
    segments,
    rawText,
  };
}

/**
 * High-level helper: given a meetingId, finds the first available transcript
 * and returns the full parsed MeetingTranscript object.
 *
 * Throws WebexError with code TRANSCRIPT_NOT_READY if no transcripts exist yet.
 */
export async function getMeetingTranscript(meetingId: string): Promise<MeetingTranscript> {
  const items = await listTranscripts(meetingId);

  if (items.length === 0) {
    throw new WebexError(
      "TRANSCRIPT_NOT_READY",
      "No transcripts available yet. Webex transcripts can take up to 15 minutes after a meeting ends."
    );
  }

  const first = items[0];
  return fetchTranscript(first.id, {
    meetingId: first.meetingId,
    topic: first.topic,
    hostEmail: first.hostEmail,
    scheduledStartTime: first.scheduledStartTime,
  });
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function requireToken(): string {
  const token = process.env.WEBEX_ACCESS_TOKEN;
  if (!token) {
    throw new WebexError(
      "NO_TOKEN",
      "WEBEX_ACCESS_TOKEN is not set. Add it to your .env file or set it as a GitHub secret."
    );
  }
  return token;
}

/**
 * Minimal VTT/SRT parser.
 * Handles Webex VTT format: optional speaker name before the text line.
 *
 * Example VTT block:
 *   00:01:23.000 --> 00:01:26.000
 *   Sean Dunne: Let's review the roadmap.
 */
function parseVtt(raw: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const blocks = raw.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;

    // Find the timestamp line
    const timestampIdx = lines.findIndex((l) => /-->/. test(l));
    if (timestampIdx === -1) continue;

    const startTime = lines[timestampIdx].split("-->")[0].trim();
    const textLines = lines.slice(timestampIdx + 1).join(" ").trim();
    if (!textLines) continue;

    // Try to extract "Speaker Name: text" pattern
    const speakerMatch = textLines.match(/^([^:]{2,40}):\s+(.+)$/);
    if (speakerMatch) {
      segments.push({
        speaker: speakerMatch[1].trim(),
        startTime,
        text: speakerMatch[2].trim(),
      });
    } else {
      segments.push({ speaker: "", startTime, text: textLines });
    }
  }

  return segments;
}

// ── Error type ────────────────────────────────────────────────────────────────

export class WebexError extends Error {
  constructor(
    public readonly code:
      | "NO_TOKEN"
      | "NOT_FOUND"
      | "TRANSCRIPT_NOT_READY"
      | "API_ERROR",
    message: string
  ) {
    super(message);
    this.name = "WebexError";
  }
}
