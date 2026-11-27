# BRISTLE handoff (2026-11-26, evening)

Read this first when you pick BRISTLE up in a new session. Sean asked: do not build anything beyond what he asks for next.

## Rules for the next session

- **Do not start new features, agents or refactors on your own.** Wait for Sean's next ask, then do exactly that.
- Branch: `claude/dazzling-meitner-9fo696` (pushed, so the PC and the laptop can both work on it).
  Claude app (artifact, private): https://claude.ai/artifact/GTBfaF4p87mhx4Dc3BNfz5, in the Claude account this PC
  session uses (published 26 Nov). Build with `node build.mjs --fragment` and publish `dist/fragment.html` to that URL;
  NPCs speak only written lines (the Claude-voiced replies were removed 27 Nov), so it needs no capabilities. The other
  account's artifact https://claude.ai/artifact/7RrzdiT1yUeCX34PiECaJD was kept current from the laptop on 27 Nov
  (same build as main after the combos and the Crust Captain); either link can be republished from `dist/fragment.html`.
  Design system (artifact, private): https://claude.ai/artifact/MXMb9wjtNjNVXW4P4H471E. Build with
  `node styleguide.mjs --fragment` and publish `dist/styleguide-fragment.html` to that URL. Its brand picker remembers
  the choice in the browser (`bristle-brand`), because artifact links cannot pass `?brand=`.
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

- 20 rooms: Crown Gate, Gumline, Narrows, **the Captain's Den** (mini-boss, `narrows-den`), Sugar Wastes (rest fountain +
  Pip merchant, then the Glutton boss), Calculus Deep.
- **The Crust Captain** (`src/game/enemies/captain.ts`, map char `K`, flag `captain-defeated`): the mini-boss between the
  Narrows and the Sugar Wastes, with a fountain before its gate. Plain front strokes clink off its shield; a finisher, a
  combo move or a Deep Clean cracks it (stagger, 1.5x cleaning power); hits from behind always land. Moves: Shield Rush
  (scrape tell, charge; bonks the wall), Crust Slam (rear-up tell, two floor ripples), tartar toss below half health.
  Beating it opens the gates and pays a level-up card. Sean wants more minor boss fights like this along the route.
- **Sugar imps** are gentler (longer glint, slower swoop, lower perch, 12 HP) and the widest Sugar Wastes spike pit has
  stepping slabs. **Gentle** gives two extra health.
- **Brand packs** (`src/design/brands.ts`): CURAPROX by default and a made-up demo (`?brand=demo`). The game and the style
  guide read colours, fonts, product names and the Order's name from the pack; the mouth's own colours stay fixed.
- **The Orders** (`src/design/hero.ts` art, `src/game/orders.ts` rules): one knight rig, the Initiate plus four Orders, one
  product each: Vanguard (CS 5460 as a two-handed greatsword), Duelist (two single tufts), Ranger (interdental bow), Lancer
  (Hydrosonic lance; it replaced the Bulwark, and old saves wearing the Bulwark move to it). You play the Initiate until
  the Glutton (first boss) is rinsed away; then all four unlock and a card pick chooses one. Rest again at a fountain to
  change. Each set changes health, speed, slash speed and power, Deep Clean charge, air dashes, refills carried and draw
  speed, and the weapon in hand; the Lancer's dash blocks shots. Slash hit boxes are the same for every set.
- **Controls: two keyboard layouts** (Settings > Layout, `src/engine/input.ts`; names in `keyName` / `KEY_NAMES`, `src/ui/kit.ts`).
  **ZXC** (default): arrows move, Z jump, X slash, C dash, V interdental shot, A focus, S interact, D size, ↑ + V Rinse.
  **QWER**: A/D move, W/S up/down, Space jump, Shift dash, Q slash, E shot, R Rinse, F focus, G interact, T size.
  Enter, Esc, Tab and the mouse (left slash, right shot, wheel size) work in both. Hold slash for Deep Clean; up/down
  + slash for up-slash and pogo; hold down to crawl. The Prime Dash relic only gives the size M brush.
- **Combos** (`src/game/player.ts`, cards in `src/game/progress/perks.ts`): slashes pressed within 0.62 s chain; the third
  is a finisher (wider, ~1.6x, counts as heavy). Level-up cards unlock: Circle Stroke (slash, then press and hold slash),
  Rising Sweep (two strokes, then up + slash), Air Flurry (chain in the air), Gumline Slam (hold down + slash in the air),
  Dash Strike (slash, then dash), Interdental Thrust (two strokes, then shot), Rinse Burst (focus right after a finisher);
  plus +1 health twice, Firm Filaments, Double Prime, Prime Glide, Calm Gums. The 12 old perks were retired; their points
  are refunded on load. Combo names pop big over the knight; kills mid-chain pay 25-50% more XP.
- **The shot** (`src/game/shot.ts`): refills per size, picked back up where they land, dropped by about a third of
  cleared creatures, refilled at fountains; the right
  size unclogs a gap from range. Ammo shows under the health.
- **IDB gaps** (`src/game/gaps.ts`): cleaned like a key, the holder in, once, and out, then the walls crumble.
  `tests/reach.mjs` now treats gaps as solid until a standing spot can clean them (it found and fixed a stuck gap in
  narrows-slits).
- **XP** (`src/game/xp.ts`): every clear, plus first reads of oath stones, new areas (not plain rooms: Sean found level-ups
  on entering a room felt rigged), first talks, a fountain's first rest and relics. Levels need 24 XP, then 20 + 22 per level.
  Unspent points open the card pick once per session. Level up deals **three Oath cards** (one from your Order's path) once you are calm (on the ground, no creature near),
  and ignores input for 0.7 s so a mashed button cannot take or close it; Enter / E / click take one; the pause menu's
  Oath shows the cards you hold.
- Dental particles (bristle flicks, plaque crumbs, rinse bubbles, clean-tooth sparkles); slashes sweep a full arc with
  a lunge; the knight stays visible while talking.

## Aiming the shot (built 27 Nov)

While drawing, the shot aims at the mouse (`g.mouseWorld()` in `src/game/game.ts`, `Player.aim()` in `src/game/player.ts`); the
knight turns to face the aim, the holder and front arm rotate with it, the brush is put away, and a dotted path plus a
ring at the cursor preview the shot. Without the mouse: Up / Down (Down only in the air) or the right stick. Right-click
always shoots; Up + L (keyboard) is still the Rinse wave. Shot power S 8 / M 11 / L 15, plus up to +6 at full draw.
Checked by stepping the game: up-forward, behind and down-forward shots fly along the aim. Not yet seen by eye in play.

## Known gaps (only when Sean asks)

- Hero lineup (style guide, Hero options; Sean, 26 Nov), one product per class: A Vanguard (CS 5460 as a two-handed
  greatsword), B Ranger (interdental holder as a bow), C Lancer = the Bulwark (Hydrosonic lance), D Sentinel (angled IDB
  handle as a scythe), E Duelist (two single-tuft brushes), F Crescent = the Kunoichi (teething rings as ring blades).
  Recommended game core: Vanguard, Duelist, Ranger, Lancer; Sentinel and Crescent as later unlocks or brand-pack sets.
  The in-game Orders use A, E (as the Duelist), B and C. Product shapes and names are placeholders
  until the brand team checks them. The slash still needs play-testing.
- No `H` (large) gaps placed yet, and Pip doesn't sell the L brush yet.
- The Oath cards reuse the 12 old perks (wording updated); per-Order tracks with keystones (PLAN-v2 section 4.3) are not built.
- The Bulwark's slam that cracks tartar floors is not built (there are no tartar floor tiles).
- Story idea (parked, Sean thinking aloud): a different ending per Order, same lesson that brush, interdental and rinse need each other.
- Still planned in PLAN-v2: Combat 2.0, Pip catalogue with real names, companions (Pip, Cusp), dark-to-bright restoration.
