# Plaque Hunter

A two-minute, one-thumb game you play **while you brush**. Prototype for a touch point in the CURAPROX app.

You lead the 5,460: one spark for every filament on a CS 5460. The swarm is your lantern in a dark mouth. It
lifts film and catches the Plaqlings hiding in it. A tide hunt is four sides of 30 seconds, in brushing
order, and every side is worked three ways: the outside faces, the inside faces, then the chewing surfaces.

## Play it

Open `index.html` in a browser. No build step, no dependencies.

| You do | What happens |
|---|---|
| Drag slowly over teeth | The swarm follows and lifts film. Fast drags scatter it |
| Hold still | The swarm focuses to a single tuft, for brackets, wisdom teeth and other tight spots |
| Drag through a gap, in and out | A Prime slides between the teeth. Too fast and the gum flinches |
| Tap a card | Plays a piece of kit from your hand. Costs one charge |
| Let go | Fila, the guide light, leads the swarm, so the game still works as a brushing timer |

Settings has **Short hunts**, **Skip ahead 12 hours** and **Add 5,000 shine** for demos.
`node build.mjs` writes a single-file copy to `dist/plaque-hunter.html`.

## What is in it

- **Tide hunts.** Morning and evening, each counts once. Film grows back on the home map over about 13 hours.
  From the second hunt on, trouble turns up at random: sore gums, a crown, later a hole, braces, a bridge.
- **House calls.** Eight other mouths laid out as a branching route (braces, sore gums, a bridge, a hole,
  wisdom teeth, everything at once). Three stars each. They are fictional people, so nobody enters their
  own dental history.
- **Kit as cards.** Rinse blast (mouthwash), Sonic pulse (Hydrosonic), Foam up, Single tuft (CS single),
  Prime pack (CPS prime), Soft guard. A hand of three is dealt each pass. Two stars or more adds a card.
- **Upgrades and mastery.** Shine buys standing upgrades. Brushing, Interdental and Kit work level up
  separately, from how you actually played.
- **Plaqlings.** Fifteen to find, some tied to a time of day, a streak, a mouth feature or a tool.
- **Habit pieces.** Streak with shields, four-week journal, badges, a brush that frays after about 90 days.

## Why it is built this way

| Mechanic | The habit behind it |
|---|---|
| 4 sides × 30 s, with a buzz at each switch | Two minutes, every quadrant |
| Outside, inside, chewing on every side | No surface skipped |
| Slow and together cleans best | Gentle pressure, small circles |
| Gaps need a Prime, stroked gently | Interdental cleaning is its own skill |
| Two tides a day, each counts once | Morning and evening, no extra screen time |
| A hole or tartar only shifts after a logged check-up | Some things need a dental professional |
| The swarm frays as the brush ages | Replace the brush |

## Touch points for the CURAPROX app

The game raises events a host app can listen to (`window.PlaqueHunter.on(fn)`, and `postMessage` to a parent
frame with `source: 'plaque-hunter'`). The **App link** screen in the game shows them live.

| Event | When | The app could |
|---|---|---|
| `routine.completed` | A hunt ends | Mark the brushing routine done, award points |
| `interdental.completed` | Three quarters of the gaps cleared in a tide hunt | Mark the interdental step done |
| `streak.updated` | A tide hunt ends | Mirror the streak |
| `brush.replaced` | "I have a new brush" | Restart the reorder reminder |
| `shop.intent` | "Reorder" in Kit (from day 75) | Open the shop on the brush |
| `kit.upgraded`, `kit.card` | An upgrade or a new card | Tie kit to products a person owns |
| `checkup.logged` | "Log a check-up" | Later: fed by a BOB visit instead |

`PlaqueHunter.state()` returns the current tide, streak, points, rank and brush age. Going the other way
(reminders opening a hunt, a person's own mouth features from their plan, with consent) is not wired yet.

## Design

Menus follow the **Curaprox Apps Design System**: white canvas, Curaprox Blue, Futura Book caps headings,
Lead for short text, Info Display Pro copy, pill buttons, hairline cards, Lucide icons. The title screen is
the one Curaprox Blue brand surface.

The hunt itself is a lit world on the system's dark surface (ink navy): layered parallax, the swarm as the
light source, a vignette. Every colour is still a palette token (`PH.C` in `src/config.js`), but the
lighting uses radial falloff, which the system's "no gradients in app UI" rule does not cover either way.
That is a decision for the brand owner.

- **Fonts are not in this repo.** They are licensed. Copy `FuturaLTPro-Book.otf`, `FuturaLTPro-Bold.otf`,
  `InfoDisplayPro-Book.otf` and `InfoDisplayPro-Bold.otf` from the design system into `fonts/` (git-ignored).
  Without them the game falls back to Futura or Century Gothic.
- Icons load from the Lucide CDN; built-in stroke glyphs stand in when offline.

## Files

| File | What |
|---|---|
| `src/config.js` | Palette, Plaqlings, cards, upgrades, house calls, ranks, badges, tips, tuning |
| `src/store.js` | Save data, tides, streak, deck, mastery, bridge events |
| `src/strip.js` | The hunting ground: tooth rows in three views, mouth features, film, scenery |
| `src/hunt.js` | The hunt: input, swarm, gaps, focus, cards, Plaqlings, lighting |
| `src/world.js` | The home map of the whole Smile |
| `src/art.js` | Swarm, Plaqlings, Fila, brush, Prime |
| `src/ui.js` | Menus, HUD, results |
| `src/audio.js` | Synthesised sound and music |

## Before this goes near users

- **Copy needs a compliance check.** Tips, card texts and mouth features (sore gums, a hole, tartar) are
  habit wording written to avoid clinical or efficacy claims, but nobody at Curaden has reviewed them.
- **Balance is untested with people.** Tuning came from bots, not thumbs.
- Progress is saved in the browser only. Nothing is sent anywhere.
- English only. Plaqlings are game characters; the design system has no rule for them yet.
