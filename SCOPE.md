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
- **Cross-tool Sync** — RevolveNote→GitHub, Jira→Notion, BOB weekly broadcast (via `curaden-communications` skill)

---

## In Scope — v1 (Extended — Active)

Additional capabilities active with the extended agent roster:

- **Figma Library Monitoring** — `figma` agent polls BOB design system for component/token changes every 2 hours
- **Design Diff Detection** — Automated alerts when Figma library tokens or components change (previously v2-deferred; now active via `figma` agent)
- **Webflow Publishing Gate** — `webflow` agent validates brand compliance and clinical claims before any asset or content goes live on the website
- **GitHub Code Alignment** — `github` agent links PRs and commits to Jira issues and Asana tasks across the Curadenapps org
- **Release Coordination** — `release` agent compiles release notes, creates Notion changelog, tags GitHub releases (manual trigger only)
- **Notion Cache Sync** — `notion-sync` agent owns `.truth-cache/`, running before every truth-catcher scan

## In Scope — v2 (Deferred)

Any immediate Asana requests for these items are premature scope creep — flag and reject.

- **Bulk Localization** — Safe bulk-creation tooling for localization variants (e.g. App Store screenshots in 15+ languages)
- **GTM Automation** — Email drafts, web kit packaging, channel notifications

---

## Out of Scope (Hard Non-Goals)

Any request attempting to introduce these is immediately rejected and escalated by the Truth Catcher.

| Non-goal | Rule |
|----------|------|
| Infrastructure replacement | Do not replace or migrate away from Asana, Notion, or Figma. Augment only. |
| Clinical/medical autonomy | Never autonomously approve or generate clinical, efficacy, or medical claims. All such claims require Legal/Compliance human gates. |
| Unapproved publishing | No automated direct publishing to App Store, website, or social media without explicit human approval. |
| Uncontrolled bulk actions | No massive Asana task batches without a dry-run human approval step first. |
