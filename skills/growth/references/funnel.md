# Growth funnel

One funnel for every market. Growth owns G1–G2 and shares G3; from G3 (= K1)
`market-rollout` and the partner take over, and the Launch KPIs page counts K1–K7.

| Step | Counts | Source | Notes |
|------|--------|--------|-------|
| **G1 Reached** | Clinics or DPs who saw BOB in a way we can count: website visits to the BOB pages, event contacts, partner mailing recipients, post impressions | Webflow analytics (`data_analyze_tool`), event lead sheets, partner reports, LinkedIn analytics (Sean reads them out) | Count clinics where possible, not clicks |
| **G2 Registered** | A practice submitted the registration form | BOB Admin practices (pending + approved), on the PC with `bob-admin`; otherwise the Monthly market stats row | The form is the only way in, so this number is reliable |
| **G3 Approved (= K1)** | Approved and at least one trained staff member | BOB Admin; Launch KPIs | Automatic approval (BA-324) will shorten G2 → G3 |
| **G4 First BOB (= K2)** | First finished BOB within 7 days of training | BOB Admin | Growth only watches it; market-rollout acts |

## Working back from the target

Until a market has its own numbers, plan with these starting ratios and replace
them with real ones after the first 60 days. They are estimates, not facts:

- G1 → G2: 5–10% for warm channels (partner's own customers, iTOP alumni, event
  demos), 1–2% for cold channels (posts, website).
- G2 → G3: 70% (some registrations are duplicates, students or out of market).
- G3 → G4: 80% (the K2 target).

Example: K1 target 8 clinics by day 90 → about 12 registrations → about 150 warm
clinics reached (or a mix). Write the sum on the plan so Sean sees where it comes from.

## Weekly pulse (Mondays)

A page "Growth pulse — YYYY-Www" under BOB Growth, under a screen long:

1. **Funnel since last week** per active market: G2 new, G3 new, G4 new (or "no data
   this week" with the reason).
2. **Experiments:** started, ending this week, overdue for a result.
3. **Waiting on Sean:** calendar rows in `Sean review` or `Ready` but not published,
   oldest first.
4. **This week's three actions**, each with an owner and a link.

No changes → no page, a `no-op` run-log row only.

## Monthly review (first Monday of the month)

A page "Growth review — YYYY-MM": funnel per market against the plan and the K1
target; each experiment's result with keep / change / stop and why; which channels
produced registrations and at what effort; the ratios updated from real data; next
month's plan. Feed the Markets section of the monthly team update (`announcements`
reads it).
