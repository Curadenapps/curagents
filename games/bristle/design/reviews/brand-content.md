# BRISTLE v2: brand and content review

Reviewer: brand and content lead, CURAPROX. Scope: `design/PLAN-v2.md` §5, `src/game/npc/defs.ts`, `server/personas.mjs`, `src/ui/panels.ts`, `DESIGN.md`, plus the client direction (clean, don't harm; educational, sneakily; products help). **[verify]** marks product facts I am not sure of. Every learning line and "In real life" line goes to Legal/Compliance before any public build (SCOPE.md).

## 1. Verdict

The frame is on-brand: "gentle is strong" and "the right tool for every gap" are the brand's own story, and turning each product into a verb teaches what it is for without preaching. Still to fix: combat is written as violence (kill, damage, slain, "her children"), and a few mappings and lines imply product benefits: the soothing rinse, fountains that "mend enamel", firm or sharp bristles, "smaller Prime crits harder". Ship it with the cleaning vocabulary, the human-written learning moments below, real names behind one approved name map, an AI voice that never names products or gives advice, and the Daily Tide only as an opt-in, cosmetic feature stored on the device.

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
| **Hydrosonic** (Pro / Easy **[verify]**) | Rhythm auto-strokes | Good | Keep; don't imply it "does the work for you". |
| **Tongue cleaner** (CTC 203 **[verify]**) | Clears "coated-tongue terrain" | Partly | Clears **Fuzz** on the Tongue Plains, revealing paths: teaches that the tongue gets cleaned too. |
| **Kids' lines** (CS kids, CS baby **[verify]**) | Gentle-mode helper | Good | "Little Bristle" charm, never framed as the lesser choice. |

**When game benefits start to sound like real claims.** These are the risks, and the fix for each:
- No real-world units or results on item cards: no "% of Film removed", no "3x cleaner", no "kills germs".
- Write trade-offs, not rankings, between real products.
- Keep game stats in game words: power, reach, timing.
- A generic statement of what a tool category is for ("interdental brushes are made for the spaces between teeth") is fine after review. A brand plus a result ("CPS removes plaque between teeth") is a claim: never.
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
| defs.ts Derek | "swing first. Apologise later" | Violence | "Sweep first. It will thank you later." |
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
| "Film swept" count | keep "swept" or "cleared" |
| boss time to kill | time to calm |

Cleared Plaqlings wave, pop into bubbles and drift off happy. Bosses end calmed, rinsed loose and smiling.

**"In real life" lines.**
- Written by people and approved by brand plus Legal per market, with an approval ID. Never AI-generated.
- Only identity and description: name, type, verified features.
- No benefit verbs: prevents, protects, removes, whitens, strengthens, soothes, heals, fights, freshens.
- No results, conditions, comparisons or "recommended by".
- No prices, links, codes or "ask your parents". Legal to check the EU rule against direct exhortation of children to buy.
- Off by default; a toggle in settings shows them.

**AI-voiced NPCs must never:**
- name or describe real products, prices or where to buy them (Pip's AI sells only for shine);
- give health or technique advice. Even the learning moments in §4 are written lines only;
- mention symptoms, pain, decay, blood, dentists or bad breath;
- comment on the player's real mouth or habits, or know the Daily Tide state;
- judge looks or mention competitors;
- use violent words.

Engineering asks:
- Add these to the `sanitizeReply` block list: white*, sensitiv*, bleed*, bacteria, germ*, decay, caries, breath, protect*, strengthen*, remineral*, kill*, slay*, slain, %, and the mapped product names.
- Log blocked replies for review.
- Retitle Derek "keeper of the fountain": a real job title invites real advice.

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

No learning line names a product or promises a result. Product cards show the tool's in-game purpose; the habit lives in the world.

**Daily Tide: keep, reshaped as the Tide Bell.** You ring a bell at the hub morning and evening if you have done your own routine.
- Opt-in, off by default, on trust.
- Cosmetic rewards only (a chime, a sparkle on the handle, a greeting from Pip). Never Crown points or power.
- No streaks, losses, reminders or "you missed one".
- Wording: "Done your real-life routine? Ring the bell!"
- GDPR: two booleans for today in the local save. No history, timestamps, analytics or account, and never sent to the AI voice. Brushing logs tied to a person could count as health data; keeping this on the device means we process none.

## 5. Proposed Pip catalogue (claim-free)

Price bands in shine: S 40-90, M 120-250, L 300-500. Names are placeholders until the name map is approved.

| Name (placeholder) | Slot | In-game benefit (what it teaches) | Band | Unlock |
|---|---|---|---|---|
| CS 5460 brush | Brush | Balanced 3-stroke combo | starter | Owned |
| Velvet brush **[verify]** | Brush | Timing window +50%, power -15% | M | After the Gumline boss |
| Compact brush **[verify]** | Brush | 25% faster strokes; reaches molar alcoves | M | Narrows |
| Ortho brush **[verify]** | Brush | Cleans along bracket rails, rides them | M | Sugar Wastes |
| Prime S / M / L **[verify codes, colours]** | Prime | Full clean-through on matching Gaps | S/S/M | Narrows, Pip, Sugar Wastes |
| Single tuft **[verify]** | Single tuft | Reaches behind armour seams and last towers | M | Derek drill |
| Enzycal-style paste **[verify]** | Paste | Steady foam, cheapest throw | S | Start |
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

**Charming:**
- Plaqlings as giggly guests who leave happy.
- Pip's honest-salesman patter and Derek's dry wit.
- Gap puns ("Mind the gaps, I live in them").
- Sugar as playful chaos, not evil.
- Mother Calculus as stubborn and, in the end, relieved.

**Off-brand:**
- Gross-out: slime, rot, breath, blood.
- Fear: drills, pain, lost teeth, scary dentists.
- Shaming the player, kids, braces, gaps or crooked teeth.
- Looks jokes (white = pretty).
- Force jokes ("scrub harder").
- Moralising about sweets.
- Digs at other brands.
- Any violence.

If a joke needs a real tooth to land, cut it.
