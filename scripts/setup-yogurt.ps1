# Registers Yogurt's local MCP server (yogurt-mcp.exe) with Claude Code as "yogurt".
# See skills/yogurt/SKILL.md. Run once per PC, after Yogurt is installed and
# Settings > AI apps > "Let AI apps read your meetings" is on.
#   powershell -ExecutionPolicy Bypass -File scripts/setup-yogurt.ps1 [-Path C:\...\yogurt-mcp.exe]
param([string]$Path)

$ErrorActionPreference = 'Stop'

if (-not $Path) {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Yogurt\resources\bin\yogurt-mcp.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\yogurt\resources\bin\yogurt-mcp.exe'),
        (Join-Path $env:ProgramFiles 'Yogurt\resources\bin\yogurt-mcp.exe')
    )
    $Path = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $Path) {
        $found = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Programs') -Filter 'yogurt-mcp.exe' -Recurse -Depth 4 -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { $Path = $found.FullName }
    }
}

if (-not $Path -or -not (Test-Path $Path)) {
    Write-Host 'yogurt-mcp.exe not found. Is Yogurt installed?'
    Write-Host 'Yogurt shows the exact command in Settings > AI apps; pass it with -Path.'
    exit 1
}

if (-not (Test-Path (Join-Path $env:APPDATA 'Yogurt\mcp.pipe'))) {
    Write-Host 'Note: Yogurt has not opened its MCP pipe yet. Open Yogurt once and turn on Settings > AI apps.'
}

Write-Host "Found: $Path"

if (Get-Command claude -ErrorAction SilentlyContinue) {
    $existing = claude mcp list 2>$null | Select-String -Pattern '^yogurt:'
    if ($existing) {
        Write-Host 'Claude Code already has a "yogurt" MCP server:'
        Write-Host $existing
    } else {
        claude mcp add yogurt --scope user -- "$Path"
        Write-Host 'Added "yogurt" to Claude Code (user scope). Restart Claude to load it.'
    }
} else {
    Write-Host 'Claude Code CLI not found; add the server by hand.'
}

Write-Host ''
Write-Host 'Claude desktop app (claude_desktop_config.json > mcpServers), if you use it there too:'
$json = @{ yogurt = @{ command = $Path; args = @() } } | ConvertTo-Json -Depth 3
Write-Host $json
