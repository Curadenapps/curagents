#!/usr/bin/env node
// Feedback QA report helper — no dependencies (Node 20+).
//
//   node scripts/qa-report.mjs pdf   <report.html> [out.pdf]
//   node scripts/qa-report.mjs webex <report.pdf> <summary.md>
//
// pdf   renders the HTML with a local Chrome, Edge or Chromium (headless print-to-pdf).
//       Set CHROME_PATH to use a specific browser.
// webex posts the summary with the PDF attached to the QA space below. It is the
//       only space this script will post to. Needs WEBEX_BOT_TOKEN; the bot must be
//       a member of the space. DRY_RUN=true (default) prints instead of posting.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// webexteams://im?space=644fd150-f1e6-11f0-886e-874a9ad69e32
const QA_SPACE_UUID = "644fd150-f1e6-11f0-886e-874a9ad69e32";
const QA_ROOM_ID = Buffer.from(`ciscospark://us/ROOM/${QA_SPACE_UUID}`).toString("base64").replace(/=+$/, "");

const [, , command, ...args] = process.argv;

try {
  if (command === "pdf") await renderPdf(args[0], args[1]);
  else if (command === "webex") await postToWebex(args[0], args[1]);
  else usage();
} catch (err) {
  console.error(`qa-report: ${err.message}`);
  process.exit(1);
}

function usage() {
  console.error("Usage:\n  node scripts/qa-report.mjs pdf <report.html> [out.pdf]\n  node scripts/qa-report.mjs webex <report.pdf> <summary.md>");
  process.exit(2);
}

async function renderPdf(htmlPath, outPath) {
  if (!htmlPath || !existsSync(htmlPath)) throw new Error(`HTML file not found: ${htmlPath}`);
  const input = resolve(htmlPath);
  const output = resolve(outPath || input.replace(/\.html?$/i, "") + ".pdf");
  const browser = findBrowser();

  const flags = [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--print-to-pdf-no-header",
    `--print-to-pdf=${output}`,
  ];
  if (process.platform === "linux" && process.getuid?.() === 0) flags.push("--no-sandbox");

  const run = spawnSync(browser, [...flags, pathToFileURL(input).href], { encoding: "utf8", timeout: 120_000 });
  if (run.error) throw run.error;
  if (!existsSync(output) || statSync(output).size === 0) {
    throw new Error(`browser did not produce a PDF (${browser})\n${run.stderr || ""}`);
  }
  console.log(output);
}

function findBrowser() {
  if (process.env.CHROME_PATH) {
    if (existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
    throw new Error(`CHROME_PATH not found: ${process.env.CHROME_PATH}`);
  }

  const candidates = {
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
    linux: ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge", ...playwrightChromium()],
  }[process.platform] || [];

  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("no Chrome, Edge or Chromium found; set CHROME_PATH");
  return found;
}

function playwrightChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((d) => d.startsWith("chromium-"))
    .map((d) => `${root}/${d}/chrome-linux/chrome`);
}

async function postToWebex(pdfPath, summaryPath) {
  if (!pdfPath || !existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);
  if (!summaryPath || !existsSync(summaryPath)) throw new Error(`summary not found: ${summaryPath}`);
  const markdown = readFileSync(summaryPath, "utf8").trim();
  if (markdown.length > 7000) throw new Error("summary is over 7000 characters; shorten it, the PDF carries the detail");

  if ((process.env.DRY_RUN ?? "true").toLowerCase() !== "false") {
    console.log(`[DRY_RUN] would post to Webex QA space ${QA_SPACE_UUID} with ${basename(pdfPath)}:\n\n${markdown}`);
    return;
  }

  const token = process.env.WEBEX_BOT_TOKEN;
  if (!token) throw new Error("WEBEX_BOT_TOKEN is not set");

  const form = new FormData();
  form.append("roomId", QA_ROOM_ID);
  form.append("markdown", markdown);
  form.append("files", new Blob([readFileSync(pdfPath)], { type: "application/pdf" }), basename(pdfPath));

  const res = await fetch("https://webexapis.com/v1/messages", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Webex ${res.status}: ${body.message || JSON.stringify(body)}`);
  console.log(`Posted to Webex QA space — message ${body.id}`);
}
