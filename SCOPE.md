# Scope

Hard boundaries for the Curadenapps Agents system.
The Truth Catcher agent uses this document to evaluate and flag Asana requests against Notion requirements.

---

## In Scope — v1 (Active)

- **Taxonomy & Standards** — Brand asset taxonomy: icons, logos, typography, color, 3D, templates, store assets
- **Single Source of Truth** — One centralized Figma library reference maintained via the Curaden App Hub
- **Task Governance** — Every asset deliverable in Asana has an assigned owner, due window, and acceptance criteria
- **Approval Tracking** — Record who approved, when, and what changed for every asset
- **Pipeline Hygiene** — Asana agent posts standardized update snippets and routes tasks to correct Kanban stages
- **Implementation Readiness** — Export and implementation checklists per asset type
- **Status Reporting** — Weekly Brand Asset Status report with minimal manual intervention
- **Cross-tool Sync** — RevolveNote→GitHub, Jira→Notion (via `curaden-communications` skill); the BOB weekly is part of the Team Update

---

## In Scope — v1 (Extended — Active)

Additional capabilities active with the extended agent roster:

- **Figma Library Monitoring** — `figma` agent polls BOB design system for component/token changes once per weekday (gated on file version change)
- **Design Diff Detection** — Automated alerts when Figma library tokens or components change (previously v2-deferred; now active via `figma` agent)
- **Webflow Publishing Gate** — `webflow` agent validates brand compliance and clinical claims before any asset or content goes live on the website
- **GitHub Code Alignment** — `github` agent links PRs and commits to Jira issues and Asana tasks across the Curadenapps org
- **Release Coordination** — `release` agent compiles release notes, creates Notion changelog, tags GitHub releases (manual trigger only)
- **Notion Cache Sync** — `notion-sync` agent owns `.truth-cache/`, running before every truth-catcher scan
- **Roadmap Watch** — `roadmap-watch` agent compares the Notion BOB and Curated Treatment Plan roadmaps with Asana and Jira every Monday and writes a drift report to Notion (read-only on all systems)
- **Meeting Notes** — `meeting-notes` agent reads a Webex meeting (AI summary, action items, transcript, recording frames when needed) in Webex web via `skills/webex-web`, or pasted text, into a structured Notion recap page
- **Team Update** — `announcements` agent consolidates Webex meeting recaps, Asana, Notion (App Hub), Jira, GitHub and agent reports into a weekly (Thursday) or monthly update; drafted in Notion, posted to the Webex App Team spaces only after Sean approves each draft
- **Boom Boom Derek** — `boom-boom-derek` agent keeps a ledger of what the Phinamic team (Derek La and Khanh by name) owes across Webex, Jira, Confluence, meeting recaps and Sean's "Waiting on Phinamic" tasks, checks it against the Product Roadmap, and updates the Boom Boom Derek Notion page and pings the team in the Webex common chat (QA space) or "Curaden / Phinamic" when something is due or forgotten, autonomously (read-only elsewhere)
- **Webex Sweep** — `webex-sweep` agent checks the watched Webex spaces and new meeting action items twice a weekday and keeps Notion and Asana in step: asks, commitments, decisions and feedback become Notion inbox rows; progress becomes update comments on the matching Asana task; inbox rows Sean approves become Asana tasks. Read-only in Webex
- **Market Rollout** — `market-rollout` agent supports Sean's rollout of BOB (then the Curaprox app) in the USA, Switzerland, UAE, Japan and Italy (Milan launch and pilot first): market status against the Asana gates, onboarding plans and tracker, Admin Console super-user packs (access request drafts, certification), training module drafts from one catalogue, and partner meeting prep and follow-ups. Drafts only: no sending, no account or access changes, no bulk localisation (markets translate), Asana only after Sean approves
- **Feedback QA** — `feedback-qa` agent reads new feedback from the Notion inbox, checks it against a sourced change timeline and BOB scope, and sends a PDF report to the Webex QA space when there is enough to report. Full UATs are also published to Confluence. Asana only when a human promotes an item
- **Campaign support: IDB Challenge (Q1 2027, with Blanca Suarez, Marketing)** — product side is the Phase 1 loop (treatment plan, reminders, Shopify links and discount codes, re-BOB) plus small additions (start-challenge option, 10-day reminder template, two engagement events); promotion through existing agents (`webflow` landing-page gate, `brand-asset` approvals, `announcements`). Roadmap row "IDB Challenge: Q1 2027 campaign with Blanca". Clinical-claims rule applies to every touchpoint

## In Scope — v2 (Deferred)

Any immediate Asana requests for these items are premature scope creep — flag and reject.

- **Bulk Localization** — Safe bulk-creation tooling for localization variants (e.g. App Store screenshots in 15+ languages)
- **GTM Automation** — Email drafts, web kit packaging, channel notifications (except the IDB Challenge campaign support above)

---

## Out of Scope (Hard Non-Goals)

Any request attempting to introduce these is immediately rejected and escalated by the Truth Catcher.

| Non-goal | Rule |
|----------|------|
| Infrastructure replacement | Do not replace or migrate away from Asana, Notion, or Figma. Augment only. |
| Clinical/medical autonomy | Never autonomously approve or generate clinical, efficacy, or medical claims. All such claims require Legal/Compliance human gates. |
| Unapproved publishing | No automated direct publishing to App Store, website, or social media without explicit human approval. |
| Uncontrolled bulk actions | No massive Asana task batches without a dry-run human approval step first. |
