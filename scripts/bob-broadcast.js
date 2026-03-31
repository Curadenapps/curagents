#!/usr/bin/env node

const NOTION_TOKEN = process.env.NOTION_API_KEY;
const PARENT_PAGE_ID = process.env.NOTION_BROADCAST_PARENT_ID || "3347e8aabbb480908aa2dfc2fd478ff9";
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL || "https://curaden.atlassian.net/rest/api/3";
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "BOB";
const ASANA_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const ASANA_PROJECT_GID = process.env.ASANA_PROJECT_GID || "1204489225205419";

const today = new Date().toISOString().split('T')[0];

async function queryJira(jql) {
  const url = `${JIRA_BASE_URL}/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=key,summary,status,priority,assignee`;
  console.log(`Jira API URL: ${url}`);
  const response = await fetch(url, {
    headers: {
      "Authorization": `Basic ${Buffer.from(JIRA_EMAIL + ":" + JIRA_TOKEN).toString('base64')}`,
      "Accept": "application/json"
    }
  });
  const data = await response.json();
  console.log(`Jira response status: ${response.status}`);
  if (data.errorMessages) {
    console.log("Jira errors:", JSON.stringify(data.errorMessages, null, 2));
  }
  return data.issues || [];
}

async function queryAsana(sectionName) {
  const tasksUrl = `https://app.asana.com/api/1.0/projects/${ASANA_PROJECT_GID}/tasks?opt_fields=name,assignee.name,completed,due_on,notes&limit=50`;
  console.log(`Asana API URL: ${tasksUrl}`);
  const response = await fetch(tasksUrl, {
    headers: {
      "Authorization": `Bearer ${ASANA_TOKEN}`,
      "Accept": "application/json"
    }
  });
  const data = await response.json();
  console.log(`Asana response status: ${response.status}`);
  console.log(`Asana tasks count: ${data.data?.length || 0}`);
  if (data.data?.length > 0) {
    console.log("Sample Asana task:", JSON.stringify(data.data[0], null, 2));
  }
  if (data.errors) {
    console.log("Asana errors:", JSON.stringify(data.errors, null, 2));
  }
  return data.data || [];
}

async function createNotionPage(title, children) {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      parent: { page_id: PARENT_PAGE_ID },
      properties: {
        title: {
          title: [{ text: { content: title } }]
        }
      },
      children: children
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${error}`);
  }
  
  return await response.json();
}

function heading2Block(text) {
  return {
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: text } }]
    }
  };
}

function paragraphBlock(text) {
  return {
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: text } }]
    }
  };
}

function dividerBlock() {
  return { type: "divider", divider: {} };
}

function formatJiraIssue(issue) {
  const key = issue.key;
  const summary = issue.fields.summary;
  const priority = issue.fields.priority?.name || "";
  const assignee = issue.fields.assignee?.displayName || "Unassigned";
  return { key, summary, priority, assignee, source: "Jira" };
}

function formatAsanaTask(task) {
  const name = task.name;
  const assignee = task.assignee?.name || "Unassigned";
  const due = task.due_on || "";
  return { key: "Asana", summary: name, assignee, due, source: "Asana" };
}

async function main() {
  console.log("BOB Weekly Broadcast starting...\n");
  
  if (!NOTION_TOKEN) {
    console.error("ERROR: NOTION_API_KEY not set");
    process.exit(1);
  }
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log("Fetching data from Jira and Asana...");
  
  let doneIssues = [];
  let inProgressIssues = [];
  let blockers = [];
  
  // Fetch Jira data if configured
  if (JIRA_TOKEN && JIRA_EMAIL) {
    try {
      console.log(`Querying Jira project: ${JIRA_PROJECT_KEY}`);
      const jiraResults = await Promise.all([
        queryJira(`project = ${JIRA_PROJECT_KEY} AND statusCategory = Done AND updated >= "${sevenDaysAgo}" ORDER BY updated DESC`),
        queryJira(`project = ${JIRA_PROJECT_KEY} AND statusCategory != Done ORDER BY updated DESC`),
        queryJira(`project = ${JIRA_PROJECT_KEY} AND (labels = "blocked" OR priority in ("Highest", "High")) ORDER BY priority DESC`)
      ]);
      doneIssues = jiraResults[0].map(formatJiraIssue);
      inProgressIssues = jiraResults[1].map(formatJiraIssue);
      blockers = jiraResults[2].map(formatJiraIssue);
      console.log(`Jira - Done: ${doneIssues.length}, In Progress: ${inProgressIssues.length}, Blockers: ${blockers.length}`);
    } catch (e) {
      console.log(`Jira error: ${e.message}`);
    }
  }
  
  // Fetch Asana data if configured
  if (ASANA_TOKEN && ASANA_PROJECT_GID) {
    try {
      const allTasks = await queryAsana();
      const completedTasks = allTasks.filter(t => t.completed);
      const pendingTasks = allTasks.filter(t => !t.completed);
      
      // Add Asana tasks to the lists
      const asanaDone = completedTasks.map(formatAsanaTask);
      const asanaInProgress = pendingTasks.map(formatAsanaTask);
      
      doneIssues = [...doneIssues, ...asanaDone];
      inProgressIssues = [...inProgressIssues, ...asanaInProgress];
      
      console.log(`Asana - Done: ${asanaDone.length}, In Progress: ${asanaInProgress.length}`);
    } catch (e) {
      console.log(`Asana error: ${e.message}`);
    }
  }
  
  console.log(`Total - Done: ${doneIssues.length}, In Progress: ${inProgressIssues.length}, Blockers: ${blockers.length}`);
  
  const blocks = [
    paragraphBlock(`Generated: ${today}`),
    dividerBlock()
  ];
  
  blocks.push(heading2Block("Done This Week"));
  if (doneIssues.length === 0) {
    blocks.push(paragraphBlock("None this week."));
  } else {
    doneIssues.forEach(item => {
      let text = `${item.summary}`;
      if (item.source === "Jira") text = `${item.key} — ${item.summary}`;
      if (item.assignee) text += ` (${item.assignee})`;
      blocks.push(paragraphBlock(text));
    });
  }
  blocks.push(dividerBlock());
  
  blocks.push(heading2Block("In Progress"));
  if (inProgressIssues.length === 0) {
    blocks.push(paragraphBlock("None this week."));
  } else {
    inProgressIssues.forEach(item => {
      let text = `${item.summary}`;
      if (item.source === "Jira") text = `${item.key} — ${item.summary}`;
      if (item.assignee) text += ` (${item.assignee})`;
      if (item.due) text += ` Due: ${item.due}`;
      blocks.push(paragraphBlock(text));
    });
  }
  blocks.push(dividerBlock());
  
  blocks.push(heading2Block("Blockers / Watch"));
  if (blockers.length === 0) {
    blocks.push(paragraphBlock("None this week."));
  } else {
    blockers.forEach(item => {
      let text = `${item.key} — ${item.summary}`;
      if (item.priority) text += ` ⚠️ ${item.priority}`;
      blocks.push(paragraphBlock(text));
    });
  }
  blocks.push(dividerBlock());
  
  const title = `BOB Weekly Broadcast — ${today}`;
  console.log(`Creating Notion page: ${title}...`);
  
  const page = await createNotionPage(title, blocks);
  
  console.log("\n✅ Broadcast created successfully!");
  console.log(`📄 Page URL: ${page.url}`);
  console.log(`\nSummary: ${doneIssues.length} done, ${inProgressIssues.length} in progress, ${blockers.length} blockers`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
