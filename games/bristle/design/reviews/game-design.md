# BRISTLE v2: game design review

Reviewer: senior game design. Reviewed: `design/PLAN-v2.md` against the current code (player, perks, progress, entity, glutton, game). Includes the client's latest direction: clean, don't harm; educational without lectures; products clearly help.

## 1. Verdict

The direction is right: the pillars, the rhythm-plus-precision core and the Crown board fix the three real problems. The numbers in section 3 don't work yet: the clean window collides with the current 0.36 s attack cooldown, mashing would still match clean play on damage per second, and the boss time-to-clear targets mean five times the Glutton's current 120 grip. Fix the timing model, put the language and mechanics on a "clean, don't harm" footing, and make the gentle build the only route to the capstone. M1 and M2 can then ship as specified below.

## 2. The most important changes

**1. One timing model, measured from stroke start.** The plan keys the window to "after the last hit lands". That breaks on whiffs and on hitstop, and 0.22 s can never be pressed because `ATK_CD` is 0.36. Spec (game time, hitstop excluded): stroke active 0-0.11 s; window **0.24-0.50 s** on Knight, **0.20-0.70** on Gentle, **0.26-0.46** on Veteran. A press before the window is queued and fires as a **scrub at 0.28 s**. A press after the window starts a new string (opener, no penalty). Whiffs keep the rhythm but earn no Shine. Up-strokes count in the string. Pogo never does, so platforming stays reliable. Cue: a ring that closes on the knight at 0.24 s, plus a soft brush tick (audio-only players can play by ear). Score world music at 94 BPM, so the clean cadence (about 0.32 s) lands on eighth notes.

**2. Make "mashing is viable but weaker" true in the maths.** Damage per second is cleaning power times rate, so a faster scrub could out-clean clean play. Rates: opener 1.0x; clean strokes 2 and 3 at 1.3x; finisher 3.0x with 0.55 s recovery (dash-cancel from 0.25 s); scrub 0.75x. Mash loop: 0.75 / 0.28 s = 2.68 units/s. That equals today's 1.0 / 0.36 = 2.78, so casual play loses nothing. Clean loop: 6.6 / 1.51 s = 4.37 units/s, or **1.63x**. The table's "1.6x" holds.

**3. Clean, don't harm: grip, Loosen and Cling.** HP becomes **grip**, damage becomes **cleaning power**, stagger becomes a **Loosen meter**, and a creature is **cleared**: it pops into foam, waves and floats off. The knight is **chipped**, not wounded. Bosses are **calmed** and rinsed loose. The scrub penalty is the lesson: a scrub on a plaque creature **removes 5 Loosen**, because the creature squashes flat and clings harder (orange glow). A scrub on a gum creature makes it **Sore**: +25% speed for 3 s, no stacking. Gentle difficulty turns off both Cling and Sore. Loosen gains: clean stroke 8, finisher 25, Deep Clean 30, paste 6, scrub 0. Loosen decays 10/s after 2 s idle. Elite and boss Loosen: 100.

**4. Gaps and the Prime pass: context on Dash, sized, scripted on bosses.** No new button. Dash pressed within 120 px of an open Gap snaps into it: **5x base cleaning power** (one hit, so it must be big), +20 fluor, +15 Shine, extends the Gap by 0.6 s once. During a Gap all cleaning is +50%. Gap length: 2.0 s on Knight, 3.0 on Gentle, 1.5 on Veteran. Gaps are **sized S/M/L** and colour-coded like the real Prime range. The right size gives full effect. Too small gives 2x. Too large bounces off. The game picks the best size you own automatically, so owning the range is the benefit and players learn to match sizes without swapping. Every boss also has **scripted Gaps** (the Glutton's wall-roll dizzy already is one), so mashers still get the boss damage window. Dash is currently gated behind the Narrows relic. Derek should hand over a basic Prime in Crown Gate (Gap-snap only); the relic adds the free dash and the slits.

**5. Shine and Gleam: drain partly, end on a high.** Shine 0-100. Gains: clean stroke +4, finisher +12, Prime pass +15, perfect dodge (dash within 0.15 s of contact) +10, scrub 0. A chip costs **35** (20 on Gentle, 50 on Veteran), not the whole meter: a full drain feels awful. **Gleam** lasts 8 s: +30% cleaning, pierce, window +50%, and chips don't drain. It ends in a **Final Polish**: the next finisher is doubled and sends a sparkle wave that clears small creatures under 30% grip. With a good string the meter fills in about 20-25 s of engaged play.

**6. Fix the balance table and the boss target.** Label rows single-target or group. Real figures: clean plus Prime is **1.9x** with no nodes and 2.4x after Tight Fit and Open Wide. Gleam is 2.1x single-target and about 3.2x on groups. "2-3 min mashing" is too long for a first boss. Target on Knight: **100-120 s mashing, 50-65 s mastery**. That means Glutton grip **120 → 480**, tuned in playtest. Add a **Two-Minute Polish** medal for calming any boss in under 2:00: the habit, taught by a timer. Also fix a bug. `onKill` reads the HP after difficulty scaling, so Gentle players get about 30% less XP despite `xp: 1.0`. Compute XP from the unscaled base grip.

**7. Control load: eight actions, no more.** Keyboard: A/D move, Space jump, J brush (tap strokes, hold Deep Clean), K dash/Prime, L use Kit card, I cycle card (hold for radial), F focus, E interact. Gamepad: A jump, X brush, B dash/Prime, Y Kit, RB cycle (hold opens the radial at 30% time), LB focus. RT doubles as Prime for players who prefer triggers. Rinse leaves Up+spell and becomes a card. Section 5.1's seven slots become a single loadout: Brush + Prime set + 4 Deck cards + 2 charms. Card costs: paste 20, single tuft 15, Sonic 33, rinse 40 (fluor max 99, focus 33). Fluor gains: clean 13, scrub 9, finisher 15.

**8. Accessibility: Rhythm Assist.** This is a setting, separate from difficulty, and on by default on Gentle. Early presses wait for the window instead of scrubbing. Assisted strokes count as clean at **1.15x** and earn half Shine. The Sonic card is the product version: 5 s in which every press is clean at a 0.2 s cadence. Players learn by playing that the Sonic helps technique.

**Educational hooks (no claims):**
- **Sugar feeds plaque.** Sugar Imps that touch a plaque creature give it +50% grip.
- **Plaque hardens into tartar.** A creature left un-Loosened for 45 s turns into a tartar variant that only Deep Clean or a Gap can loosen. Tartar walls open only through **Derek's scale-off** at the hub: the professional does what the player can't.
- **Angle at the gumline.** Diagonal up-forward strokes clean gumline clingers at 1.5x.
- **Tongue cleaning.** The tongue cleaner charm clears coated terrain.
- **Twice a day.** Covered only by the optional Daily Tide (see section 6).

## 3. Crown board: 20 nodes, 4 keystones, 1 capstone

Costs: nodes 1 point, keystones 2 (need 3 nodes in their cusp), the Fissure capstone 3. The full board is 31 points; the slice gives about 13. A focused gentle player reaches **The Gentle Way** exactly at the slice's final boss (3+2+3+2+3). No other cusp pair has a capstone, so the gentle build is literally the ultimate one.

**Velvet (brush)**
- Soft Bristles: window +0.08 s late; you see far more white rings.
- Fourth Stroke: the string grows to 4 strokes and the finisher rises to 3.5x; a new animation, a longer dance.
- Grand Sweep: the finisher becomes a 360° arc that lifts medium creatures; crowd control you can see.
- Polish Glow: Shine from clean strokes +75%; Gleam roughly twice as often.
- Air Brushing: a 2-stroke air string and an air finisher that bounces you; a new verb in the air.
- **Keystone, Velvet Touch:** a perfect string's finisher sends an 8-tile bristle wave, and Gleam lasts +4 s.

**Prime (interdental)**
- Seam Sight: small creatures show Gaps after one finisher; Prime pass clears them outright.
- Long Reach: snap range 120 → 200 px; you fly across the screen.
- Tight Fit: Prime pass 5x → 7x; the biggest single number on the board.
- Perfect Pass: a perfect dodge gives 0.4 s slow time and makes the next stroke clean.
- Open Wide: Gaps last +1 s; time for a whole string inside one.
- **Keystone, Interdental Chain:** a Prime pass that clears or loosens leaps to the nearest creature within 6 tiles and opens a Gap there.

**Foam (Kit Deck)**
- Rich Lather: paste 20 → 14 fluor; double the throws.
- Fluor Spring: clean strokes +4 fluor; Foam also runs on technique.
- Foam Finish: finishers splash your equipped paste for free.
- Rinse Pool: rinse leaves a 4 s pool where focus is twice as fast.
- Long Hum: Sonic lasts 8 s; a whole fight phase on autopilot rhythm.
- **Keystone, Tidal Lather:** every third card in a room is free and doubled.

**Enamel (care)**
- Hard Shell: +1 enamel.
- Calm Gums: Sore and inflammation are halved.
- Quick Focus: focus 0.92 → 0.6 s; heal between enemy moves.
- Steady Shine: chips cost 35 → 15 Shine.
- Hard Shell II: +1 enamel.
- **Keystone, Second Smile:** once per room, a chip that would empty you leaves 1 enamel and starts Gleam.

**Fissure capstone, The Gentle Way** (needs Velvet Touch and Interdental Chain): every perfect string ends in an automatic Prime pass into the Gap it opens, and clean strokes +20%. The brush and the interdental brush become one motion.

Each node gets before/after numbers on the board. Clips are a stretch goal.

## 4. Reward cadence

**XP.** `nextXp(L) = 25 + 15(L-1)` (cumulative 765 to level 10). Clearing a creature gives `3 + baseGrip/4` on first clear and 25% on repeats. Other sources: first room visit +5, plaque wall +3, lore +5, lost filament +10, secret +20, mini-boss +60. A drill gives +1 point directly; a boss gives a level plus 1 bonus point. Slice end: about level 11 and 13 points. Do not auto-open the board mid-play (`queueOpen` does today). Show a 1.2 s celebration and a "+1 Crown" badge, and spend from pause anywhere. Respec at fountains.

**First 10 minutes**
- 0:00-0:30: wake, first steps, Crown Gate vista.
- 0:30: first Filmling; the ring appears and the first clean stroke sparkles.
- 1:00: first finisher; the creature pops and waves goodbye.
- 1:45: level 2; the board opens once as a tutorial; pick Soft Bristles or Fourth Stroke.
- 2:30: plaque wall hides lost filament #1.
- 3:00: first fountain (save, respec).
- 3:45: Derek's first drill ("3 clean strings"): +1 point and the basic Prime.
- 4:30: practice dummy with a Gap; first Prime pass, star burst.
- 5:30: level 3, second node.
- 6:30: first elite (Loosen bar visible), Gap, Prime pass.
- 7:30: a guaranteed Shine crystal makes the first Gleam, and the music layer kicks in.
- 8:30: secret room with paste card #2 (an element flavour).
- 9:30: level 4; Pip's shop opens and the catalogue teaser shows S/M/L Primes.

**Per world:** a new tool on entry (around 5 min in), a mini-boss (around 12 min), a boss (around 25 min) giving a level, a point and a Pip restock. Also one drill (a point), 3 secrets, 10 filaments (5 → +1 card charge, 10 → cosmetic), and one tartar wall for Derek.

## 5. Risks and cuts

**Risks**
- The ring reads as a quick-time event. Keep it diegetic on the knight, never central.
- Bright art drowns the ring and the Gap seams. Reserve white + cerise for them in the design system.
- Hitstop shifts the timing. Run all timers on hitstop-excluded game time.
- Claude-voiced NPCs slip into violent or clinical words. Add a banned list (kill, hurt, wound, cure, prevent) to the NPC prompt, with tests.
- Balance drift. Add a headless DPS harness to `tests/` for both loops.

**Cut in this order:** node clips; air strings (Air Brushing); Kit radial (keep cycle only); Gleam music layers; more than 3 Prime sizes; companions in combat; the town hub (Crown Gate plus a notice board is enough); Daily Tide.

## 6. Open questions

1. **Bright everywhere; interiors warm-dim, not dark.** Calculus Deep goes dusky stone with glowing seams. Darkness is never the mood.
2. **Placeholders now**, descriptive and colour-true (Velvet brush, Prime S/M/L), all from one names table that is swapped after brand sign-off. No real product names in any shared build before that.
3. **Keep Daily Tide out of the slice.** If it comes in later: opt-in, cosmetic rewards only, no streak loss, stored on the device only. A brushing log is health-adjacent personal data under GDPR, so it never goes to a server.
4. **Yes to a companion, in M5, dismissible.** Pip throws your equipped paste every 12 s and calls out Gap sizes ("small seam!"), which teaches sizing. Derek's one-time boss help stays Gentle-only.
