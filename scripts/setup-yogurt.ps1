<#
.SYNOPSIS
  Connects Yogurt (local meeting recorder, github.com/FrigadeHQ/yogurt) to Claude Code on this PC.

.DESCRIPTION
  Yogurt records the microphone and the call audio of any Webex meeting, call or video chat,
  transcribes and summarises it on this PC, and serves the notes to Claude through its own
  local MCP server (yogurt-mcp.exe). Nothing leaves the PC except what an agent writes to Notion.

  This script:
    1. checks Yogurt is installed (per-user install: %LOCALAPPDATA%\Programs\Yogurt);
    2. registers its MCP helper as the "yogurt" server for Claude Code at user scope,
       so it is there on this PC only (never in the cloud Routines);
    3. prints the two switches Sean turns on once in Yogurt itself.

  It never downloads or installs Yogurt: Sean does that himself (see docs/yogurt.md).

.PARAMETER Check
  Only report what is installed and registered; change nothing.
#>
param([switch]$Check)

$ErrorActionPreference = 'Stop'
$installDir = Join-Path $env:LOCALAPPDATA 'Programs\Yogurt'
$helper     = Join-Path $installDir 'resources\bin\yogurt-mcp.exe'
$profileDir = Join-Path $env:APPDATA 'Yogurt'

function Write-Step($ok, $text) {
  $mark = if ($ok) { '[ok]  ' } else { '[--]  ' }
  Write-Output ($mark + $text)
}

$installed = Test-Path $helper
Write-Step $installed "Yogurt installed ($installDir)"
Write-Step (Test-Path $profileDir) "Yogurt opened at least once (profile $profileDir)"

$webex = @('webex.exe', 'CiscoCollabHost.exe') | Where-Object {
  Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($_)) -ErrorAction SilentlyContinue
}
Write-Step ([bool]$webex) 'Webex desktop app running (Yogurt offers to record when a Webex call starts)'

$claude = Get-Command claude -ErrorAction SilentlyContinue
$registered = $false
if ($claude) {
  $list = & claude mcp list 2>$null | Out-String
  $registered = $list -match '(?m)^yogurt:'
}
Write-Step $registered 'yogurt MCP server registered with Claude Code (user scope)'

if (-not $installed) {
  Write-Output ''
  Write-Output 'Install Yogurt first (Windows x64, free, MIT): https://github.com/FrigadeHQ/yogurt/releases/latest'
  Write-Output 'Open it once and finish setup (it downloads its speech and notes models), then run this script again.'
  exit 1
}

if ($Check) { exit 0 }

if (-not $registered) {
  if ($claude) {
    & claude mcp add --scope user yogurt -- $helper
    Write-Step $true 'Registered yogurt with Claude Code'
  } else {
    Write-Output ''
    Write-Output 'The claude CLI is not on PATH. Add the server by hand to ~/.claude.json under "mcpServers":'
    Write-Output ('  "yogurt": { "type": "stdio", "command": "' + ($helper -replace '\\', '\\') + '", "args": [] }')
  }
}

Write-Output ''
Write-Output 'Once, in Yogurt > Settings:'
Write-Output '  1. Turn on the MCP server for AI apps (reading notes, transcripts and audio).'
Write-Output '  2. Leave "let AI apps make changes" OFF unless you want agents to import Webex transcripts into Yogurt.'
Write-Output 'Then restart the Claude desktop app so it picks the server up.'
