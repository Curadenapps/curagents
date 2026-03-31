#!/usr/bin/env node

const NOTION_TOKEN = process.env.NOTION_API_KEY;
const PARENT_PAGE_ID = process.env.NOTION_BROADCAST_PARENT_ID || "3347e8aabbb480908aa2dfc2fd478ff9";
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL || "https://curaden-apps.atlassian.net/rest/api/3";
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "BA";
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
  console.log(`Jira URL: ${url.replace(JIRA_TOKEN, '***TOKEN***')}`);
  const response = await fetch(url, {
    headers: {
      "Authorization": `Basic ${Buffer.from(JIRA_EMAIL + ":" + JIRA_TOKEN).toString('base64')}`,
      "Accept": "application/json"
    }
  });
  console.log(`Jira response status: ${response.status}`);
  const data = await response.json();
  if (data.errorMessages) {
    console.log(`Jira error: ${JSON.stringify(data.errorMessages)}`);
  }
  console.log(`Jira result: total=${data.total}, issues=${data.issues?.length || 0}`);
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
  
  if (JIRA_TOKEN && JIRA_EMAIL) {
    console.log(`Jira: email=${JIRA_EMAIL}, project=${JIRA_PROJECT_KEY}`);
    try {
      console.log(`Jira: Fetching...`);
      // Debug: fetch all BA issues
      const debugAll = await queryJira(`project = ${JIRA_PROJECT_KEY} ORDER BY updated DESC`);
      console.log(`Debug - All BA issues: ${debugAll.length}`);
      if (debugAll.length > 0) {
        console.log(`Sample keys: ${debugAll.slice(0,5).map(i => i.key).join(', ')}`);
      }
      const [done, inProgress, blockers] = await Promise.all([
        queryJira(`project = ${JIRA_PROJECT_KEY} AND statusCategory = Done AND updated >= "${sevenDaysAgo}" ORDER BY updated DESC`),
        queryJira(`project = ${JIRA_PROJECT_KEY} AND statusCategory != Done ORDER BY updated DESC`),
        queryJira(`project = ${JIRA_PROJECT_KEY} AND (labels = "blocked" OR priority in ("Highest", "High")) ORDER BY priority DESC`)
      ]);
      jiraDone = done;
      jiraInProgress = inProgress;
      jiraBlockers = blockers;
      console.log(`Jira - Done: ${jiraDone.length}, In Progress: ${jiraInProgress.length}, Blockers: ${jiraBlockers.length}`);
    } catch (e) {
      console.log(`Jira error: ${e.message}`);
    }
  } else {
    console.log("Jira: Skipping (token or email missing)");
    console.log(`  JIRA_EMAIL: ${JIRA_EMAIL ? "set" : "MISSING"}`);
    console.log(`  JIRA_TOKEN: ${JIRA_TOKEN ? "set" : "MISSING"}`);
    console.log(`  JIRA_PROJECT_KEY: ${JIRA_PROJECT_KEY || "MISSING"}`);
  }
  
  if (ASANA_TOKEN && ASANA_PROJECT_GID) {
    console.log(`Asana: project=${ASANA_PROJECT_GID}`);
    try {
      asanaTasks = await queryAsana();
      asanaTasks = asanaTasks.filter(t => !t.completed);
      console.log(`Asana - Tasks: ${asanaTasks.length}`);
    } catch (e) {
      console.log(`Asana error: ${e.message}`);
    }
  } else {
    console.log("Asana: Skipping (token or project GID missing)");
    console.log(`  ASANA_TOKEN: ${ASANA_TOKEN ? "set" : "MISSING"}`);
    console.log(`  ASANA_PROJECT_GID: ${ASANA_PROJECT_GID || "MISSING"}`);
  }
  
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
  
  const sortByDue = (a, b) => {
    if (!a.due_on) return 1;
    if (!b.due_on) return -1;
    return new Date(a.due_on) - new Date(b.due_on);
  };
  asanaDelayed.sort(sortByDue);
  asanaNextWeek.sort(sortByDue);
  asanaDone.sort(sortByDue);
  
  const blocks = [];
  
  blocks.push(paragraphBlock([richText(`📅 BOB Weekly Update - ${dateStr}`, { bold: true })]));
  blocks.push(paragraphBlock([richText('━━━━━━━━━━━━━━━━━━', {})]));
  
  if (jiraInProgress.length > 0 || jiraDone.length > 0) {
    blocks.push(heading2Block('🔧 Technical · Jira'));
    
    if (jiraBlockers.length > 0) {
      blocks.push(paragraphBlock([richText('Blocked:', { italic: true })]));
      jiraBlockers.forEach(issue => {
        const key = issue.key;
        const summary = issue.fields.summary;
        const priority = issue.fields.priority?.name || '';
        blocks.push(paragraphBlock([
          richText(`• ${key} - ${summary} | `, { bold: true }),
          underlineText(priority || 'Blocked')
        ]));
      });
      blocks.push(paragraphBlock([richText('')]));
    }
    
    if (jiraInProgress.length > 0) {
      blocks.push(paragraphBlock([richText('Next Week:', { italic: true })]));
      jiraInProgress.forEach(issue => {
        const key = issue.key;
        const summary = issue.fields.summary;
        const status = issue.fields.status?.name || 'In Progress';
        blocks.push(paragraphBlock([
          richText(`• ${key} - ${summary} | `, { bold: true }),
          richText(status, {})
        ]));
      });
      blocks.push(paragraphBlock([richText('')]));
    }
    
    if (jiraDone.length > 0) {
      blocks.push(paragraphBlock([richText('Done This Week:', { italic: true })]));
      jiraDone.forEach(issue => {
        const key = issue.key;
        const summary = issue.fields.summary;
        blocks.push(paragraphBlock([
          richText(`• ${key} - ${summary}`, { bold: true })
        ]));
      });
    }
    blocks.push(dividerBlock());
  }
  
  if (asanaTasks.length > 0) {
    blocks.push(heading2Block('📋 Business · Asana'));
    
    if (asanaDelayed.length > 0) {
      blocks.push(paragraphBlock([richText('Overdue:', { italic: true })]));
      asanaDelayed.forEach(task => {
        const due = formatDate(new Date(task.due_on));
        blocks.push(paragraphBlock([
          richText(`• ${task.name} | `, { bold: true }),
          underlineText(`(due ${due})`)
        ]));
      });
      blocks.push(paragraphBlock([richText('')]));
    }
    
    if (asanaNextWeek.length > 0) {
      blocks.push(paragraphBlock([richText('Next Week:', { italic: true })]));
      asanaNextWeek.forEach(task => {
        const due = formatDate(new Date(task.due_on));
        blocks.push(paragraphBlock([
          richText(`• ${task.name} | `, { bold: true }),
          richText(`(due ${due})`, {})
        ]));
      });
      blocks.push(paragraphBlock([richText('')]));
    }
    
    if (asanaDone.length > 0) {
      blocks.push(paragraphBlock([richText('Upcoming:', { italic: true })]));
      asanaDone.forEach(task => {
        blocks.push(paragraphBlock([
          richText(`• ${task.name}`, { bold: true })
        ]));
      });
    }
    blocks.push(dividerBlock());
  }
  
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
