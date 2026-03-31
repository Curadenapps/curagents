#!/usr/bin/env node

const NOTION_TOKEN = process.env.NOTION_API_KEY;
const PARENT_PAGE_ID = process.env.NOTION_BROADCAST_PARENT_ID || "3347e8aabbb480908aa2dfc2fd478ff9";
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL || "https://curaden.atlassian.net/rest/api/3";
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "BOB";
const ASANA_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const ASANA_PROJECT_GID = process.env.ASANA_PROJECT_GID || "1204489225205419";

const today = new Date();
const dateStr = today.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

function formatDate(date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

async function queryJira(jql) {
  const url = `${JIRA_BASE_URL}/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=key,summary,status,priority,assignee`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Basic ${Buffer.from(JIRA_EMAIL + ":" + JIRA_TOKEN).toString('base64')}`,
      "Accept": "application/json"
    }
  });
  const data = await response.json();
  return data.issues || [];
}

async function queryAsana() {
  const tasksUrl = `https://app.asana.com/api/1.0/projects/${ASANA_PROJECT_GID}/tasks?opt_fields=name,assignee.name,completed,due_on&limit=100`;
  const response = await fetch(tasksUrl, {
    headers: {
      "Authorization": `Bearer ${ASANA_TOKEN}`,
      "Accept": "application/json"
    }
  });
  const data = await response.json();
  return data.data || [];
}

async function createNotionPage(title, blocks) {
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
      children: blocks
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${error}`);
  }
  
  return await response.json();
}

function textBlock(content, bold = false) {
  return {
    type: "paragraph",
    paragraph: {
      rich_text: [{
        type: "text",
        text: { content },
        ...(bold ? { annotations: { bold: true } } : {})
      }]
    }
  };
}

function emojiLine(emoji, text) {
  return {
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: `${emoji} ${text}` } }]
    }
  };
}

function dividerLine() {
  return { type: "divider", divider: {} };
}

async function main() {
  console.log("BOB Weekly Broadcast starting...\n");
  
  if (!NOTION_TOKEN) {
    console.error("ERROR: NOTION_API_KEY not set");
    process.exit(1);
  }
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  let jiraDone = [], jiraInProgress = [], jiraBlockers = [];
  let asanaInProgress = [];
  
  // Fetch Jira
  if (JIRA_TOKEN && JIRA_EMAIL) {
    try {
      const [done, inProgress, blockers] = await Promise.all([
        queryJira(`project = ${JIRA_PROJECT_KEY} AND statusCategory = Done AND updated >= "${sevenDaysAgo}" ORDER BY updated DESC`),
        queryJira(`project = ${JIRA_PROJECT_KEY} AND statusCategory != Done ORDER BY updated DESC LIMIT 20`),
        queryJira(`project = ${JIRA_PROJECT_KEY} AND (labels = "blocked" OR priority in ("Highest", "High")) ORDER BY priority DESC`)
      ]);
      jiraDone = done;
      jiraInProgress = inProgress;
      jiraBlockers = blockers;
      console.log(`Jira - Done: ${jiraDone.length}, In Progress: ${jiraInProgress.length}, Blockers: ${jiraBlockers.length}`);
    } catch (e) {
      console.log(`Jira error: ${e.message}`);
    }
  }
  
  // Fetch Asana
  if (ASANA_TOKEN && ASANA_PROJECT_GID) {
    try {
      const allTasks = await queryAsana();
      asanaInProgress = allTasks.filter(t => !t.completed);
      console.log(`Asana - In Progress: ${asanaInProgress.length}`);
    } catch (e) {
      console.log(`Asana error: ${e.message}`);
    }
  }
  
  // Build Notion page blocks
  const blocks = [];
  
  // Header
  blocks.push(emojiLine("📅", `BOB Weekly Update - ${dateStr}`));
  blocks.push(dividerLine());
  
  // Technical - Jira
  if (jiraInProgress.length > 0) {
    blocks.push(emojiLine("🔧", `Technical · Jira`));
    jiraInProgress.forEach(issue => {
      const key = issue.key;
      const summary = issue.fields.summary;
      blocks.push(textBlock(`• ${key} - ${summary}`));
    });
    blocks.push(dividerLine());
  }
  
  // Business - Asana
  if (asanaInProgress.length > 0) {
    blocks.push(emojiLine("📋", `Business · Asana`));
    // Sort by due date
    asanaInProgress.sort((a, b) => {
      if (!a.due_on) return 1;
      if (!b.due_on) return -1;
      return new Date(a.due_on) - new Date(b.due_on);
    });
    asanaInProgress.forEach(task => {
      const name = task.name;
      const due = task.due_on ? ` (due ${formatDate(new Date(task.due_on))})` : '';
      blocks.push(textBlock(`• ${name}${due}`));
    });
    blocks.push(dividerLine());
  }
  
  // Blockers
  if (jiraBlockers.length > 0) {
    blocks.push(emojiLine("⚠️", `Blockers`));
    jiraBlockers.forEach(issue => {
      const key = issue.key;
      const summary = issue.fields.summary;
      const priority = issue.fields.priority?.name || '';
      blocks.push(textBlock(`• ${key} - ${summary} ${priority ? `(${priority})` : ''}`));
    });
    blocks.push(dividerLine());
  }
  
  // Done this week
  if (jiraDone.length > 0) {
    blocks.push(emojiLine("✅", `Completed This Week`));
    jiraDone.forEach(issue => {
      const key = issue.key;
      const summary = issue.fields.summary;
      blocks.push(textBlock(`• ${key} - ${summary}`));
    });
  }
  
  const title = `BOB Weekly Update - ${dateStr}`;
  console.log(`Creating Notion page: ${title}...`);
  
  const page = await createNotionPage(title, blocks);
  
  console.log("\n✅ Broadcast created successfully!");
  console.log(`📄 Page URL: ${page.url}`);
  console.log(`\nJira: ${jiraDone.length} done, ${jiraInProgress.length} in progress`);
  console.log(`Asana: ${asanaInProgress.length} tasks`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
