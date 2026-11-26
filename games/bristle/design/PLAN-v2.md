# BRISTLE v2 plan: our own adventure

Status: draft for review. Owner: Sean. Written 26 Nov 2026 after the first playable slice.

## 1. Where we are and what changes

The slice works: five areas, a boss, an Oath tree, Pip's shop, Claude-voiced NPCs. Three problems from play:

1. **Offence feels thin.** Slashing is one button with flat damage. Nothing rewards playing well.
2. **The Oath tree is clunky.** A grid of small percentages. You don't feel the gain.
3. **It reads as a Hollow Knight homage.** Dark caves, a lone knight, melancholy. We want our own identity.

**The pivot:** from a dark lone-knight metroidvania toward a **bright, heroic action-adventure**: colourful worlds you travel between, a hero with friends, flashy combos and finishers, an item and spell deck, a sense of wonder. Kingdom Hearts is the orientation for *feel* (heroic, warm, combo-driven, worlds, companions, command menu). We copy none of its characters, names, weapons, art or story.

**Our one-line identity:** *A tiny crowned knight and friends restore the worlds of a giant smile, with a CURAPROX brush, gentle technique and the right tool for every gap.*

## 2a. Three non-negotiables (client direction, 26 Nov)

1. **Clean, don't harm.** No violence. Plaque creatures are never killed or hurt: they are loosened, lifted and rinsed away, and they leave happily (they pop into foam and float off, wave, or turn into sparkles). Bosses are calmed or rinsed loose. The vocabulary follows:

   | Instead of | Use |
   |---|---|
   | HP | **grip** (how stuck a creature is) |
   | damage | **cleaning power** |
   | killed | **cleared** |
   | enemies | **the Film** or **Plaqlings** |

   The player is **knocked** or **chipped**, not wounded. Rough scrubbing makes creatures cling harder; gentle technique makes them let go.
2. **Educational, sneakily.** Real habits are the mechanics that win, with no lectures and no clinical claims:
   - gentle pressure and small rhythmic strokes
   - angling at the gumline
   - the right interdental size for each gap
   - two minutes, twice a day
   - sugar feeds plaque
   - plaque hardens into tartar that needs a professional (Derek)
   - cleaning the tongue

   Learning moments live in drills, lore stones, item cards and boss mechanics. All wording is flagged for compliance review.
3. **Products help.** Every CURAPROX tool gives a clear in-game benefit for its job, so players learn what each product is for by using it. Benefits are described as in-game effects only, never as real-world results.

## 2. Design pillars

1. **Gentle is strong.** The best build is careful technique: rhythmic brushing plus precise interdental strikes. Mashing works but is weaker. This is the game's thesis, true to CURAPROX, and it must be the most *fun* way to play, not the safe way.
2. **The right tool for the job.** Every CURAPROX product type is a distinct verb: brush (combos), Prime interdental brush (precision), single tuft (focus), paste (throws), rinse (area magic), sonic (rhythm burst), tongue cleaner (terrain).
3. **Always a reward around the corner.** Something to find, earn or unlock every 2-4 minutes.
4. **Bright worlds, warm friends.** Colour, music, companions, jokes. Never gross, never fearful about real teeth, no clinical claims.

## 3. Combat redesign: gentle rhythm and precision

### 3.1 Brush combo (the core offence)
- A **3-stroke string** plus a **finisher**. Each stroke has a visible timing window.
- **Clean stroke:** pressing in the window (0.22-0.45 s after the last hit lands, shown as a ring that flashes on the knight) deals 1.5x damage, gains fluor and builds **Shine**. The 3rd clean stroke chains into a **Finisher** (wide sweep, launches small enemies, stagger damage).
- **Scrub:** pressing too early (mashing) still hits for 0.7x, builds no Shine, breaks the chain. Against gum (inflammation) enemies, scrubbing also aggravates them (they get faster for a few seconds). No punishment beyond that: casual players can still mash through.
- **Deep Clean** (hold) stays as the guard breaker.

### 3.2 Stagger and gaps (the interdental payoff)
- Every enemy has a **stagger bar** (hidden for small ones, shown for elites and bosses). Clean strokes and finishers fill it fast; scrubs fill it slowly.
- A staggered enemy **opens a Gap**: a glowing seam for 2 seconds.
- **Prime strike** (dash into an open Gap, or a new dedicated button) is a **precision critical**: 3x damage, refunds fluor, extends the stagger. On bosses, Gaps are the main damage window.
- Prime sizes matter (see Pip, 5.2): bigger Primes hit wider Gaps, smaller ones crit harder.

### 3.3 Shine and Gleam (reward for playing well)
- Clean strokes, Prime crits and perfect dodges build **Shine** (a meter around the health crown).
- Full Shine triggers **Gleam** for 8 s: the brush glows, strokes have range and pierce, colours brighten, music adds a layer. Taking a hit drains Shine.
- This is where offence *feels* strong: Gleam turns a good player into a whirlwind.

### 3.4 Magic and items: the Kit Deck
- Paste, Rinse, Sonic and items live in a **Kit Deck** of 4 slots, cycled with one button and fired with another (gamepad: shoulder plus face button). A small radial on the HUD shows the active slot.
- Fluor stays the magic resource. Paste is cheap, Rinse expensive, Sonic medium.

### 3.5 Balance targets (Knight difficulty)
| Play style | Damage per second vs a standard foe | Notes |
|---|---|---|
| Mashing only | 1.0x (baseline) | always viable on Gentle |
| Clean strokes | 1.6x | with finishers |
| Clean + Prime crits | 2.4x | the intended mastery curve |
| Gleam active | 3.2x | short windows |
| Boss time to kill | 2-3 min mashing, 70-90 s mastery | |

## 4. Progression: the Crown board (replaces the Oath grid)

### 4.1 Shape and feel
- The skill tree becomes **the Crown**: a radial board shaped like the top of a molar. **Four cusps**, each a path, meeting at a central fissure.
  - **Velvet** (gentle brushing, combos, Shine)
  - **Prime** (precision, Gaps, crits, dash)
  - **Foam** (paste, rinse, sonic, the Kit Deck)
  - **Enamel** (health, defence, healing, inflammation)
- About 24 nodes. **Every node is felt**: a new move, a new rule or a big number (20%+), never +3%.
- Each cusp ends in a **keystone** that changes how you play, for example:
  - *Velvet Touch:* the clean-stroke window doubles and clean strokes heal.
  - *Gap Master:* Prime crits chain to a second open Gap.
  - *Foam Tide:* paste puddles merge and grow.
  - *Living Enamel:* take a hit and gain Shine instead of losing it, once per fight.
- **Preview before you pick:** each node shows a 2-second looping clip or before/after numbers.
- **Free respec at fountains.** Experimenting is part of the fun.

### 4.2 Earning points
- **XP sources:**
  - Kills, full the first time a room is cleared and 25% on repeats, which stops grinding.
  - Exploration: first visit, plaque walls scrubbed, lore read, secrets found.
  - Bosses: a guaranteed level.
- One Crown point per level. Keystones need 3 points in their cusp.
- **Level pace:** level 2 within 2 minutes, about one level per area room, and roughly level 10 at the slice's final boss.
- **Faction mastery** stays and shows on the Crown as rings around each cusp.

## 5. CURAPROX content through Pip (and friends)

### 5.1 Kit slots
Equip one item per slot. Items are the CURAPROX range expressed as gameplay. Pip sells them, Derek teaches techniques, and some are found in worlds.

| Slot | What it changes | Example items (names to confirm with the brand team) |
|---|---|---|
| **Brush** (weapon) | combo shape and feel | CS 5460 (balanced), a velvet/supersoft brush (wider clean-stroke window, lower damage), a compact head (faster strokes, shorter reach), an ortho brush (bonus vs braces enemies) |
| **Prime** (interdental) | Gap strikes | CPS prime sizes as charms: small sizes crit harder, larger sizes hit wider Gaps; colour-coded like the real range |
| **Single tuft** | focused thrust | CS 1009-style single tuft: a piercing lance for tight spots and armoured weak points |
| **Paste** (throw) | magic element | Enzycal (a steady foam), Be You flavours as elements (each a colour and effect), a charcoal-black paste (heavy, slow, big splash) |
| **Rinse** (big magic) | area spell | a rinse wave; a gentle soothing rinse (heals, calms inflammation) |
| **Sonic** | rhythm burst | Hydrosonic: auto-clean strokes in rhythm for a few seconds |
| **Charms** (2) | passives | tongue cleaner (clears coated-tongue terrain and slows), a travel case (+1 Kit Deck slot), kids' brush (Gentle-mode helper charm) |

### 5.2 Pip, the catalogue and the habit tie-in
- **Pip's catalogue** grows as you progress; new stock appears after each boss. Each item has a short in-world blurb, plus an optional **"In real life"** line in neutral product language, signed off by the brand team, with no efficacy claims.
- **Derek's drills:** technique quests (land 10 clean strokes, crit 5 Gaps). They reward Crown points and teach the mechanics.
- **Daily Tide (optional):** one in-game bonus per real morning and evening if you choose to log brushing. Presented as fun, never health advice.

### 5.3 Brand guardrails
- No clinical, medical or efficacy claims anywhere, including in AI dialogue.
- Product names, colours and size codes are checked by the brand team before any public build. Until then, placeholders.
- Never shame the player or depict decay or pain.

## 6. Worlds and adventure

- **Hub:** the Crown Gate becomes a small town (Derek, Pip, a fountain, a notice board for drills), reached from every world.
- **Worlds:**
  - *Gumline Hollows* (warm pink)
  - *The Narrows* (vertical, between teeth)
  - *Sugar Wastes* (candy-bright desert)
  - *Calculus Deep* (stone)
  - *later:* Tongue Plains, Palate Heights, Molar Citadel
- **Each world has:** 5-8 rooms, one mini-boss, one boss, one new tool, 3 secrets, one drill, one Pip restock.
- **Companions:** Pip can join as a helper (throws paste on cooldown) once befriended. Derek appears in boss arenas with one-time help in Gentle mode.
- **Reward cadence:** a chest, secret or upgrade at least every 2-4 minutes. Collect **lost filaments** (10 per world) for +1 Kit Deck charge or a cosmetic.

## 7. Art and UI direction

- **From dark to bright:** saturated, luminous worlds with a strong key colour per world; the lighting system stays, used for warmth and magic rather than gloom.
- **Characters:** chunkier, rounder silhouettes, 2px ink outlines, cel shading with one highlight, bigger expressive eyes. The hero's crown helm stays as the signature.
- **Effects:** sparkles, foam, ribbons of light on finishers, star bursts on Gap crits, a brief camera punch-in on finishers.
- **UI:**
  - a **command-style HUD**: the health crown plus Shine ring top left and the Kit Deck radial bottom left
  - big rounded panels, crisp Futura caps
  - the Crown board as the showpiece screen
- **Design system:** built as a claude.ai Design System. It covers:
  - tokens: world palettes, materials, light presets, type, motion and game-feel numbers
  - components: HUD pieces, panels, buttons, the Crown board, item cards, dialogue box, boss bar, toasts
  - the drawing kit for characters
  - do/don't rules

  Every agent builds from it.

## 8. Milestones

| # | Milestone | Content | Size |
|---|---|---|---|
| M1 | Combat 2.0 | rhythm strokes, finisher, stagger and Gaps, Prime strike, Shine and Gleam, balance pass | L |
| M2 | Crown board | radial board UI, 24 nodes, keystones, previews, respec, new XP rules | M |
| M3 | Design system and style pivot | the design system, then a bright-world art pass, character restyle, new HUD | L |
| M4 | Pip's catalogue and Kit Deck | slots, 15-20 items, catalogue UI, Derek's drills | M |
| M5 | Hub and companions | Crown Gate town, Pip helper, world map | M |
| M6 | New world and polish | one new world end to end, audio pass, juice | L |

## 9. Open questions for Sean
1. How far to brighten: fully bright worlds, or bright with darker interiors (dungeons) for contrast?
2. Should real product names appear in the game now, or only placeholders until the brand team signs off?
3. Should the Daily Tide (real-life brushing log) be in, or kept out of the game entirely?
4. Is a companion (Pip helping in fights) wanted, or should the knight stay solo in combat?
