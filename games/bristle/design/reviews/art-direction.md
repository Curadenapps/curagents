# BRISTLE v2: art direction review

Reviewer: art director. Date: 26 Nov 2026. Reviewed: `design/PLAN-v2.md`, `DESIGN.md`, `player.ts`, `npc/art.ts`, `enemies/*.ts`, `hud.ts`, `design/tokens.ts`, and builds of `crown-gate`, `gumline-pip`, `sugar-maw`, `calculus-throne` (screenshots in `/tmp/bristle-review/`). Client steer folded in: **clean, don't harm**; **educational, sneakily**; **products help**.

## 1. Verdict

The screenshots show near-black rooms where 80% of the frame is empty navy, plum or brown void, and a hero only about 50 px tall at 720p (7% of the screen). Nothing reads as bright or heroic. The hero is a white rounded helm on a dark body with a cloak, and the HUD is a round vessel beside a row of health icons, which is the exact silhouette and layout grammar we must leave behind. Pip and the Glutton already show the right instinct (round, cheeky, big-eyed, saturated), while Mother Calculus is a yellow-washed soft blob with no outline, and her own light flattens her. The code still says "kill", "death", "plaqueSplat" and "hurtShards" (enamel shards flying off the hero), and `tokens.ts` opens with "The game lives in the dark", so the plan's pivot is not yet in the foundations.

## 2. Visual identity

**BRISTLE looks like a mouth that gets cleaner while you watch.** Every room starts slightly filmed: dull, low-saturation, with a sticky yellow haze. Every clean stroke leaves a white four-point *ting* sparkle and foam, and as a room is cleared, its saturation, bloom and music return. The hero is the cleanest thing on screen: enamel white and CURAPROX Blue `#003DA5`, ink-outlined, crowned with a four-cusp molar helm, and carrying a CS 5460 brush that reads as a tool. Three shapes recur everywhere: the **four-cusp molar top** (helm, health crown, Crown board, Kit Deck), **fine parallel filament lines** (stroke trails, ring ticks, transitions, panel textures) and **foam bubbles** (the universal "good" particle). Futura caps name things, and Info Display explains them. Nobody is ever hurt: dirt is mischievous and stubborn, and cleaning sends it off waving.

## 3. Character design language

**Global rules**
- **Outline:** actors only, 2 px on screen at 1080p (scale with camera, min 1.5 px), in the faction's darkest shade, never pure black. The environment has no outlines except walkable top edges.
- **Shading:** flat base, one cel shade cut along a fixed upper-left key at 35°, one rim in the world's key colour, and one white specular ellipse on glossy materials only (enamel, candy, paste).
- **Eyes:** always a white sclera, an ink pupil and a highlight. Never hollow black eyes, never red eyes, never glowing slits on foes.
- **Clearing replaces death:** hits throw foam and sparkle with a rubber-squeak tone (no splatter, no gravity-heavy chunks). At zero "grip", the creature is wrapped in foam, rises in a bubble while waving (0.6 s), then pops into sparkles. Grip, not HP, is shown as sticky strands to the surface that snap one by one.
- **Silhouette test:** every character must be identifiable as a solid ink fill at 48 px.

| Faction | Shape language | Proportions | Motion personality | Palette |
|---|---|---|---|---|
| Hero and allies | circles plus soft upright rectangles, stable verticals | 2.5 heads; hero 64 world units (2 tiles) | snappy: 60 ms anticipation, scarf follow-through | enamel `#F3F6FC`, shade `#C7D3EA`, Blue `#003DA5`, Sky `#8BB8E8`, Cerise `#E31C79`, outline Ink `#0A1F44` |
| Plaque (Film) | soft blobs, dollops, suction feet, uneven eyes | head-only bodies, 0.5-1x hero height | elastic springs, raspberries, cheeky | Vivid Yellow `#FCE300`, hi `#FFF6A0`, shade Citrus `#C4D600`, outline `#5A5200` |
| Sugar | facets, triangles, twist-wrappers, stripes | small and wiry, or huge and round | jittery 8 Hz noise, sugar-rush dashes | Tangerine `#FF8200`, crystal `#FFF4E0`, facet `#FFD08A`, stripe Cerise `#E31C79`, outline `#7A3500` |
| Tartar | stacked slabs, strata, bricks, shingles | wide, low, heavy | slow 0.6 s windups, 1 s recoveries, grumpy-sleepy lids | bone `#D8CDB4`, crust `#E8E0C8`, shade `#8A826E`, vein Citrus `#C4D600`, outline `#4A463E` |
| Gum / inflammation | puffy bulbs, swelling domes, steam puffs | squat | 1.2 Hz throb; flustered, blushing, hot-headed | Orchid `#F277C6`, shade Cerise `#E31C79`, heat Tangerine `#FF8200`, outline `#6B1F4A`; when soothed, `#FFD6EA` |
| Bosses | their faction's shape at 4-6x, plus one crowning feature and a visible soft centre | fill 40-60% of the screen height | readable tells of 0.4 s or more, comic pauses | faction ramp plus a White `#FFFFFF` core glow |

**Originality guardrails:** no horned or white mask with void eyes; no small dark body under a big white head (today's hero is close to this); no needle-like blade; no key-shaped tool, heart emblems, three-point royal crowns, crown pendants or zipper-and-belt outfits.

### Concept specs

**Bristle (hero).** *Silhouette:* an oversized four-cusp molar helm (40% of height) with an open round visor, a Blue `#003DA5` tabard with white trim, short Cerise `#E31C79` scarf tails, and chunky white boots. *Signature:* the CS 5460 brush, 0.9x hero height, with a slim faceted handle, a compact head and 18-24 drawn filament lines tipped `#FFFFFF`. It is slung across the back at idle, like a tool, not a sheathed sword. *Eyes:* two Sky `#8BB8E8` ovals with highlights, made expressive by the visor's lid shape. *Idle:* a bounce, a thumb flick across the filaments, and a ting on the helm. *Attack:* small brisk circular strokes rather than swings. The finisher is a polishing spin that leaves a white foam ring, and the Prime strike is a precise poke-and-twist into a Gap. *CURAPROX:* gentle circles, the real brush shape, and handle colours from `brushHandles`.

**Derek (mentor).** *Silhouette:* tall and lean, hooded, with a staff topped by a dental mirror (keep it). *Signature:* the mirror throws a 45° light beam that teaches the gumline angle. *Colours:* robe `#F3F6FC`, shawl `#003DA5`, lining `#8BB8E8`, a Citrus `#C4D600` pin, and round spectacles with kind crescent eyes visible behind them (no shadowed void face). *Idle:* polishes his spectacles, hums. *Teaching:* demonstrates slow circles, and the player's brush trail ghosts his. *CURAPROX:* the voice of gentle technique.

**Pip (merchant).** Already our best character, so keep the spool. Add an outline, eyes 20% larger, and a Tangerine `#FF8200` pack (not brown) hung with product charms, plus a quiver of Prime brushes sorted by size colour. *Colours:* thread Orchid `#F277C6`, winding lines Cerise `#E31C79`, flanges `#F3F6FC`, lantern Citrus `#C4D600`. *Idle:* hops, unspools and rewinds, counts stock. *Helper:* lobs paste, and lassoes film off walls with floss. *CURAPROX:* the catalogue in person, with each product shown doing its job.

**The Warden.** *Silhouette:* a tall canine-tooth guard with a pointed cusp helm and a crown-shaped tower shield; swap the pike for a lantern staff. *Signature:* tartar crust patches (`#D8CDB4`) over his old white enamel (`#F3F6FC`). An optional quest has Derek and the player clean him, and the crust flakes off as sparkles to reveal a Blue plume and Sky eyes. *Idle:* dozes and snores a bubble, then snaps upright, embarrassed. *CURAPROX:* the restoration story in one character.

**The Glutton (sugar boss).** *Silhouette:* a huge onion-shaped plaque blob with cheeks stuffed with candy, a translucent belly showing sugar cubes, and a crown of crystals (`#FFF4E0` / `#FFD08A` / `#FF8200`). *Colours:* body `#FCE300`, shade `#C4D600`, tongue `#E31C79`, outline `#5A5200`. *Idle:* chews, licks lips, guards its pile like a child at a cookie jar. *Attack:* belly-bounce slams and candy spit, with a comic gulp as the tell. *Calmed:* hiccups the crystals out as sparkles, shrinks to Filmling size, burps a bubble and waddles off. *CURAPROX:* paste and rinse loosen it, and sugar visibly feeds plaque.

**Mother Calculus (final boss).** *Silhouette:* a terraced cliff-grandmother of stacked strata, a molar-crown head ringed with calcified rollers like hair curlers, crystal arms, and plates over a soft glowing heart. *Colours:* `#D8CDB4`, `#E8E0C8`, `#8A826E`, outline `#4A463E`, veins `#C4D600`, core `#FCE300` fading to `#FFFFFF`. *Idle:* tuts and drums her fingers: stubborn, not evil. *Attack:* fist slams with a 0.5 s finger-wag tell. Each phase loosens one stratum, uncovering softer and brighter colour. *Calmed:* the final rinse lifts her off the floor; her crust slides away like a shawl, and a tired little plaque blob yawns and floats off in a big bubble. *CURAPROX:* her damage windows are the seams between plates, so the boss teaches interdental cleaning.

**Filmling.** A dollop of film the size of the hero's head with suction-cup feet, one eye bigger than the other and its tongue out. *Idle:* oozes, blows a raspberry. *Attack:* puffs up, then hop-lunges to leave a sticky smudge on you. *Cleared:* two clean strokes. Optional teaching rule: a scrub smears it into two mini-Filmlings, because pressing harder doesn't help.

**Sugar Imp.** A boiled sweet with Cerise and white stripes, cellophane twist-wrapper wings and star highlights in its eyes. *Idle:* hyper hover with jitter. *Attack:* a swoop dive that leaves a sprinkle trail. *Cleared:* rinse dissolves the shell, the wrapper flutters down, and a tiny happy candy zips off.

**Tartar Brute.** A low tortoise of stacked shingles with a brick face plate and grumpy-sleepy lids. Its back seam glows Citrus, which is the Gap for a Prime or single-tuft strike. *Idle:* settles, yawns dust. *Attack:* paws the ground, then bulldozes. *Cleared:* the shingles pop off one by one, and the soft plaque inside shrugs, waves and rolls away in a bubble. *CURAPROX:* the right tool for armour.

## 4. World palettes (bright heroic)

**Contrast rule:** background layers sit at 55-85% value and 30-50% saturation, tinted toward the key colour. The playfield is fully saturated, and actors are outlined. The light map stays near neutral (ambient `#7C8088`-`#888C94` around the `#808080` neutral). **Restoration grade:** a filmed room starts at saturation x0.75 with a `#FCE300` haze at 8%, and clearing the room eases it to the values below over 2 s.

| World | Key | Supporting | Light mood | Grade (over default) |
|---|---|---|---|---|
| Crown Gate hub | White `#FFFFFF` / Sky `#8BB8E8` sky gradient `#D6E8FA`→`#8BB8E8` | Blue `#003DA5` banners and roofs, Vivid Yellow `#FCE300` bunting and windows, enamel terrain `#F3F6FC`/`#C7D3EA`, far towers `#A9C6EA` | morning sun, warm key `#FFF1C9` | tint [1,1,1.03], sat 1.08, contrast 1.04, bloom 0.35, threshold 0.82, vignette 0.18, grain 0.015, aberration 0 |
| Gumline Hollows | Orchid `#F277C6`, sky `#FFE3F1`→`#F6A5CB` | terrain `#D95A9E` / top `#FFD6EA`, Sky `#8BB8E8` glow bubbles, Citrus `#C4D600` fronds | warm sunset through soft tissue | tint [1.04,0.98,1], sat 1.12, bloom 0.45, threshold 0.78, vignette 0.22 |
| The Narrows | Sky `#8BB8E8` walls fading to Blue `#003DA5` depth | enamel walls `#F3F6FC`/`#99B1DB`, Cerise `#E31C79` floss ropes, Vivid Yellow `#FCE300` contact-point light | a vertical shaft of light from above, cool | tint [0.97,1,1.06], sat 1.0, contrast 1.1, bloom 0.4, vignette 0.25 |
| Sugar Wastes | Tangerine `#FF8200` dunes under a Sky `#8BB8E8`→`#CCD8ED` sky (complementary, so yellow plaque still reads) | crystals `#FFF4E0`/`#FFD08A`, Cerise `#E31C79` candy stripes, syrup `#FFB347` | high noon, heat shimmer | tint [1.05,1,0.95], sat 1.1, bloom 0.45, threshold 0.8, grain 0.02 |
| Calculus Deep | the one dusk world: Ink `#132B57` sky, bone terrain `#D8CDB4` | Citrus `#C4D600` veins, `#FCE300` plaque glow, Sky `#8BB8E8` lanterns | lantern-lit dusk, never black | tint [1,0.99,0.96], sat 0.95, contrast 1.1, bloom 0.55, threshold 0.72, vignette 0.35 |

This answers plan question 1: the worlds are bright, with one dusk world and filmed rooms you restore.

## 5. UI

The HUD is drawn at a 1280×720 reference, with a 24 px safe margin and an Ink `#0A1F44` outline at 2.5 px on every HUD shape. White panels sit on the world. The HUD must not copy the vessel-plus-icons layout or a vertical command list.

- **Health crown and Shine ring (top left).**
  - A 56 px Bristle helm portrait whose expression changes: content, strained, smudged, Gleam.
  - The Shine ring around it, 76 px across with a 7 px stroke, Vivid Yellow `#FCE300` on `#CCD8ED`. It is split into **four quadrant arcs**, which is the two-minute motif: one quadrant per 30 s of mouth, and a chime when each fills.
  - A **brush gauge** extends right from the portrait. The handle (110 px) carries fluor as a Sky `#8BB8E8` gel stripe. The head carries health as filament **tufts** (10×18 px, 4 px apart). A lost tuft goes filmed yellow and splays, rather than breaking, and is restored with a foam puff.
- **XP:** a 4 px Citrus `#C4D600` line under the gauge, with the level in a 20 px Blue roundel. When a point is unspent, a ting sparkles on the roundel every 3 s.
- **Kit Deck (bottom left):** four slots in a molar-top cluster (120 px). The active slot is 56 px at the top, the others 40 px. Each icon is the product's silhouette. Cycling rotates the cluster 90° in 160 ms with an out-back ease, and cost pips sit under the active slot.
- **Teaching cues (in world, not HUD).**
  - *Pressure:* filament tips flash Citrus on a clean stroke, and splay Tangerine on a scrub.
  - *Gumline angle:* a faint 45° guide line on Deep Clean and when facing gum foes.
  - *Prime sizes:* a size colour on each Gap seam and on its Prime. Placeholders until brand sign-off, then the real CPS colour coding.
  - *Rhythm:* the stroke window pulses on the music's beat.
- **Boss bar (bottom centre):** up to 50% of the screen width (max 640 px), a 14 px pill in the boss's faction key that drains to reveal white **clean** underneath. The name is Futura caps, 20 px, left-aligned above the bar. Phase notches are cusp shapes. Under it runs a 4 px Sky stagger line, and a full stagger fires a sparkle at the Gap marker.
- **Crown board:** a full screen on a Blue `#003DA5` field, with the white molar top at 70% of the height, left of centre.
  - *Cusps:* Velvet NW Sky `#8BB8E8`, Prime NE Cerise `#E31C79`, Foam SW Citrus `#C4D600`, Enamel SE Vivid Yellow `#FCE300`. Keystones sit where the cusps meet the central fissure.
  - *Node states:* locked (24 px, `#C7D3EA` outline, no fill), available (white fill and a cusp-colour ring breathing every 1.2 s), owned (cusp fill and a ting), keystone (40 px, four-cusp shape). Mastery shows as rings around each cusp.
  - *Preview panel:* the right 35% of the screen. A 2 s loop rendered by the game engine at 320×180, big before→after numbers in Futura, and one sentence in Info Display.
  - *Pick motion:* the node fills from its centre in 220 ms, the groove to it lights up over 300 ms, and foam rises from it.
- **Item cards:** 200×268, 3:4.
  - The top 60% shows the product drawn large on its world colour.
  - The name is Futura caps 18 px, followed by one Info Display line on what it does (15 px).
  - An "In real life" strip in Info Display 13 px carries neutral, brand-approved copy.
  - The slot shape is a tab in the top left. Prime cards get a size-colour edge.
- **Dialogue box:** bottom, 88% width (max 960), 168 px tall, white panel with a 3 px Ink outline and 20 px radius.
  - The portrait breaks out of the top-left edge, 160 px on the speaker's world colour.
  - The name sits in a pill in the speaker's accent. Text is Info Display 19/1.5 in Ink, typed at 40 characters per second.
  - The continue cue is a bobbing bristle tuft, and choices are pill buttons.
- **Labels and prompts:** caps are only for names and titles. Prompts like "Rest" and "Talk" use the sentence-case body face beside a key glyph.

## 6. Design system (claude.ai Design System)

**Sections:** Foundations · Drawing kit · Characters · Worlds · UI components · Screens · Teaching cues · Brand guardrails · Do/don't.

**Token families:**
- `color.brand`, `color.ink`, `color.material.*`, `color.faction.*` (base, hi, shade, outline, soothed)
- `color.world.*` (key, supporting, sky, far/mid/near, terrain), `color.prime.<size>` (pending brand)
- `color.ui.*`, `type.*`, `space`, `radius`, `stroke.outline`, `proportion.*`
- `light.*`, `grade.*` (including `grade.filmed`), `motion.duration/ease`, `feel.*`, `fx.*` (foam, ting, clear, smudge), `emissive.budget`

**Components:**
- **Health crown:** the portrait, the Shine ring and the brush gauge as one unit.
- **Shine ring:** the four-quadrant meter, with Gleam state.
- **Kit Deck:** the molar-cluster selector.
- **XP line:** level roundel plus progress.
- **Boss bar:** the clean-reveal bar with stagger line.
- **Panel:** the white rounded surface with Ink outline.
- **Button:** a pill in Blue, plus secondary and quiet variants.
- **Crown board node:** four states plus keystone.
- **Preview panel:** clip plus numbers for nodes and items.
- **Item card:** the product, its effect and its real-life line.
- **Dialogue box:** portrait, name pill, text, choices.
- **Toast:** a short confirmation, top centre.
- **Area title card:** world name and subtitle on entry.
- **Prompt:** key glyph plus verb, in world.
- **Teaching cues:** pressure tips, angle guide, Prime colour seam, beat pulse.

**Character sheets** (one per character):
- a silhouette at 48 px
- the side-view idle
- 6 expressions
- key poses: three strokes, finisher, Prime, smudged, Gleam
- the clearing (or calming) sequence
- a palette strip
- a scale lineup against the hero

**Do:**
- foam, sparkle and squeak on every hit
- foes that leave waving
- one key colour per world
- outlines on actors only
- the brush held as a tool
- products drawn recognisably and used for their own job
- rooms that brighten when cleaned

**Don't:**
- splatter, shards or chunks
- red eyes, void eyes or evil grins
- "kill" or "die" in UI copy
- decay, pain or teeth breaking
- clinical claims
- dark full-screen voids
- tracked-caps labels
- copied masks, blades, keys, hearts or royal crowns

## 7. The five biggest changes to the plan

1. **Make "clean, don't harm" a plan pillar and a code rename.** Damage becomes *grip*, kill becomes *clear*, and the boss is *calmed*. Hit effects become foam and ting, and hero hurt becomes a smudge on a tuft. Replace `plaqueSplat`, `plaqueBurst`, `hurtShards` and the kill hitstop/shake in `tokens.ts` and `common.ts`, and rename "brush-blade" to "brush" in `DESIGN.md`.
2. **Add restoration lighting as the core visual loop:** filmed rooms that regain saturation, bloom and music as they are cleared. This gives a reward every room, answers the brightness question, and is the identity in one mechanic.
3. **Frame the camera on the characters and redesign the hero.** Change `VIEW_H` from 17 to 13 tiles, make the hero 2 tiles tall, give him an open visor with Sky eyes and a Blue body, slinging the CS 5460, with ink outlines on all actors. This moves the silhouette away from Hollow Knight.
4. **Rebuild the HUD as a brush gauge plus a four-quadrant Shine ring plus the Kit Deck molar cluster,** with the teaching cues (pressure, 45° angle, Prime size colours, two-minute quadrants) as first-class design system components rather than later polish.
5. **Put the design system first, and gate the art on it.** Split M3: rewrite `tokens.ts` for bright worlds (ink floors, biome palettes, light and grade presets, particles, faction ramps), then restyle **one room** (Gumline with Pip, a Filmling and the hero) as a sign-off gate before any agent restyles the rest. Get the brand team's sign-off on Prime colours and product silhouettes during M3, not M4.
