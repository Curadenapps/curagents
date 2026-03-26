import { defineConfig } from "ruflo";

export default defineConfig({
  agents: [
    {
      id: "curaden-orchestrator",
      file: "agents/orchestrator.md",
      model: "claude-sonnet-4-6",
      role: "orchestrator",
    },
    {
      id: "curaden-notion-sync",
      file: "agents/notion-sync.md",
      model: "claude-sonnet-4-6",
      role: "worker",
      schedule: "50 * * * *",
    },
    {
      id: "bob-truth-catcher",
      file: "agents/truth-catcher.md",
      model: "claude-opus-4-6",       // Opus for alignment enforcement — highest accuracy
      role: "worker",
      schedule: "0 * * * *",
    },
    {
      id: "bob-brand-asset",
      file: "agents/brand-asset.md",
      model: "claude-opus-4-6",       // Opus for approval gate decisions
      role: "worker",
    },
    {
      id: "curaden-asana-maintenance",
      file: "agents/asana-maintenance.md",
      model: "claude-sonnet-4-6",     // Sonnet sufficient for routing/comments
      role: "worker",
    },
    {
      id: "curaden-figma",
      file: "agents/figma.md",
      model: "claude-sonnet-4-6",
      role: "worker",
      schedule: "0 */2 * * *",
    },
    {
      id: "curaden-webflow",
      file: "agents/webflow.md",
      model: "claude-sonnet-4-6",
      role: "worker",
    },
    {
      id: "curaden-github",
      file: "agents/github.md",
      model: "claude-sonnet-4-6",
      role: "worker",
    },
    {
      id: "curaden-release",
      file: "agents/release.md",
      model: "claude-opus-4-6",       // Opus for release coordination — consequential
      role: "worker",
      manualOnly: true,
    },
  ],

  memory: {
    sharedContext: "dream.md",
    cacheDir: ".truth-cache",
    atomicWrites: true,
  },

  routing: {
    strategy: "moe",                  // Mixture of Experts — orchestrator classifies then dispatches
    costOptimisation: true,           // three-tier: Haiku → Sonnet → Opus based on complexity
  },

  env: {
    required: [
      "ANTHROPIC_API_KEY",
      "NOTION_API_KEY",
      "NOTION_ROOT_DATABASE_ID",
      "ASANA_ACCESS_TOKEN",
      "ASANA_PROJECT_GID",
      "FIGMA_API_TOKEN",
      "FIGMA_FILE_KEY",
      "WEBFLOW_API_TOKEN",
      "WEBFLOW_SITE_ID",
    ],
    optional: [
      "ASANA_WEBHOOK_SECRET",
      "WEBFLOW_BRAND_KIT_COLLECTION_ID",
      "WEBFLOW_WHATS_NEW_COLLECTION_ID",
      "DRY_RUN",
    ],
  },

  dryRun: process.env.DRY_RUN === "true",
});
