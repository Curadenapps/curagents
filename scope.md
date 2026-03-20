# SCOPE: In vs. Out (BOB App Brand Assets System)

**Purpose:** This document strictly defines the boundaries of the BOB App Brand-Asset delivery system. The Truth Catcher agent uses these boundaries to evaluate and flag Asana requests.

---

## 🟢 IN SCOPE: Current Release (v1)
*These items are actively being built and are the primary focus of the current milestone.*

- **Taxonomy & Standards:** Establishing a strict brand asset taxonomy (icons, logos, typography, color, 3D, templates, store assets).
- **Single Source of Truth:** Linking and maintaining one centralized Figma library reference via the Curaden App Hub.
- **Task Governance:** Ensuring every asset deliverable in Asana has an assigned owner, a due window, and strict acceptance criteria.
- **Approval Tracking:** Recording exactly who approved an asset, when it was approved, and what changed.
- **Pipeline Hygiene:** Operating an Asana agent that posts standardized update snippets and deterministically routes tasks to correct Kanban stages.
- **Implementation Readiness:** Generating standard export and implementation checklists for every asset type.
- **Status Reporting:** Automatically publishing a weekly "Brand Asset Status" report with minimal manual intervention.

---

## 🟡 IN SCOPE: Future Release (v2)
*These items are recognized as valid project goals but are deferred. Any immediate requests for these in Asana must be flagged as premature scope creep.*

- **Bulk Localization:** Building safe bulk-creation tooling for localization variants (e.g., generating App Store screenshots across 15+ languages).
- **GTM Automation:** Automating downstream marketing workflows, such as generating email drafts, packaging web kits, and sending channel notifications.
- **Design Diff Detection:** Automated tracking and alerting when Figma library tokens/components change, triggering required downstream updates.

---

## 🔴 OUT OF SCOPE (Strict Non-Goals)
*These items are permanent anti-goals. Any request attempting to introduce these will be immediately rejected and escalated by the Truth Catcher.*

- **Infrastructure Replacement:** We are not replacing or migrating away from Asana, Notion, or Figma. The system augments these tools; it does not replace them.
- **Clinical/Medical Autonomy:** The system and its agents will **never** autonomously approve or generate clinical, medical, or efficacy claims (e.g., "improves gum health"). All such claims require hard Legal/Compliance human gates.
- **Unapproved Publishing:** Automated, direct publishing of assets or copy to public marketing surfaces (App Store, website, social media) without explicit human approval gates.
- **Uncontrolled Bulk Actions:** Allowing the agent to create massive batches of tasks in Asana without a "dry-run" human approval step.
