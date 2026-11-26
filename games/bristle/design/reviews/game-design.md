# BRISTLE v2: game design review

Reviews `design/PLAN-v2.md` against the current code, plus the client's direction: clean, don't harm; teach habits without lectures; products clearly help.

## 1. Verdict

The pillars, rhythm-plus-precision core and Crown board fix the three real problems. The numbers in section 3 don't work yet: the clean window collides with the current 0.36 s attack cooldown, mashing would still match clean play on damage per second, and the boss time-to-clear targets mean five times the Glutton's current 120 grip. Fix the timing model, reframe combat as cleaning, and make the gentle build the only route to the capstone.

## 2. The most important changes

**1. One timing model, measured from stroke start.** The plan keys the window to "after the last hit lands". That breaks on whiffs and hitstop, and 0.22 s is unreachable with `ATK_CD` 0.36. Spec (hitstop excluded): stroke active 0-0.11 s; window **0.24-0.50 s** on Knight, **0.20-0.70** on Gentle, **0.26-0.46** on Veteran. An early press is queued and fires as a **scrub at 0.28 s**; a late press starts a new string, no penalty. Whiffs keep rhythm but earn no Shine. Up-strokes count; pogo never does. Cue: a ring closing on the knight plus a soft brush tick (playable by ear). Score world music at 94 BPM so the ~0.32 s clean cadence lands on eighth notes.

**2. Make "mashing is viable but weaker" true in the maths.** Output is power times rate, so fast scrubs could out-clean clean play. Rates: opener 1.0x; clean strokes 2 and 3 at 1.3x; finisher 3.0x with 0.55 s recovery (dash-cancel from 0.25 s); scrub 0.75x. Mash loop: 0.75 / 0.28 s = 2.68 units/s. That matches today's 2.78, so casual play loses nothing. Clean loop: 6.6 / 1.51 s = 4.37, or **1.63x**; the table holds.

**3. Clean, don't harm: grip, Loosen and Cling.** HP becomes **grip**, damage becomes **cleaning power**, stagger becomes a **Loosen meter**, and a creature is **cleared**: it pops into foam, waves and floats off. The knight is **chipped**; bosses are **calmed** and rinsed loose. The scrub penalty is the lesson: a scrub **removes 5 Loosen** from plaque (it squashes flat and clings harder, orange glow) and makes gum creatures **Sore** (+25% speed, 3 s, no stack). Both off on Gentle. Loosen gains: clean stroke 8, finisher 25, Deep Clean 30, paste 6, scrub 0. Loosen decays 10/s after 2 s idle. Elites and bosses: 100.

**4. Gaps and the Prime pass: context on Dash, sized, scripted on bosses.** No new button. Dash pressed within 120 px of an open Gap snaps into it: **5x base cleaning power** +20 fluor, +15 Shine, extends the Gap by 0.6 s once. During a Gap all cleaning is +50%. Gap length: 2.0 s on Knight, 3.0 on Gentle, 1.5 on Veteran. Gaps are **sized S/M/L** and colour-coded like the real Prime range. The right size gives full effect. Too small gives 2x; too large bounces. The best owned size is picked automatically: owning the range is the benefit, matching is learned without swapping. Every boss has **scripted Gaps** (the Glutton's wall-roll dizzy already is one) so mashers get the window too. Dash is gated behind the Narrows relic, so Derek gives a basic Prime (Gap-snap only) in Crown Gate.

**5. Shine and Gleam: drain partly, end on a high.** Shine 0-100. Gains: clean stroke +4, finisher +12, Prime pass +15, perfect dodge (dash within 0.15 s of contact) +10, scrub 0. A chip costs **35** (Gentle 20, Veteran 50), never the whole meter. **Gleam** lasts 8 s: +30% cleaning, pierce, window +50%, and chips don't drain. It ends in a **Final Polish**: a doubled finisher whose sparkle wave clears small creatures under 30% grip. Good play fills it in 20-25 s.

**6. Fix the balance table and the boss target.** Label rows single-target or group. Clean + Prime is **1.9x** unnoded, 2.4x with Tight Fit and Open Wide; Gleam is 2.1x single, ~3.2x groups. "2-3 min mashing" is too long. Target on Knight: **100-120 s mashing, 50-65 s mastery**. That means Glutton grip **120 → 480**, tuned in playtest. Add a **Two-Minute Polish** medal for calming a boss under 2:00: the habit, taught by a timer. Bug: `onKill` reads scaled HP, so Gentle earns ~30% less XP despite `xp: 1.0`; use unscaled base grip.

**7. Control load: eight actions, no more.** Keyboard: A/D move, Space jump, J brush (tap strokes, hold Deep Clean), K dash/Prime, L use Kit card, I cycle card (hold for radial), F focus, E interact. Gamepad: A jump, X brush, B dash/Prime, Y Kit, RB cycle (hold opens the radial at 30% time), LB focus. RT aliases Prime. Rinse becomes a card. Loadout: Brush, Prime set, 4 cards, 2 charms. Card costs: paste 20, single tuft 15, Sonic 33, rinse 40 (fluor max 99, focus 33). Fluor gains: clean 13, scrub 9, finisher 15.

**8. Accessibility: Rhythm Assist.** A setting, default on for Gentle: early presses wait for the window instead of scrubbing; assisted strokes clean at **1.15x** with half Shine. The Sonic card is the product version: 5 s where every press is clean at 0.2 s cadence, so players learn what a sonic brush is for.

**Educational hooks (no claims):**
- **Sugar feeds plaque.** Sugar Imps that touch a plaque creature give it +50% grip.
- **Plaque hardens into tartar.** A creature left 45 s turns tartar: only Deep Clean or a Gap loosens it. Tartar walls open only via **Derek's scale-off** at the hub: the professional does what you can't.
- **Angle at the gumline.** Diagonal up-forward strokes clean gumline clingers at 1.5x.
- **Tongue cleaner** charm clears coated, slowing terrain.

## 3. Crown board: 20 nodes, 4 keystones, 1 capstone

Nodes cost 1, keystones 2 (after 3 cusp nodes), the capstone 3: 31 points total, about 13 in the slice. A focused gentle player reaches **The Gentle Way** exactly at the slice's last boss (3+2+3+2+3). No other pair has a capstone: gentle is literally the ultimate build.

**Velvet (brush)**
- Soft Bristles: window +0.08 s late; far more white rings.
- Fourth Stroke: 4-stroke string, finisher 3.5x; a longer dance.
- Grand Sweep: 360° finisher lifting medium creatures; visible crowd control.
- Polish Glow: Shine from clean strokes +75%; Gleam roughly twice as often.
- Air Brushing: 2-stroke air string plus bouncing air finisher; a new verb.
- **Keystone, Velvet Touch:** a perfect string's finisher sends an 8-tile bristle wave, and Gleam lasts +4 s.

**Prime (interdental)**
- Seam Sight: small creatures show Gaps after one finisher; Prime pass clears them outright.
- Long Reach: snap 120 → 200 px; you fly across the screen.
- Tight Fit: Prime pass 5x → 7x; the biggest single number on the board.
- Perfect Pass: a perfect dodge gives 0.4 s slow time and makes the next stroke clean.
- Open Wide: Gaps +1 s; a whole string fits inside.
- **Keystone, Interdental Chain:** a Prime pass that clears or loosens leaps to the nearest creature within 6 tiles and opens a Gap there.

**Foam (Kit Deck)**
- Rich Lather: paste 20 → 14 fluor; more throws.
- Fluor Spring: clean strokes +4 fluor; Foam also runs on technique.
- Foam Finish: finishers splash your equipped paste for free.
- Rinse Pool: rinse leaves a 4 s pool where focus is twice as fast.
- Long Hum: Sonic lasts 8 s; a whole phase in rhythm.
- **Keystone, Tidal Lather:** every third card in a room is free and doubled.

**Enamel (care)**
- Hard Shell: +1 enamel.
- Calm Gums: Sore and inflammation are halved.
- Quick Focus: focus 0.92 → 0.6 s; heal between moves.
- Steady Shine: chips cost 35 → 15 Shine.
- Hard Shell II: +1 enamel.
- **Keystone, Second Smile:** once per room, a chip that would empty you leaves 1 enamel and starts Gleam.

**Fissure capstone, The Gentle Way** (needs Velvet Touch and Interdental Chain): every perfect string ends in an automatic Prime pass into the Gap it opens, and clean strokes +20%. The brush and the interdental brush become one motion.

Show before/after numbers; clips are a stretch goal.

## 4. Reward cadence

**XP.** `nextXp(L) = 25 + 15(L-1)` (cumulative 765 to level 10). Clearing a creature gives `3 + baseGrip/4` on first clear and 25% on repeats. Other sources: first room visit +5, plaque wall +3, lore +5, lost filament +10, secret +20, mini-boss +60. A drill gives +1 point directly; a boss gives a level plus 1 bonus point. Slice end: about level 11 and 13 points. Stop auto-opening the board mid-play (`queueOpen`): a 1.2 s celebration, a "+1 Crown" badge, spend from pause, respec at fountains.

**First 10 minutes**
- 0:30: first Filmling; first clean stroke sparkles.
- 1:00: first finisher; the creature pops and waves.
- 1:45: level 2; the board opens once as a tutorial; pick Soft Bristles or Fourth Stroke.
- 2:30: plaque wall hides lost filament #1.
- 3:00: first fountain.
- 3:45: Derek's first drill ("3 clean strings"): +1 point and the basic Prime.
- 4:30: practice dummy with a Gap; first Prime pass, star burst.
- 5:30: level 3, second node.
- 6:30: first elite (Loosen bar visible), Gap, Prime pass.
- 7:30: a guaranteed Shine crystal makes the first Gleam, and the music layer kicks in.
- 8:30: secret room with paste card #2 (an element flavour).
- 9:30: level 4; Pip's shop teases S/M/L Primes.

**Per world:** new tool (~5 min), mini-boss (~12), boss (~25: level, point, Pip restock), one drill, 3 secrets, 10 filaments (5 → +1 card charge, 10 → cosmetic), one tartar wall for Derek.

## 5. Risks and cuts

**Risks**
- The ring reads as a quick-time event: keep it on the knight, never central.
- Bright art drowns rings and seams: reserve white + cerise for them.
- Claude-voiced NPCs slip into violent or clinical words: banned list (kill, hurt, wound, cure, prevent) in the NPC prompt, with tests.
- Balance drift: a headless DPS harness in `tests/` for both loops.

**Cut in this order:** node clips; air strings (Air Brushing); Kit radial (keep cycle only); Gleam music layers; more than 3 Prime sizes; companions in combat; the town hub (Crown Gate plus a notice board is enough); Daily Tide.

## 6. Open questions

1. **Bright everywhere; interiors warm-dim, never gloomy.** Calculus Deep: dusky stone, glowing seams.
2. **Placeholders now**, colour-true (Velvet brush, Prime S/M/L), from one names table swapped after brand sign-off.
3. **Keep Daily Tide out of the slice.** Later: opt-in, cosmetic only, no streak loss, device-only storage (a brushing log is health-adjacent data under GDPR).
4. **Yes to a companion, in M5, dismissible.** Pip throws your paste every 12 s and calls Gap sizes ("small seam!"). Derek's boss help stays Gentle-only.
