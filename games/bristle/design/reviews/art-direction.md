# BRISTLE v2: art direction review

Art director, 26 Nov 2026. Screenshots are in `/tmp/bristle-review/`. This review folds in the client's steer: clean, don't harm; teach technique without saying so; each product is the right tool for its job.

## 1. Verdict

Every room screenshot is mostly empty navy, plum or brown, with a 50 px hero at 720p. Nothing reads bright or heroic. The hero (white rounded helm, dark body, cloak) and the HUD (a round vessel beside health icons) carry exactly the silhouette and layout we are leaving. Pip and the Glutton have the right instinct: round, cheeky, saturated. Mother Calculus is an unoutlined blob washed out by her own yellow light. The code still says kill, `plaqueSplat` and `hurtShards`, and `tokens.ts` begins "The game lives in the dark".

## 2. Visual identity

**BRISTLE is a mouth that gets cleaner while you watch.** Rooms start filmed: dull, with a yellow haze. Every clean stroke leaves foam and a white four-point *ting*, and a room that has been cleared gets its saturation, bloom and music back. The hero is always the cleanest thing on screen: enamel white and CURAPROX Blue, outlined, under a four-cusp molar helm, carrying a CS 5460 that reads as a tool. Three motifs recur:
- **the four-cusp molar top:** helm, health, Crown board, Kit Deck
- **filament lines:** stroke trails, ring ticks
- **foam bubbles:** the one good particle

Futura caps name things, and Info Display explains them. Nobody is hurt: dirt is mischievous and stubborn, and it leaves waving.

## 3. Character design language

- **Outline:** characters only, 2 px at 1080p (at least 1.5 px), in the faction's darkest shade, never black. Scenery gets none.
- **Shading:** a flat base and one cel shade from an upper-left key, a rim in the world colour, and a white highlight on glossy surfaces only.
- **Eyes:** a white sclera, an ink pupil and a highlight. Never hollow, black or red eyes.
- **Clearing, not death:**
  - A hit throws foam and sparkle with a squeak, never splatter.
  - Grip shows as sticky strands that snap one by one.
  - At zero grip the creature floats off in a foam bubble, waving, then pops into sparkles.
- **Silhouette test:** every character reads as a solid fill at 48 px.

| Faction | Shape | Motion | Base / shade / accent / outline |
|---|---|---|---|
| Hero, allies | circles, soft upright rectangles; 2.5 heads; hero 2 tiles tall | snappy, scarf follow-through | `#F3F6FC` `#C7D3EA` `#003DA5`+`#E31C79` `#0A1F44` |
| Plaque | dollops, suction feet, mismatched eyes | elastic, cheeky | `#FCE300` `#C4D600` `#FFF6A0` `#5A5200` |
| Sugar | facets, twist-wrappers, stripes | jittery, rushing | `#FF8200` `#FFD08A` `#E31C79` `#7A3500` |
| Tartar | slabs, strata, shingles | slow windups, grumpy | `#D8CDB4` `#8A826E` `#C4D600` `#4A463E` |
| Gum | puffy bulbs, steam puffs | throbbing, flustered | `#F277C6` `#E31C79` `#FF8200` `#6B1F4A`; soothed `#FFD6EA` |
| Bosses | faction shape at 4-6x, one crowning feature, a soft core | tells of at least 0.4 s, comic pauses | faction ramp plus a white core |

**Originality:** never use these:
- a white or horned mask
- a small dark body under a big white head (today's hero)
- a needle blade or a key-shaped tool
- hearts or royal crowns
- zipper-and-belt outfits

**Bristle (the hero)**
- **Silhouette:** an oversized four-cusp helm, an open visor with Sky `#8BB8E8` eyes, a Blue tabard with white trim, Cerise scarf tails and white boots.
- **Signature:** a CS 5460 at 0.9x the hero's height, with about 20 filaments, slung on the back like a tool.
- **Idle:** bounces and thumbs the filaments.
- **Attack:** small brisk circles, not swings. The finisher is a polishing spin that leaves a foam ring. The Prime strike is a poke-and-twist into a Gap.

**Derek (mentor)**
- Tall and hooded, with his dental-mirror staff.
- **Colours:** a white robe and a Blue shawl. Round spectacles show kind eyes, not a void.
- **Signature:** the mirror throws a 45° beam that teaches the gumline angle. When he teaches, the player's trail ghosts his slow circles.

**Pip (merchant)**
- Keep the spool, add an outline and make the eyes 20% bigger.
- **Colours:** Orchid thread, a Tangerine pack hung with product charms, and a Citrus lantern.
- **Signature:** a quiver of Prime brushes sorted by size colour.
- **As a helper:** lobs paste, and lassoes film off walls with floss.

**The Warden**
- A tall canine-tooth guard with a crown-shaped tower shield and a lantern staff.
- Tartar patches `#D8CDB4` cover his white enamel. Cleaning him in an optional quest reveals a Blue plume.
- **Idle:** dozes, then snaps upright.

**The Glutton (sugar boss)**
- An onion-shaped plaque blob with candy-stuffed cheeks, a belly of sugar cubes, and a `#FFF4E0`/`#FF8200` crystal crown.
- **Personality:** a child guarding a cookie jar.
- **Attack:** belly-bounce slams and candy spit, with a comic gulp as the tell.
- **When calmed:** hiccups its crystals out as sparkles, shrinks, burps a bubble and waddles off.

**Mother Calculus (final boss)**
- A terraced grandmother of strata, with calcified hair curlers, crystal arms, and plates over a glowing `#FCE300` core.
- **Personality:** stubborn, not evil. Her slam tell is a finger wag.
- **Fight:** each phase loosens one layer, showing brighter colour underneath. Her weak points are the seams between plates, so the fight teaches interdental cleaning.
- **When calmed:** her crust slides off like a shawl, and a tired little blob floats away.

**Filmling:** a dollop with one big eye and its tongue out. It blows raspberries, then lunges to leave a sticky smudge. Two clean strokes clear it. An optional teaching rule: scrubbing splits it in two.

**Sugar Imp:** a striped boiled sweet with twist-wrapper wings. It jitters, then swoops. Rinse dissolves the shell, and a tiny happy candy zips off.

**Tartar Brute:** a shingled tortoise with sleepy lids. Its Citrus back seam is the Gap for a Prime or single-tuft strike. When cleared, its shingles pop off, and the plaque inside waves and rolls away.

## 4. World palettes

**Contrast:** backgrounds sit at 55-85% value and 30-50% saturation. The playfield is fully saturated. Ambient light is `#7C8088`-`#888C94`.

**Filmed rooms:** a room starts at x0.75 saturation under an 8% `#FCE300` haze, and eases to the grade below over 2 s once cleared.

| World | Key | Supporting | Light | Grade |
|---|---|---|---|---|
| Crown Gate | sky `#D6E8FA`→`#8BB8E8` | Blue roofs, Yellow `#FCE300` bunting, enamel `#F3F6FC` | morning, `#FFF1C9` | sat 1.08, bloom 0.35, threshold 0.82, vignette 0.18, grain 0.015 |
| Gumline Hollows | Orchid `#F277C6`, sky `#FFE3F1` | terrain `#D95A9E`, Sky bubbles, Citrus fronds | warm sunset | sat 1.12, bloom 0.45, threshold 0.78, vignette 0.22 |
| The Narrows | Sky walls deepening to Blue | enamel `#F3F6FC`/`#99B1DB`, Cerise ropes | cool shaft from above | contrast 1.1, bloom 0.4, vignette 0.25 |
| Sugar Wastes | Tangerine `#FF8200` dunes under a Sky sky, so plaque still reads | crystals `#FFF4E0`, Cerise stripes | high noon | sat 1.1, bloom 0.45, grain 0.02 |
| Calculus Deep | dusk: Ink `#132B57`, bone `#D8CDB4` | Citrus veins, Sky lanterns | lantern-lit, never black | sat 0.95, bloom 0.55, vignette 0.35 |

This answers plan question 1: bright worlds, one dusk world, and filmed rooms you restore.

## 5. UI

**HUD:** reference 1280×720, a 24 px margin, white shapes with a 2.5 px Ink outline. No vessel beside icons, and no command list.

- **Health crown (top left)**
  - A 56 px helm portrait whose expression changes.
  - A **Shine ring** around it: 76 px, a 7 px Yellow stroke in four quadrant arcs. This is the two-minute motif: each quadrant is 30 s of brushing, and filling one chimes.
  - A **brush gauge** to the right. The handle carries fluor as a Sky gel stripe. The head carries health as filament tufts (10×18 px). A lost tuft yellows and splays, and foam restores it.
- **XP:** a 4 px Citrus line under the gauge, with a Blue level roundel that tings when a point is unspent.
- **Kit Deck (bottom left):** a molar cluster of four slots, 120 px across. The active slot is 56 px. Slot icons are product silhouettes. Cycling rotates 90° in 160 ms.
- **Teaching cues (in the world)**
  - **Pressure:** filament tips flash Citrus on clean strokes and splay Tangerine on scrubs.
  - **Gumline angle:** a faint 45° guide on Deep Clean.
  - **Prime size:** Gap seams show their Prime's colour (placeholders until the brand team confirms the real colours).
  - **Rhythm:** the stroke window pulses on the beat.
- **Boss bar:** a 14 px pill at the bottom, up to 640 px wide, that drains to reveal white **clean** beneath. A Futura caps name sits above it, and a 4 px Sky stagger line below.
- **Crown board**
  - **Layout:** a white molar top on a Blue field. Velvet in Sky, Prime in Cerise, Foam in Citrus, Enamel in Yellow, with the keystones at the central fissure.
  - **Node states:** locked (outline only), available (a breathing ring), owned (filled, with a ting), keystone (40 px, four-cusp shape).
  - **Preview:** the right 35% of the screen, with a 2 s in-engine loop and before→after numbers.
  - **Picking a node:** it fills in 220 ms, and its groove lights up.
- **Item card:** 200×268 px. The product drawn large, its name, one line on what it does, and a brand-approved "In real life" strip.
- **Dialogue box:** 88% wide (max 960 px) and 168 px tall, white, with a 3 px Ink outline. The 160 px portrait breaks out of the top-left edge. The text is Info Display 19 px.
- **Copy:** caps only for names. Prompts are sentence case.

## 6. Design system (claude.ai)

**Sections:** Foundations, Drawing kit, Characters, Worlds, UI, Teaching cues, Guardrails, Do/don't.

**Token families**
- `color.brand`, `color.material`, `color.faction` and `color.world`
- `color.prime` (pending the brand team) and `color.ui`
- `type`, `space`, `radius`, `stroke`
- `light`, `grade` (including filmed), `motion`, `feel`, `fx`

**Components**
- **Health crown:** portrait, ring and gauge.
- **Shine ring:** the four-quadrant meter.
- **Kit Deck:** the slot selector.
- **XP line:** level and progress.
- **Boss bar:** grip and stagger.
- **Panel:** the base surface.
- **Button:** the main action.
- **Crown node:** the node states.
- **Preview:** a clip with numbers.
- **Item card:** shows a product.
- **Dialogue box:** a conversation.
- **Toast:** a confirmation.
- **Area title:** shown on entry.
- **Prompt:** a key and a verb.
- **Teaching cues:** the technique hints.

**Character sheets:** each one has the silhouette, idle, expressions, key poses, the clearing sequence, a palette strip and a scale lineup.

**Do:**
- foam on every hit
- foes that leave waving
- one key colour per world
- products drawn recognisably

**Don't:**
- splatter
- red or void eyes
- "kill" in copy
- decay or pain
- clinical claims
- copied masks, blades or crowns

## 7. Five biggest changes to the plan

1. **Make "clean, don't harm" a pillar, and rename in code to match.** Damage becomes grip and kill becomes clear. Replace `plaqueSplat`, `plaqueBurst` and `hurtShards`.
2. **Use restoration lighting as the core visual loop.** Filmed rooms regain saturation as they are cleaned.
3. **Frame the camera on the characters.** Cut `VIEW_H` from 17 to 13 tiles, and restyle the hero with an open visor, a Blue body and outlines.
4. **Rebuild the HUD** as the brush gauge, the four-quadrant Shine ring and the Kit Deck, with the teaching cues as components.
5. **Gate the art on the design system.** Rewrite `tokens.ts` first, restyle one Gumline room for sign-off, and get the brand team to approve the Prime colours during M3.
