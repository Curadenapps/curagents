# BRISTLE: Knight of the Crown — design bible

An original 2D action-platformer (metroidvania genre) set inside a mouth. PC first: keyboard and gamepad.
Built as a local web game (TypeScript, Canvas 2D for art, WebGL2 for light and bloom). No art files: everything
is drawn in code, so every module owns its own look.

**Originality rule.** The genre's conventions are fair game: a short melee blade with an up-slash and a pogo
down-slash, a resource you earn by hitting and spend on heals and spells, save points, dash and wall-cling
unlocks, atmospheric hand-drawn caves. Do **not** copy any existing game's characters, names, art, music,
level layouts or story. No hollow-eyed masks, no bug knights, no borrowed lore.

## The world

Inside the Great Smile lies **Ivoria**, a kingdom of enamel towers (teeth) above soft pink valleys (gums).
The **Film** (plaque) has crept in: eerie, cute-creepy Plaqlings born of leftover sugar, and the tartar beasts
they harden into. **Bristle** is the last knight of the **Order of the 5,460** (one oath per filament of the
CS 5460). They wake at the Crown Gate with a brush-blade and no memory of how long they slept.

Tone: quiet, melancholic, beautiful, a little funny. Never gross-out; no gore, no decay imagery, no fear about
real teeth. No clinical or medical claims anywhere (no "prevents", "cures", "removes 99%"). Oral-care habits
only as gentle in-world flavour.

## Vertical slice: route and gating

| Area (biome id) | Rooms | Feel | What happens |
|---|---|---|---|
| Crown Gate (`crown`) | 3 | Cold enamel ruins atop a molar, white and blue, wind | Tutorial, first fountain, **Derek** the hermit hygienist |
| Gumline Hollows (`gumline`) | 3-4 | Soft pink caverns, bioluminescent, warm | **Pip** the merchant, **Rinse** spell relic, sore gum hazards |
| The Narrows (`narrows`) | 2-3 | Tall interdental shafts, vertical, tight | **Prime Dash** relic; slits (`|`) you can only dash through |
| Sugar Wastes (`sugar`) | 2-3 | Crystal sugar spikes, orange haze, sticky | **Floss Grip** relic (wall cling and wall jump) |
| Calculus Deep (`calculus`) | 2 + arena | Bone-grey tartar caves, dark, heavy | **The Warden** (lore), boss **Mother Calculus** in `calculus-throne` |

Gating: dash opens the slits to the Sugar Wastes; grip lets you climb out of the Wastes into the Calculus Deep.
Beating the boss sets flag `calculus-defeated` and calls `g.ui.ending()`.

Start room id: `crown-gate` (marker `@`). Room ids use the biome as prefix: `gumline-1`, `narrows-shaft`...

## Art direction

Procedural vector art that reads as hand-drawn: dark layered silhouettes, 4-6 parallax layers, soft fog bands,
light shafts, glowing flora, gentle motion everywhere (drifting spores, swaying fronds, dripping water).
Characters are readable silhouettes with a bright accent (eyes, glows) against dark worlds.

Palette (CURAPROX), tints and shades allowed: Blue `#003DA5`, Ink `#0A1F44` / `#132B57`, Sky `#8BB8E8`,
White, Cerise `#E31C79`, Orchid `#F277C6`, Vivid Yellow `#FCE300`, Tangerine `#FF8200`, Citrus `#C4D600`.
Material language: enamel = white/sky; gums = orchid/cerise; plaque = yellow/citrus/orange (glowing);
tartar = bone, grey-beige; the hero = enamel helm, Curaprox-blue cloak, sky-blue visor glow.

Lighting: the scene canvas is multiplied by the light map (`ambient` + lights; mid grey `#808080` is neutral,
so dark caves use ambients around `#2a3350`-`#4a5a80`). Glows go on the **emissive** canvas (`drawEmissive`),
which is added after lighting and feeds bloom. Keep emissive for real light sources: eyes, plaque glow, sparks.

## Controls

Move A/D or arrows · Jump Space/Z · Blade J/X/left mouse (hold up/down for up-slash and pogo) ·
Dash K/C/Shift/right mouse · Rinse L/V · Focus (heal) hold F/Q · Interact E or Up · Pause Esc.
Gamepad: A jump, X blade, B/RB/RT dash, Y rinse, LB/LT focus, Start pause.

## Code map and ownership

| Path | Owner | What |
|---|---|---|
| `src/engine/*` (except audio) | core | Input, renderer + post, particles, math |
| `src/game/{types,registry,room,entity,player,game,objects}.ts` | core | Contracts, physics, hero, loop |
| `src/ui/hud.ts`, `src/main.ts` | core | HUD, boot, dev URL options |
| `src/game/world/**` | world agent | Biomes (backgrounds, terrain styles, decor, ambient FX, lights) and every room |
| `src/game/enemies/**` | bestiary agent | All enemies and the boss |
| `src/engine/audio.ts` | audio agent | SFX bank and the score |
| `src/ui/index.ts`, `src/ui/**` (not hud.ts), `src/game/npc/**`, `server/**` | NPC/UI agent | Menus, dialogue, NPCs, shop, AI voices, ending |

If you need a core change, make the smallest one and say so in your report.

## Contracts in brief (read `src/game/types.ts` and `src/game/registry.ts`)

- World units: 1 tile = 32. The camera shows 17 tiles of height (`VIEW_H`).
- Rooms are ASCII maps registered with `register.room(...)`. Core chars: `#` rock, `=` ledge, `^` spikes,
  `|` slit, `P` plaque wall, `S` fountain, `@` new-game start, `1`-`9` doors (edge cells; links in `doors`).
- Enemy chars (bestiary registers them, world places them): `f` Filmling (ground crawler), `s` Stickler
  (crawls around walls and ceilings), `i` Sugar Imp (flier), `t` Tartar Spitter (turret), `b` Tartar Brute
  (shielded charger), `l` Gum Leech (drops from ceilings), `m` Mite swarm (small fliers), `X` Mother Calculus.
- Objects (world places with `objects: [...]`): `relic` {ability, title, text}, `lore` {text},
  `npc` {id: 'derek' | 'pip' | 'warden'} (registered by the NPC/UI agent).
- Sound names the core already plays: `slash hit kill jump land walljump dash hurt death heal focus spell
  splash scrub break clink shine rest relic read door step`. Music ids: `title crown gumline narrows sugar
  calculus boss ending`.
- Flags: `calculus-defeated`, `relic-<ability>`, `blade` (number of blade upgrades, +2 damage each).
- `g.hudHooks.push((ctx, g) => ...)` draws on the HUD canvas (CSS pixels scaled); use it for a boss bar.

## Building and testing

```
cd games/bristle && npm install
npm run check                      # TypeScript
npm run build                      # dist/index.html, open it directly in a browser
npm run dev                        # http://localhost:5460 with rebuild on save
node tests/smoke.cjs <outDir> "room=crown-gate&all&god"   # headless run + screenshots
```

URL options: `?room=<id>&door=<marker>` start in a room, `&all` all abilities, `&god` no damage, `?play` skip the title.
