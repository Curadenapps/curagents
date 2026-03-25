# Curaden Communications Automation

## What This Is

A Claude Code skills package that packages Curaden's 3 recurring communication workflows as a single invokable agent skill. The skill covers: pushing RevolveNote app updates to GitHub, syncing BOB project Jira issues to Notion, and broadcasting a weekly BOB project status summary. Any Claude session can trigger these workflows on demand — not just the scheduled tasks on claude.ai.

## Core Value

Any Claude session can run Curaden's 3 cross-tool sync/broadcast workflows with a single trigger phrase, with no manual context-switching between tools.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Claude can trigger RevolveNote weekly sync by saying "run revolvenote sync" or similar
- [ ] RevolveNote sync stages + pushes latest app to `github.com/Curadenapps/revolvenote`
- [ ] Claude can trigger Jira→Notion BOB sync by saying "sync BOB to Notion" or similar
- [ ] Jira-Notion sync queries BOB project issues and creates/updates Notion pages
- [ ] Claude can trigger BOB weekly broadcast by saying "run BOB broadcast" or similar
- [ ] BOB broadcast pulls Jira sprint status and posts formatted summary to Notion
- [ ] All 3 procedures live in a single `curaden-communications` skill folder
- [ ] Skill is committed and pushed to `github.com/Curadenapps/Agents`

### Out of Scope

- Two-way Notion→Jira sync — Jira is source of truth; Notion is read destination
- Automated scheduling via Claude Code — claude.ai handles the schedule; this skill handles on-demand invocation
- Slack/email delivery for broadcasts — Notion page is the broadcast target for now

## Context

**Tech stack involved:**
- RevolveNote: Angular 18 PWA with Firebase backend, deployed to `github.com/Curadenapps/revolvenote` and `github.com/DunneWorks/revolvenote`
- BOB/iTOP: Curaden dental hygiene clinical tool (Plaque-Bleeding-Erythema), project tracked in Jira
- Jira MCP: `mcp__cba144a5-138f-455b-8987-f84b72c3c4e9__*`
- Notion MCP: `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__*`
- GitHub: `gh` CLI available, org is `Curadenapps`

**Existing patterns:**
- `~/.claude/scheduled-tasks/deploy-on-github-request/SKILL.md` — existing deploy skill, same push pattern as RevolveNote sync
- Skills use progressive disclosure: SKILL.md body + `references/` for detailed docs

## Constraints

- **MCP tools**: Jira and Notion MCP tool IDs must be used verbatim in SKILL.md — they don't change across sessions
- **Skill format**: Must follow Claude Code plugin skill spec (YAML frontmatter + markdown body)
- **Repo target**: Skills live in `github.com/Curadenapps/Agents` (this repo)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single skill covers all 3 tasks | User chose "single communication skill" — all 3 are related cross-tool comms | — Pending |
| Notion is broadcast/sync destination | Notion MCP is available; it's Curaden's team wiki | — Pending |
| References files hold detailed JQL/templates | Keeps SKILL.md lean; detail in references/ per skill spec | — Pending |

---
*Last updated: 2026-03-25 after initialization*
