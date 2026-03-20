bob-truth-catcher/
├── .claude/
│   ├── agents/
│   │   └── truth-catcher.md        # The core persona and rules we just wrote
│   └── hooks/
│       └── block-truth-edits.sh    # Script preventing the agent from modifying the Notion cache directly
├── .github/
│   └── workflows/
│       ├── 01-sync-constitution.yml # CRON: Pulls Notion requirements daily to update the cache
│       ├── 02-scan-frontier.yml     # CRON/Trigger: Polls Asana for new comments/tasks
│       └── pr-compliance-check.yml  # CI: Ensures code changes don't break the agent schemas
├── docs/
│   ├── architecture.md             # How the Truth Catcher makes decisions
│   └── runbook-escalations.md      # What humans do when the bot flags a critical scope violation
├── src/
│   ├── notion/
│   │   └── fetch-directives.ts     # Logic to pull from Notion API and convert to Markdown
│   ├── asana/
│   │   ├── fetch-activity.ts       # Logic to pull recent comments/tasks from Asana
│   │   └── post-verdict.ts         # Logic to post the ✅ Verified or 🛑 Flagged comments
│   ├── agent/
│   │   ├── build-context.ts        # Injects the Notion Markdown into the LLM prompt
│   │   └── evaluate-alignment.ts   # Calls Anthropic API with the combined context
│   └── schemas/
│       └── alignment-verdict.ts    # Zod/JSON schema forcing the LLM to output a structured verdict
├── .truth-cache/                   # ⚠️ GITIGNORED OR AUTO-COMMITTED VIA BOT
│   ├── primary-directives.md       # The latest downloaded snapshot of Notion Truth
│   └── active-requirements.md      # The latest snapshot of the Notion Roadmap
├── .env.example
├── package.json
└── README.md
