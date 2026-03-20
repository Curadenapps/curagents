BOB Brand-Asset Ops & Truth Catcher System

This repository houses the dual-agent orchestration system for Curaden’s BOB App overhaul. It is built on the **"Get Shit Done" (GSD) framework** and utilizes Claude Code subagents to enforce project alignment and maintain automated documentation.

## 🧭 Core Philosophy: The Constitution vs. The Frontier
To prevent scope creep and maintain absolute alignment during the BOB App redesign:
* **Notion is the Constitution:** It holds the immutable strategic requirements and brand guidelines.
* **Asana is the Frontier:** It is the execution layer where feedback, comments, and moving parts happen.
* **This Repository is the Engine:** It bridges the two, enforcing Notion's truth onto Asana's chaos while keeping itself perfectly documented.

---

## 🤖 The Dual-Agent Ecosystem

This repository relies on two distinct Claude Code subagents, each with strictly fenced domains and safety hooks.

### 1. The Truth Catcher (`truth-catcher.md`)
**Role:** Project Alignment Enforcer & Auditor.
**Purpose:** Scans recent Asana activity (comments, tasks) and cross-references it against the authorized Notion requirements. If an Asana request violates the roadmap (e.g., unauthorized scope creep, bypassing legal gates), the agent automatically posts a formalized 🛑 rejection comment on the task.
**Key Mechanisms:**
* Reads from the auto-synced `.truth-cache/`.
* Uses `src/asana/get-recent-activity.ts` to scan the frontier.
* Uses `src/asana/post-verdict.ts` to enforce rules.

### 2. The Docs Agent (`docs-agent.md`)
**Role:** Automated Technical Writer.
**Purpose:** Reads the codebase and maintains the `docs/` directory so API integrations, webhook logic, and operational playbooks are always up to date.
**Key Mechanisms:**
* Reads `src/` to understand API behavior and connector logic.
* Strictly fenced: A deterministic Bash hook (`.claude/hooks/docs-only-writes.sh`) actively blocks this agent from ever writing to or modifying `src/` or config files.

---

## 🏗️ Architecture & Directory Structure

```text
bob-truth-catcher/
├── .claude/
│   ├── agents/
│   │   ├── truth-catcher.md         # The alignment/audit persona
│   │   └── docs-agent.md            # The technical writer persona
│   ├── hooks/
│   │   ├── block-truth-edits.sh     # Protects the Notion cache from manual edits
│   │   └── docs-only-writes.sh      # Fences the docs agent to docs/ only
│   └── settings.json                # Hook registrations
├── .github/
│   └── workflows/
│       ├── 01-sync-constitution.yml # CRON: Notion -> .truth-cache/
│       └── 02-scan-frontier.yml     # CRON: Triggers Truth Catcher Asana audit
├── docs/                            # Managed entirely by the docs-agent
│   ├── architecture.md
│   └── ops-playbook.md
├── src/                             # The "Hands" (API integrations)
│   ├── notion/
│   │   └── sync-truth.ts            
│   └── asana/
│       ├── get-recent-activity.ts   
│       └── post-verdict.ts          
├── .truth-cache/                    # ⚠️ Auto-synced from Notion. DO NOT EDIT.
│   └── active-requirements.md       
├── package.json
└── .env.example
🚀 Setup & Installation
1. Clone and Install

Bash
git clone <repo-url>
cd bob-truth-catcher
npm install
2. Environment Variables
Copy .env.example to .env and populate your credentials. Never commit the .env file.

Code snippet
NOTION_API_KEY=your_secret_here
NOTION_REQUIREMENTS_DB_ID=your_db_id_here
ASANA_ACCESS_TOKEN=your_token_here
ASANA_PROJECT_GID=your_project_id_here
ANTHROPIC_API_KEY=your_claude_key_here
3. Initialize Claude Code
Ensure you have the Claude CLI installed globally:

Bash
npm install -g @anthropic-ai/claude-code
⚙️ Usage & Execution
Running the Truth Catcher (Audit)
The Truth Catcher runs automatically via GitHub Actions (02-scan-frontier.yml). To trigger an audit manually on your local machine:

Bash
claude --agent truth-catcher "Run an alignment audit on the recent Asana activity."
Running the Docs Agent (Documentation)
Whenever you update a script in src/, ask the docs agent to update the documentation:

Bash
claude --agent docs-agent "Review the latest changes in src/asana/ and update the docs/architecture.md and API references accordingly."
Syncing the Constitution
To manually force a refresh of the Notion requirements cache:

Bash
npx tsx src/notion/sync-truth.ts
🛡️ Security & Governance
Least Privilege: Asana tokens must only possess tasks:read and stories:write. Notion tokens must be read-only and explicitly shared only with the specific requirements database.

Deterministic Boundaries: Agent safety relies on standard shell script hooks (in .claude/hooks/), not just LLM prompting.

Audit Trail: All Truth Catcher interventions in Asana are prepended with 🛑 [Truth Catcher Alert] or ✅ [Truth Catcher: Verified] for complete human transparency.

Since you mentioned we're done, I'll step back here. Fantastic work designing this arc
