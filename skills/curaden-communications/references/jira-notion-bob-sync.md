# Jira-Notion BOB Sync — Reference

Details for Procedure 2 of `curaden-communications`.

## Jira Project

| Field | Value |
|-------|-------|
| Project key | `BOB` (confirm via `mcp__cba144a5-138f-455b-8987-f84b72c3c4e9__getVisibleJiraProjects` if unsure) |
| Issue types to sync | Story, Bug, Task, Sub-task |
| Statuses to include | All except Done/Resolved/Closed (open issues only) |

## JQL Queries

### Primary sync query (all open BOB issues):
```
project = BA AND statusCategory != Done ORDER BY priority DESC, updated DESC
```

### If the project key is uncertain, discover it first:
Use `mcp__cba144a5-138f-455b-8987-f84b72c3c4e9__getVisibleJiraProjects` and look for the BOB or iTOP project.

### Narrower query (current sprint only):
```
project = BA AND sprint in openSprints() AND statusCategory != Done ORDER BY priority DESC
```

## Jira → Notion Field Mapping

| Jira field | Notion property name | Notion type | Notes |
|------------|---------------------|-------------|-------|
| `issue.key` | `Jira Key` | Title or Rich Text | e.g. BOB-42 — use as page title |
| `issue.fields.summary` | `Summary` | Rich Text | Full issue title |
| `issue.fields.status.name` | `Status` | Select | Map Jira status → Notion select option |
| `issue.fields.priority.name` | `Priority` | Select | Highest, High, Medium, Low, Lowest |
| `issue.fields.assignee.displayName` | `Assignee` | Rich Text | May be null — handle gracefully |
| `issue.fields.issuetype.name` | `Issue Type` | Select | Story, Bug, Task, Sub-task |
| `issue.fields.updated` | `Last Updated` | Date | ISO 8601 from Jira |

## Notion Database

The Notion database for BOB issues should be located by searching for "BOB" or "BOB Issues" in Notion.

To discover the database ID on first run:
```
Use mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-search with query "BOB Issues"
```

Look for a result of type `database`. Save the `id` for subsequent operations.

If no database exists yet, create one using `mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-create-database` with the field schema from the mapping table above.

## Page Matching Logic

To find an existing Notion page for a Jira issue:

```
Use mcp__58bd2daa-0ddc-4a1b-943b-fea8681cc8c6__notion-search with query "{ISSUE_KEY}"
e.g. query "BOB-42"
```

Filter results to pages within the BOB database. Match on title containing the issue key.

- If match found → update using `notion-update-page`
- If no match → create using `notion-create-pages`

## Status Mapping

Map Jira statuses to Notion select options:

| Jira status | Notion status |
|-------------|---------------|
| To Do | Backlog |
| In Progress | In Progress |
| In Review | In Review |
| Blocked | Blocked |
| Done | Done |
| Closed | Done |
| Resolved | Done |

## Error Handling

- If an assignee is null in Jira, leave the Notion Assignee field blank — do not error
- If a Notion page update returns a 404, treat as "not found" and create instead
- If more than 50 issues are returned by JQL, paginate (use `startAt` parameter in JQL tool)
- Log any per-issue errors but continue syncing remaining issues
