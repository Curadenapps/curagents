/**
 * asana/webhook-handler.ts
 * Verifies Asana webhook payloads via HMAC SHA256 and dispatches to agent.
 * Deploy this as a serverless function or Express endpoint.
 */

import { createHmac, timingSafeEqual } from "crypto";

const WEBHOOK_SECRET = process.env.ASANA_WEBHOOK_SECRET!;

export interface AsanaEvent {
  action: string;
  resource: { gid: string; resource_type: string };
  parent?: { gid: string; resource_type: string };
  user?: { gid: string };
  created_at: string;
}

export interface AsanaWebhookPayload {
  events: AsanaEvent[];
}

/** Verify X-Hook-Signature header — reject if invalid */
export function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) throw new Error("ASANA_WEBHOOK_SECRET not set");
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Parse and classify Asana events */
export function classifyEvents(events: AsanaEvent[]): {
  comments: AsanaEvent[];
  sectionChanges: AsanaEvent[];
  other: AsanaEvent[];
} {
  return {
    comments: events.filter(
      (e) => e.resource.resource_type === "story" && e.action === "added"
    ),
    sectionChanges: events.filter(
      (e) => e.resource.resource_type === "task" && e.action === "changed"
    ),
    other: events.filter(
      (e) =>
        !(e.resource.resource_type === "story" && e.action === "added") &&
        !(e.resource.resource_type === "task" && e.action === "changed")
    ),
  };
}

/**
 * Main handler — call from your HTTP server
 * Returns 401 on bad signature, 200 on success
 */
export async function handleWebhook(
  rawBody: string,
  signature: string,
  dispatchAgent: (eventType: string, events: AsanaEvent[]) => Promise<void>
): Promise<{ status: number; message: string }> {
  // Asana handshake — respond to X-Hook-Secret header
  if (!signature && rawBody === "") {
    return { status: 200, message: "handshake ok" };
  }

  if (!verifySignature(rawBody, signature)) {
    console.error("asana-webhook: invalid signature — rejected");
    return { status: 401, message: "invalid signature" };
  }

  const payload: AsanaWebhookPayload = JSON.parse(rawBody);
  const { comments, sectionChanges } = classifyEvents(payload.events);

  if (comments.length > 0) {
    await dispatchAgent("asana.task.commented", comments);
  }
  if (sectionChanges.length > 0) {
    await dispatchAgent("asana.task.section_changed", sectionChanges);
  }

  return { status: 200, message: "ok" };
}
