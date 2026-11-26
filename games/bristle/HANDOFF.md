# BRISTLE handoff (2026-11-26, evening)

Read this first when you pick BRISTLE up in a new session. Sean asked: do not build anything beyond what he asks for next.

## Rules for the next session

- **Do not start new features, agents or refactors on your own.** Wait for Sean's next ask, then do exactly that.
- Branch: `claude/dazzling-meitner-9fo696` (pushed, so the PC and the laptop can both work on it).
  Claude app (artifact, private): https://claude.ai/artifact/GTBfaF4p87mhx4Dc3BNfz5, in the Claude account this PC
  session uses (published 26 Nov). Build with `node build.mjs --fragment` and publish `dist/fragment.html` to that URL;
  it declares the `sample` capability for Claude-voiced NPCs. The older artifact
  https://claude.ai/artifact/7RrzdiT1yUeCX34PiECaJD lives in Sean's other Claude account and is out of date.
- Brand guardrails: the brand pack's palette and type; no violence (plaque is loosened and rinsed away, never hurt;
  say "cleaning power", not "damage"); no clinical or efficacy claims; real product names and IDB sizes/colours are
  placeholders until the brand team verifies them.
- Ownership: Sean says BRISTLE is his own idea, built for himself and possibly Phinamic, not for Curaden. Keep it
  modular so it can be pitched to other oral-care brands.

## Run and check

```
npm install
npm run dev                      # http://localhost:5460  (dev params: ?room=<id>&door=<n>&all&god&play&order=<id>&brand=<id>)
node styleguide.mjs              # dist/styleguide.html, the living design system (also served by npm run dev)
node build.mjs --fragment        # dist/index.html + dist/fragment.html (artifact)
npx tsc --noEmit && node tests/smoke.cjs && node tests/reach.mjs   # all three must pass before a push
```

`tests/smoke.cjs` needs Playwright, which is not installed on Sean's PC; recent pushes ran tsc and reach only.

## What works now

- 19 rooms: Crown Gate, Gumline, Narrows, Sugar Wastes (rest fountain + Pip merchant, then the Glutton boss), Calculus Deep.
- **Brand packs** (`src/design/brands.ts`): CURAPROX by default and a made-up demo (`?brand=demo`). The game and the style
  guide read colours, fonts, product names and the Order's name from the pack; the mouth's own colours stay fixed.
- **The Orders** (`src/design/hero.ts` art, `src/game/orders.ts` rules): one knight rig, four sets. Initiate (start),
  Vanguard (first fountain rest), Ranger (Prime Dash relic), Bulwark (Glutton rinsed away). Rest again at a fountain to
  change sets. Each set changes health, speed, slash, Deep Clean charge, air dashes, refills carried and draw speed;
  the Bulwark's dash blocks shots.
- **Controls**: move A/D, jump Space/Z, slash J/X (hold for Deep Clean, up/down for up-slash and pogo), dash K/C/Shift,
  **interdental shot** L/V (hold to load and draw, release to fire), **Up + L = Rinse wave**, **size R/Tab** (S/M/L),
  focus heal F/Q, interact E/Up, pause Esc. The toothpaste throw is gone (the `PasteGlob` class is unused).
- **The shot** (`src/game/shot.ts`): refills per size, picked back up where they land, refilled at fountains; the right
  size unclogs a gap from range. Ammo shows under the health.
- **IDB gaps** (`src/game/gaps.ts`): cleaned like a key, the holder in, once, and out, then the walls crumble.
  `tests/reach.mjs` now treats gaps as solid until a standing spot can clean them (it found and fixed a stuck gap in
  narrows-slits).
- **XP** (`src/game/xp.ts`): every clear, plus first reads of oath stones, new rooms and areas, first talks, a fountain's
  first rest and relics. Level up deals **three Oath cards** (one from your Order's path), take one; the pause menu's
  Oath shows the cards you hold.
- Dental particles (bristle flicks, plaque crumbs, rinse bubbles, clean-tooth sparkles); slashes sweep a full arc with
  a lunge; the knight stays visible while talking.

## Known gaps (only when Sean asks)

- Sean wants more hero variants before the art is final; the slash still needs play-testing for feel.
- No `H` (large) gaps placed yet, and Pip doesn't sell the L brush yet.
- The Oath cards reuse the 12 old perks (wording updated); per-Order tracks with keystones (PLAN-v2 section 4.3) are not built.
- The Bulwark's slam that cracks tartar floors is not built (there are no tartar floor tiles).
- Story idea (parked, Sean thinking aloud): a different ending per Order, same lesson that brush, interdental and rinse need each other.
- Still planned in PLAN-v2: Combat 2.0, Pip catalogue with real names, companions (Pip, Cusp), dark-to-bright restoration.
