// POST /api/npc — NPC voices through the Claude Messages API (local play server only).
//   body: { npc: 'mira'|'pip'|'warden', history: [{role:'knight'|'npc', text}], state: {...}, mode?: 'ask'|'greet' }
//   200 { text }   the line to show (already cleaned)
//   501            no ANTHROPIC_API_KEY: the game falls back to written lines
//   400/403/405/413/429/502/504 on bad input, foreign origin, wrong method, size, rate limit, upstream trouble
// A probe ({ probe: true }) answers 200 { ready: true } without calling the API.
// Env: ANTHROPIC_API_KEY (required), ANTHROPIC_BASE_URL (default https://api.anthropic.com, point it at a stub
// to test), BRISTLE_NPC_MODEL (default claude-haiku-5-5, the fastest current model).
import { PERSONAS, buildSystemPrompt, cleanState, quoteKnight, sanitizeReply, GREET_PROMPT } from './personas.mjs';

const MODEL = process.env.BRISTLE_NPC_MODEL || 'claude-haiku-5-5';
const TIMEOUT_MS = 7000;            // the browser gives up at 8 s
const MAX_BODY = 8 * 1024;
const PER_IP_PER_MIN = 12, GLOBAL_PER_MIN = 40;

const hits = new Map();             // ip -> timestamps (ms) in the last minute
let globalHits = [];

function rateLimited(ip) {
  const now = Date.now(), cut = now - 60_000;
  globalHits = globalHits.filter((t) => t > cut);
  const mine = (hits.get(ip) ?? []).filter((t) => t > cut);
  if (mine.length >= PER_IP_PER_MIN || globalHits.length >= GLOBAL_PER_MIN) { hits.set(ip, mine); return true; }
  mine.push(now); globalHits.push(now); hits.set(ip, mine);
  if (hits.size > 500) for (const [k, v] of hits) if (!v.some((t) => t > cut)) hits.delete(k);
  return false;
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Only pages served by this local server may spend the key. */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || origin === 'null') return !origin; // file:// pages send "null": refuse; no Origin (curl, same-origin GET) is allowed
  try { const u = new URL(origin); return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.host === req.headers.host; } catch { return false; }
}

/** Turn the client's history into Messages API turns, ending on a user turn. */
function toMessages(history, mode) {
  const turns = [];
  const h = Array.isArray(history) ? history.slice(-8) : [];
  for (const m of h) {
    if (!m || typeof m.text !== 'string' || !m.text.trim()) continue;
    if (m.role === 'knight') turns.push({ role: 'user', content: quoteKnight(m.text) });
    else if (m.role === 'npc') turns.push({ role: 'assistant', content: String(m.text).slice(0, 400) });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (mode === 'greet' || !turns.length) turns.push({ role: 'user', content: GREET_PROMPT });
  if (turns[turns.length - 1].role !== 'user') return null;
  // merge consecutive same-role turns
  const out = [];
  for (const t of turns) { const last = out[out.length - 1]; if (last && last.role === t.role) last.content += '\n' + t.content; else out.push({ ...t }); }
  return out;
}

export async function handle(req, res) {
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return send(res, 405, { error: 'POST only' }); }
  if (!sameOrigin(req)) return send(res, 403, { error: 'origin' });
  let body;
  try { body = JSON.parse(await readBody(req) || '{}'); } catch (e) { return send(res, e.status || 400, { error: 'bad body' }); }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return send(res, 501, { error: 'no key' });
  if (body && body.probe) return send(res, 200, { ready: true });

  const npc = String(body?.npc ?? '');
  if (!PERSONAS[npc]) return send(res, 400, { error: 'unknown npc' });
  const mode = body.mode === 'greet' ? 'greet' : 'ask';
  const messages = toMessages(mode === 'greet' ? [] : body.history, mode);
  if (!messages) return send(res, 400, { error: 'bad history' });
  const ip = req.socket?.remoteAddress || 'local';
  if (rateLimited(ip)) return send(res, 429, { error: 'slow down' });

  const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');
  try {
    const r = await fetch(base + '/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2026-10-21' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,                   // room for a little thinking plus three short sentences
        output_config: { effort: 'low' },  // fastest answers; effort is the lever on this model, not disabling thinking
        system: buildSystemPrompt(npc, cleanState(body.state)),
        messages,
      }),
    });
    if (!r.ok) { const detail = await r.text().catch(() => ''); console.warn(`[npc] upstream ${r.status} ${detail.slice(0, 200)}`); return send(res, r.status === 429 ? 429 : 502, { error: 'upstream ' + r.status }); }
    const msg = await r.json();
    if (msg.stop_reason === 'refusal') return send(res, 502, { error: 'refusal' });
    const raw = (msg.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join(' ');
    const text = sanitizeReply(raw, npc);
    if (!text) return send(res, 502, { error: 'unusable reply' });
    return send(res, 200, { text });
  } catch (e) {
    const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    console.warn('[npc] ' + (timeout ? 'timeout' : e?.message));
    return send(res, timeout ? 504 : 502, { error: timeout ? 'timeout' : 'upstream' });
  }
}
