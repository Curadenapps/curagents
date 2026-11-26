# BRISTLE handoff (2026-11-26)

Read this first when you pick BRISTLE up in a new session. The game is in a **good, agreed state** at the
commit that added this file. Sean asked: do not build anything beyond what he asks for next.

## Rules for the next session

- **Do not start new features, agents or refactors on your own.** Wait for Sean's next ask, then do exactly that.
- Do not resume or merge the three stopped agents (see below). Their half-finished work was local only and is gone.
- Branch: `claude/dazzling-meitner-9fo696`. Claude app (artifact, private): https://claude.ai/artifact/7RrzdiT1yUeCX34PiECaJD
  (publish `dist/fragment.html` to that URL; it keeps the `sample` capability for Claude-voiced NPCs).
- Brand guardrails: CURAPROX palette and type; no violence (plaque is loosened and rinsed away, never hurt);
  no clinical or efficacy claims; real product names and IDB sizes/colours are placeholders until the brand team verifies them.

## Run and check

```
npm install
npm run dev                      # http://localhost:5460  (dev params: ?room=<id>&door=<n>&all&god&play)
node build.mjs --fragment        # dist/index.html + dist/fragment.html (artifact)
npx tsc --noEmit && node tests/smoke.cjs && node tests/reach.mjs   # all three must pass before a push
```

## What works now

- 19 rooms: Crown Gate, Gumline, Narrows, Sugar Wastes (rest fountain + Pip merchant, then the Glutton boss), Calculus Deep.
- Difficulty (Gentle / Knight / Veteran) and Brightness in Settings; darker grade.
- Player: run, jump, wall jump (once per jump, refreshed on the opposite wall), dash, crawl under low gaps (hold Down),
  slash with pogo, Deep Clean (hold slash), toothpaste throw, focus heal, Floss Grip.
- **IDB gaps** (`src/game/gaps.ts`): clogged gaps between teeth, size S `|` / M `I` / L `H` with a colour badge.
  Walk up, press Up/E; the right brush cleans it for good (+8 XP, saved as `gap:<room>:x,y`). Wrong size says which one it needs.
  S from the start, M from the Prime Dash relic. Dash no longer passes through walls.
- **Levelling**: XP only from kills and cleaning gaps (room-entry XP removed). The skill picker opens about half a second
  after the XP that levels you up.
- Contextual one-time tips (`src/game/tips.ts`), exits with light bands and next-area labels, enemy health bars, XP floaters.

## Known gaps (not started; only when Sean asks)

- No `H` (large) gaps placed yet, and Pip doesn't sell the L brush yet.
- Oath perks feel too small (Sean: "not worth picking"). The fix is the Crown board redesign in `design/PLAN-v2.md`.
- Planned in PLAN-v2 and the reviews in `design/reviews/`: Combat 2.0, Crown board, Pip catalogue with real names,
  companions (Pip fights alongside, Cusp the living crown), clean-don't-harm wording pass, dark-to-bright restoration,
  BRISTLE Design System artifact, Tide Ritual mini-game (parked).

## Stopped agents (not merged, do not resume)

1. Companions: Pip and Cusp
2. Clean-don't-harm and dark-to-bright pass
3. BRISTLE Design System (+ `src/design/tokens.ts`)

Redo any of these from `design/PLAN-v2.md` only when Sean asks.
