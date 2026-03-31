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

function getWeekBounds() {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  return { now, nextWeek };
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

function richText(content, annotations = {}) {
  return {
    type: "text",
    text: { content },
    annotations
  };
}

function paragraphBlock(richTextArray) {
  return {
    type: "paragraph",
    paragraph: { rich_text: richTextArray }
  };
}

function heading2Block(content) {
  return {
    type: "heading_2",
    heading_2: { rich_text: [richText(content, { bold: true })] }
  };
}

function dividerBlock() {
  return { type: "divider", divider: {} };
}

function underlineText(content) {
  return richText(content, { underline: true });
}

async function main() {
  console.log("BOB Weekly Broadcast starting...\n");
  
  if (!NOTION_TOKEN) {
    console.error("ERROR: NOTION_API_KEY not set");
    process.exit(1);
  }
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { nextWeek } = getWeekBounds();
  
  let jiraDone = [], jiraInProgress = [], jiraBlockers = [];
  let asanaTasks = [];
  
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
      asanaTasks = await queryAsana();
      asanaTasks = asanaTasks.filter(t => !t.completed);
      console.log(`Asana - Tasks: ${asanaTasks.length}`);
    } catch (e) {
      console.log(`Asana error: ${e.message}`);
    }
  }
  
  // Categorize Asana tasks
  const asanaDone = [];
  const asanaNextWeek = [];
  const asanaDelayed = [];
  
  asanaTasks.forEach(task => {
    if (task.due_on) {
      const dueDate = new Date(task.due_on);
      if (dueDate < today) {
        asanaDelayed.push(task);
      } else if (dueDate <= nextWeek) {
        asanaNextWeek.push(task);
      } else {
        asanaDone.push(task);
      }
    } else {
      asanaDone.push(task);
    }
  });
  
  // Sort by due date
  const sortByDue = (a, b) => {
    if (!a.due_on) return 1;
    if (!b.due_on) return -1;
    return new Date(a.due_on) - new Date(b.due_on);
  };
  asanaDelayed.sort(sortByDue);
  asanaNextWeek.sort(sortByDue);
  asanaDone.sort(sortByDue);
  
  // Build Notion page blocks
  const blocks = [];
  
  // Header
  blocks.push(paragraphBlock([richText(`📅 BOB Weekly Update - ${dateStr}`, { bold: true })]));
  blocks.push(paragraphBlock([richText('━━━━━━━━━━━━━━━━━━', {})]));
  
  // Technical - Jira (In Progress)
  if (jiraInProgress.length > 0) {
    blocks.push(paragraphBlock([richText('🔧 Technical · Jira', { bold: true })]));
    jiraInProgress.forEach(issue => {
      const key = issue.key;
      const summary = issue.fields.summary;
      const status = issue.fields.status?.name || 'In Progress';
      blocks.push(paragraphBlock([
        richText(`• ${key} - ${summary} | `, { bold: true }),
        richText(status, {})
      ]));
    });
  }
  
  // Business - Asana
  if (asanaTasks.length > 0) {
    blocks.push(paragraphBlock([richText('📋 Business · Asana', { bold: true })]));
    
    // Delayed
    if (asanaDelayed.length > 0) {
      asanaDelayed.forEach(task => {
        const due = formatDate(new Date(task.due_on));
        blocks.push(paragraphBlock([
          richText(`• ${task.name} | `, { bold: true }),
          underlineText(`(due ${due})`)
        ]));
      });
    }
    
    // Next week
    if (asanaNextWeek.length > 0) {
      asanaNextWeek.forEach(task => {
        const due = formatDate(new Date(task.due_on));
        blocks.push(paragraphBlock([
          richText(`• ${task.name} | `, { bold: true }),
          richText(`(due ${due})`, {})
        ]));
      });
    }
    
    // Future/No due date
    if (asanaDone.length > 0) {
      asanaDone.forEach(task => {
        blocks.push(paragraphBlock([
          richText(`• ${task.name}`, { bold: true })
        ]));
      });
    }
  }
  
  blocks.push(paragraphBlock([richText('━━━━━━━━━━━━━━━━━━', {})]));
  
  const title = `BOB Weekly Update - ${dateStr}`;
  console.log(`Creating Notion page: ${title}...`);
  
  const page = await createNotionPage(title, blocks);
  
  console.log("\n✅ Broadcast created successfully!");
  console.log(`📄 Page URL: ${page.url}`);
  console.log(`\nJira: ${jiraDone.length} done, ${jiraInProgress.length} in progress`);
  console.log(`Asana: ${asanaDelayed.length} delayed, ${asanaNextWeek.length} next week, ${asanaDone.length} future`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
