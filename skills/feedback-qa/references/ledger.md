# Feedback QA — Change Ledger

The ledger is how the agent proves something was already changed, and places
feedback on a timeline. It is built fresh on every run from the sources below,
so nothing is stored locally. The report's "Already addressed" section keeps
the citations.

## 1. Rules

- **No source, no claim.** Every entry has a link someone can open.
- **Dates are what the source says.** Note the date the change happened and the
  date you read it.
- **Planned is not done.** An open Jira issue can support a note like "already
  planned in BOB-51", never "Already addressed".

## 2. Entry

Hold entries in this shape while working, and cite them in the report:

```
LG-3 · 2026-08-14 · release · BOB App iOS 2.4.0 · results-screen
Results screen redesigned to three-panel PBE layout
Source: https://curaden-apps.atlassian.net/browse/BOB-47 (read 2026-09-29)
```

Types: `release` | `fix` | `feature` | `decision` | `uat` | `planned`

## 3. Sources

Only read what the feedback touches (for example, only the areas and dates
that appear in this run's notes).

| Source | What to read | Tool |
|--------|--------------|------|
| App stores | Current version, release date, "What's new" text (URLs in `skills/uat/references/apps.md`) | WebFetch |
| Jira BOB | Issues resolved after the feedback's version or date; open issues for "already planned" | Atlassian MCP |
| GitHub | Releases and tags in the BOB repos of the Curadenapps org | GitHub MCP |
| UAT | `skills/uat/references/uat-log.md` and the Confluence UAT pages under BOB App UAT (`1933795`) | Read, Atlassian MCP |
| Previous QA reports | Confluence UAT feedback summaries; Notion rows with QA = `reported` | Atlassian MCP, Notion MCP |
| Decisions | `dream.md` §5 Decision Log | Read |

## 4. Using it

1. Find entries for the same app and area, dated after the feedback's version
   release date (or after `Captured at` if the version is unknown).
2. A match needs the same behaviour, not just the same screen.
3. Matched: list the point under Already addressed with the version, date and source link.
4. Not matched: nothing to write. The point carries on through the checks.
