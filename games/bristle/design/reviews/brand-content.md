# BRISTLE v2: brand and content review

Brand and content lead, CURAPROX. Covers PLAN-v2 §5, NPC lines, the AI prompt, UI copy and the client direction (clean, don't harm; educational, sneakily; products help). **[verify]** = product fact to check with the brand team. Every learning and "In real life" line goes to Legal/Compliance before any public build (SCOPE.md).

## 1. Verdict

The frame is on-brand: "gentle is strong" and "the right tool for every gap" are our own story, and products as verbs teach without preaching. To fix: combat copy reads as violence (kill, damage, "her children"), and a few lines imply product benefits (soothing rinse, fountains that "mend enamel", firm bristles, "smaller Primes crit harder"). Ship it with a cleaning vocabulary, human-written learning moments, real names behind one approved name map, an AI voice that never names products or advises, and the Daily Tide as an opt-in, on-device, cosmetic feature.

## 2. Product-to-gameplay map (each tool teaches its purpose)

| Product (public, neutral) | Plan mapping | Verdict | Mapping that teaches |
|---|---|---|---|
| **CS 5460**: ultra-soft manual brush named for its 5,460 filaments **[verify wording]** | Balanced starter | Good | Keep. Lighter strokes clean more in-game; no force words. |
| **Softer, denser lines** (velvet CS 12460, supersoft CS 3960 **[verify]**) | Wider timing window, less power | Good | Frame as a trade-off ("more forgiving"), never "cleans better". |
| **Compact head** (CS smart **[verify]**) | Faster, shorter reach | Good | Reaches the back-molar alcoves the standard head can't. |
| **Ortho** (CS 5460 ortho, channel head **[verify]**) | Bonus vs "braces enemies" | **No**: kids with braces play | Bracket rails are friendly structures; the ortho brush cleans along and around them and rides them. |
| **Implant / angled** (CS 708 implant **[verify]**) | Not mapped | n/a | Charm: corner strokes around ledges. No implant lore. |
| **CPS prime interdental**, sizes colour-coded (CPS 06 to 011 **[verify codes, colours]**) | Small crits harder, large hits wider | **Partly** | **Fit, not strength**: each Gap has a size; matching Prime = full clean-through, mismatch = half. Teaches "right size per gap" without ranking sizes. |
| **Single tuft** (CS 1006 / 1009 single **[verify]**) | Lance for tight spots | Good | Reaches spots the big brush can't: behind the last tower, around brackets. |
| **Enzycal** paste (1450 / 950 / zero **[verify]**) | Steady foam | Good | Keep. Never tie "fluor" (the magic resource) to fluoride content. |
| **Be You** paste, flavour/colour variants **[verify names]** | Flavours as elements | Good | Element follows colour, not flavour properties. |
| **Black charcoal paste** (Black is White **[verify]**) | Heavy, big splash | Good mechanically | Never boosts Shine, Gleam or any "brighten" effect; avoid "white" wording: reads as whitening. |
| **Mouthwash** (Perio Plus, chlorhexidine **[verify]**) | Rinse wave; soothing rinse "heals, calms inflammation" | **No** | Rinse stays a generic, unbranded spell that reaches everywhere. Therapeutic rinses stay out. |
| **Hydrosonic** (Pro / Easy **[verify]**) | Rhythm auto-strokes | Good | Keep; never "does the work for you". |
| **Tongue cleaner** (CTC 203 **[verify]**) | Clears "coated-tongue terrain" | Partly | Clears **Fuzz** on the Tongue Plains, revealing paths: teaches that the tongue gets cleaned too. |
| **Kids' lines** (CS kids, CS baby **[verify]**) | Gentle-mode helper | Good | "Little Bristle" charm, never the lesser choice. |

**When game benefits read as real claims:**
- No real-world results on cards ("% of Film removed", "3x cleaner", "kills germs"); game stats stay in game words (power, reach, timing).
- Trade-offs, not rankings, between real products.
- What a tool category is for ("interdental brushes are made for the spaces between teeth") is fine after review; brand plus result ("CPS removes plaque between teeth") is a claim: never.
- Never restate a game effect as a product property.

## 3. Claims, safety and "clean, don't harm" audit

| Source | Line | Problem | Rewrite |
|---|---|---|---|
| Plan §5.1 | Rinse "heals, calms inflammation" | Therapeutic | "Calm Tide: settles Flare grime, restores one crown point." |
| Plan §3.1, §4.1; panels.ts | "gum (inflammation) enemies", "Inflammation mastery" | Real condition | Status **Flare**: "scrubbing riles up Flare grime". |
| Plan §3.2 | Smaller Primes crit harder | Ranks real sizes | Fit mechanic (§2). |
| defs.ts Derek | "it mends your enamel" | Remineralisation claim | "it mends your crown." |
| personas.mjs | "rinse fountains (they mend…)" | Same | "fountains (they restore and remember you)". |
| defs.ts Derek | "Hold it like you mean it." | Force | "Hold it lightly. It knows the way." |
| defs.ts Edge | "hits harder"; "Sharp! Well. Firm." | Firm/sharp contradicts brand | **Filament Bloom**: "More filaments, finer tips. More cleaning power." Pip: "Never firm! Just more of them." |
| defs.ts Warden | "swept… of her children"; "fewer come back" | Violence, death | "You have cleared {n} of her Film to stand here." / "Some turned back. Your brush is gentler than theirs." |
| personas.mjs | "has been defeated" | Slaying | "has been rinsed loose and calmed". |
| panels.ts | "Defeated", "Bestiary/beasts" | Slaying, monsters | "Calmed"; tab **Film Guide**. |

**Cleaning vocabulary** (UI, copy, AI prompt; internal code ids can stay):

| Instead of | Use |
|---|---|
| kill, slay, defeat | clear, lift, rinse away, calm (bosses) |
| damage, hit, crit | cleaning power, stroke, clean-through |
| enemies, foes, beasts | Film, grime, Plaqlings, guests |
| stagger, launch | loosen, lift |
| death, you fell | knocked back to the fountain |
| blade, slash | brush, stroke |

Cleared Plaqlings pop into bubbles and drift off happy; bosses end calmed and smiling.

**"In real life" lines:**
- Human-written, approved by brand plus Legal per market, with an approval ID; never AI-generated.
- Name, type and verified features only. No benefit verbs (prevents, protects, removes, whitens, strengthens, soothes, heals, freshens), results, conditions, comparisons or "recommended by".
- No prices, links, codes or "ask your parents" (Legal: EU rule against direct exhortation of children to buy).
- Off by default; a settings toggle shows them.

**AI-voiced NPCs must never:** name or describe real products, prices or shops (Pip's AI sells only for shine); give health or technique advice (§4 learning moments are written lines only); mention symptoms, pain, decay, blood, dentists or breath; comment on the player's real mouth or habits, or see Daily Tide state; judge looks; mention competitors; use violent words.

Engineering asks: add white*, sensitiv*, bleed*, bacteria, germ*, decay, caries, breath, protect*, strengthen*, remineral*, kill*, slay*, slain, % and the mapped product names to `sanitizeReply`; log blocked replies for review; retitle Derek "keeper of the fountain" (a real job title invites real advice).

## 4. Habits: learning moments and the Daily Tide

The habits are the mechanics that win. Every line is written by people and flagged **[compliance review]**.

| Habit | Where | Safe wording |
|---|---|---|
| Gentle pressure | Combat: scrubbing loses power; Derek drill | "Light hands, clean strokes. Pressing harder only riles the Film." |
| Small strokes | Clean-stroke rhythm; Velvet cusp | "Small and steady beats big and wild." |
| Gumline angle | Gumline Hollows: Film hides at the pink edge, angled strokes reach it | Lore stone: "The Order cleaned where tower meets valley, brush tilted toward the pink." |
| Right interdental size | Prime fit mechanic; Pip card | "Every gap has its own size. Find the one that fits." |
| Two minutes, twice a day | Hourglass fountains (2-min Gleam challenge); Derek's dawn/dusk line | "The Order kept the dawn and dusk watches, two turns of the glass each." |
| Sugar feeds plaque | Sugar Wastes: Plaqlings grow near sugar crystals | Lore stone: "Where sugar lingers, the Film grows fat." |
| Tartar needs a professional | Calculus Deep: you can't lift old tartar alone; Derek calls in the Order's Polishers | Warden: "Hardened tartar is beyond one knight's brush. That is what the Polishers are for." (**highest review priority**: implies a visit to the dentist) |
| Tongue cleaning | Tongue Plains Fuzz | Card: "The tongue needs tending too." |

No learning line names a product or promises a result.

**Daily Tide: keep, as the Tide Bell.** Ring a hub bell morning and evening if you did your own routine.
- Opt-in, off by default, on trust. Cosmetic rewards only (chime, handle sparkle, Pip greeting), never power.
- No streaks, losses, reminders or "you missed one".
- Wording: "Done your real-life routine? Ring the bell!"
- GDPR: two booleans for today in the local save; no history, timestamps, analytics or account; never sent to the AI. A brushing log tied to a person could be health data; on-device, we process none.

## 5. Proposed Pip catalogue (claim-free)

Shine bands: S 40-90, M 120-250, L 300-500. Names are placeholders.

| Name (placeholder) | Slot | In-game benefit (what it teaches) | Band | Unlock |
|---|---|---|---|---|
| CS 5460 brush | Brush | Balanced 3-stroke combo | starter | Owned |
| Velvet brush **[verify]** | Brush | Timing window +50%, power -15% | M | After the Gumline boss |
| Compact brush **[verify]** | Brush | 25% faster strokes; reaches molar alcoves | M | Narrows |
| Ortho brush **[verify]** | Brush | Cleans along bracket rails, rides them | M | Sugar Wastes |
| Prime S / M / L **[verify codes, colours]** | Prime | Full clean-through on matching Gaps | S/S/M | Narrows, Pip, Sugar Wastes |
| Single tuft **[verify]** | Single tuft | Reaches behind armour seams and last towers | M | Derek drill |
| Enzycal-style paste **[verify]** | Paste | Steady foam, cheapest | S | Start |
| Be You colour A/B/C **[verify]** | Paste | Slow / bounce / spread foam | M each | One per world |
| Black paste **[verify]** | Paste | Heavy, big splash | L | Calculus Deep |
| Calm Tide | Rinse | Settles Flare grime, +1 crown point | M | First boss |
| Hydrosonic **[verify]** | Sonic | 4 s of rhythm strokes | L | World 2 boss |
| Tongue cleaner **[verify]** | Charm | Clears Fuzz, opens paths | S | Tongue Plains |
| Angled brush **[verify]** | Charm | Corner strokes | M | Palate Heights secret |
| Travel case | Charm | +1 Kit Deck slot | L | 10 lost filaments |
| Little Bristle | Charm | Bigger timing ring, helper buddy | S | Always |
| Filament Bloom I/II | Upgrade | +cleaning power | M/L | Pip |
| Enamel Shard | Upgrade | +1 crown point | S/L | Pip, unbranded |
| Colourways | Cosmetic | Handle colour | S | Pip **[verify palette]** |

## 6. Tone notes

**Charming:** Plaqlings as giggly guests who leave happy; Pip's honest patter; Derek's dry wit; gap puns ("Mind the gaps, I live in them"); sugar as playful chaos; Mother Calculus stubborn, then relieved.

**Off-brand:** gross-out (slime, rot, breath, blood); fear (drills, pain, lost teeth, scary dentists); shaming players, braces, gaps or crooked teeth; looks jokes (white = pretty); force jokes ("scrub harder"); moralising about sweets; digs at other brands; any violence. If a joke needs a real tooth to land, cut it.
