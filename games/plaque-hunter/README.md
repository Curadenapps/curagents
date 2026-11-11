# Plaque Hunter

A two-minute, one-thumb game you play **while you brush**. Prototype for a touch point in the CURAPROX app.

You lead the 5,460: one soft spark for every filament on a CS 5460. The swarm follows your thumb round the
mouth, lifts film and catches the Plaqlings hiding in it. A hunt is four sides of 30 seconds, in brushing
order, and each side runs outside, inside, chewing. The tide comes in twice a day, morning and evening, and
that is when a hunt counts.

## Play it

Open `index.html` in a browser. No build step, no dependencies.

- Drag slowly: the swarm stays together and cleans well. Drag fast and it scatters.
- Hands full? Let go. Fila (the guide light) leads the swarm so the game still works as a brushing timer.
- Settings has **Short hunts** (4 × 10 s) and **Skip ahead 12 hours** for demos.

`node build.mjs` writes a single-file copy to `dist/plaque-hunter.html`.

## Why it is built this way

| Mechanic | The habit behind it |
|---|---|
| Hunt = 4 sides × 30 s, with a buzz at each switch | Two minutes, every quadrant |
| Each side runs outside, inside, chewing | No surface skipped |
| Slow and together cleans best, fast scatters the swarm | Gentle pressure, small circles |
| Two tides a day, each counts once | Morning and evening, no extra screen time |
| Film grows back on the home screen over about 13 hours | Plaque returns, so the routine does too |
| Prime time: Gappers sit where the swarm cannot reach | Interdental cleaning, once a day |
| The swarm frays as the brush passes about 90 days | Replace the brush |
| Tartar Tot only moves after a logged check-up | Some things need a dental professional |
| Streak with shields (one earned per 7 days) | A missed day does not end everything |

## Touch points for the CURAPROX app

The game raises events a host app can listen to (`window.PlaqueHunter.on(fn)`, and `postMessage` to a parent
frame with `source: 'plaque-hunter'`). The **App link** screen in the game shows them live.

| Event | When | The app could |
|---|---|---|
| `routine.completed` | A hunt ends | Mark the brushing routine done, award points |
| `interdental.completed` | Prime time ends | Mark the interdental step done |
| `streak.updated` | A tide hunt ends | Mirror the streak |
| `brush.replaced` | "I have a new brush" | Restart the reorder reminder |
| `shop.intent` | "Reorder" in Gear (from day 75) | Open the shop on the brush |
| `checkup.logged` | "Log a check-up" | Later: fed by a BOB visit instead |

`PlaqueHunter.state()` returns the current tide, streak, points, rank and brush age. Going the other way
(reminders opening a hunt, Prime sizes from a treatment plan) is not wired yet.

## Design

Styled with the **Curaprox Apps Design System**: white canvas, Curaprox Blue, Futura Book caps headings, Lead
for short text, Info Display Pro copy, pill buttons, hairline cards, flat fills, Lucide icons. Every colour in
the game, creatures included, is a palette token (`PH.C` in `src/config.js`). The title screen is the one
Curaprox Blue brand surface.

- **Fonts are not in this repo.** They are licensed. Copy `FuturaLTPro-Book.otf`, `FuturaLTPro-Bold.otf`,
  `InfoDisplayPro-Book.otf` and `InfoDisplayPro-Bold.otf` from the design system into `fonts/` (git-ignored).
  Without them the game falls back to Futura or Century Gothic.
- Icons load from the Lucide CDN; built-in stroke glyphs stand in when offline.

## Files

| File | What |
|---|---|
| `src/config.js` | Palette, Plaqlings, ranks, colourways, badges, tips, tuning |
| `src/store.js` | Save data, tides, streak, bridge events |
| `src/world.js` | The Smile: tooth geometry, film, drawing |
| `src/art.js` | Swarm, Plaqlings, Fila, brush, Primes |
| `src/hunt.js` | The hunt and Prime time |
| `src/ui.js` | Menus, HUD, results |
| `src/audio.js` | Synthesised sound and music |

## Before this goes near users

- **Copy needs a compliance check.** Tips and Plaqling lines are habit wording, written to avoid clinical or
  efficacy claims, but nobody at Curaden has reviewed them.
- **Prime sizes and colours are placeholders** (06 / 07 / 09 in palette colours), not the CPS prime coding.
- Progress is saved in the browser only. Nothing is sent anywhere.
- English only. Plaqlings are game characters; the design system has no rule for them yet.
