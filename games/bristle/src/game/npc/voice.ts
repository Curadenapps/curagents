// NPC voices through Claude. Two transports, picked at runtime:
//   artifact: window.claude.use('sample') when the game runs as a Claude artifact (viewer's own account)
//   local:    POST /api/npc on the local play server (server/npc.mjs, ANTHROPIC_API_KEY)
// Anything missing, slow, refused or off in settings falls back to written lines; callers get null.
import { buildSystemPrompt, quoteKnight, sanitizeReply, GREET_PROMPT, type VoiceState } from '../../../server/personas.mjs';

export interface Turn { role: 'knight' | 'npc'; text: string }
type SampleFn = (input: string | { role: 'user' | 'assistant'; content: string }[], opts?: Record<string, unknown>) => Promise<{ text: string }>;

const TIMEOUT_MS = 8000;
const FIRST_CALL_MS = 45000; // the first artifact call waits on the viewer's consent dialog

class Voice {
  transport: 'artifact' | 'local' | null = null;
  private sample: SampleFn | null = null;
  private artifactCalls = 0;
  /** Resolves once the transport is known. */
  ready: Promise<void>;
  constructor() { this.ready = this.detect().catch(() => { this.transport = null; }); }

  private async detect() {
    const w = window as any;
    if (w.claude && typeof w.claude.use === 'function') {
      try { const s = await w.claude.use('sample'); if (typeof s === 'function') { this.sample = s; this.transport = 'artifact'; return; } } catch { /* unavailable */ }
    }
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      try {
        const r = await fetch('/api/npc', { method: 'POST', body: JSON.stringify({ probe: true }), signal: AbortSignal.timeout(3000) });
        if (r.ok) this.transport = 'local';
      } catch { /* no server */ }
    }
  }

  /** Is an AI voice usable right now (transport found and the player has voices on)? */
  available(enabled: boolean) { return enabled && !!this.transport; }

  /** One in-character reply, or null to fall back to written lines. */
  async reply(npc: string, history: Turn[], state: VoiceState, mode: 'ask' | 'greet', timeoutMs = TIMEOUT_MS): Promise<string | null> {
    if (!this.transport) return null;
    const ctl = new AbortController();
    const first = this.transport === 'artifact' && this.artifactCalls === 0;
    const timer = setTimeout(() => ctl.abort(), first ? Math.max(timeoutMs, FIRST_CALL_MS) : timeoutMs);
    try {
      if (this.transport === 'artifact') return await this.viaArtifact(npc, history, state, mode, ctl.signal);
      return await this.viaLocal(npc, history, state, mode, ctl.signal);
    } catch { return null; } finally { clearTimeout(timer); }
  }

  private async viaArtifact(npc: string, history: Turn[], state: VoiceState, mode: 'ask' | 'greet', signal: AbortSignal) {
    this.artifactCalls++;
    // No system role on this transport: the standing instructions are a leading user turn we always keep.
    const turns: { role: 'user' | 'assistant'; content: string }[] = [{ role: 'user', content: buildSystemPrompt(npc, state) + '\n\nReply with only your next line of dialogue.' }];
    if (mode === 'greet') turns.push({ role: 'user', content: GREET_PROMPT });
    else for (const t of history.slice(-8)) turns.push(t.role === 'knight' ? { role: 'user', content: quoteKnight(t.text) } : { role: 'assistant', content: t.text });
    if (turns[turns.length - 1].role !== 'user') return null;
    try {
      const res = await this.sample!(turns, { modelTier: 'quick', signal, cache: mode === 'greet' ? true : false });
      return sanitizeReply(res?.text, npc);
    } catch (e: any) {
      const code = e?.code;
      // Permanent for this view: hide AI voices for the rest of the session.
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'session_expired'].includes(code)) this.transport = null;
      return null;
    }
  }

  private async viaLocal(npc: string, history: Turn[], state: VoiceState, mode: 'ask' | 'greet', signal: AbortSignal) {
    const r = await fetch('/api/npc', { method: 'POST', signal, body: JSON.stringify({ npc, history: history.slice(-8), state, mode }) });
    if (r.status === 501) { this.transport = null; return null; }
    if (!r.ok) return null;
    const j = await r.json();
    return sanitizeReply(j?.text, npc);
  }
}

export const voice = new Voice();
