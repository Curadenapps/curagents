#!/usr/bin/env bash
# Headless Claude run for CI with a pinned model, turn cap, tool allowlist and
# Notion MCP. Writes cost and turns to the job summary so spend is visible per run.
# Usage: scripts/run-agent.sh <model> <max-turns> <allowed-tools> <prompt>
set -euo pipefail
model="$1"; max_turns="$2"; allowed="$3"; prompt="$4"

claude -p "$prompt" \
  --model "$model" \
  --max-turns "$max_turns" \
  --allowedTools "$allowed" \
  --mcp-config .github/mcp.ci.json \
  --output-format json > claude-result.json || status=$?

jq -r '.result // empty' claude-result.json || cat claude-result.json
summary=$(jq -r '"| \(env.GITHUB_JOB) | '"$model"' | \(.subtype) | \(.num_turns) | $\(.total_cost_usd) |"' claude-result.json || echo "| $GITHUB_JOB | $model | unparseable output | - | - |")
{
  echo "| Job | Model | Outcome | Turns | Cost |"
  echo "|-----|-------|---------|-------|------|"
  echo "$summary"
} >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
exit "${status:-0}"
