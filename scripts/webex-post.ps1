# Team update poster for the announcements agent (Windows PowerShell 5.1+).
#
#   powershell -File scripts/webex-post.ps1 <message.md> app-team [markets] [-Attach <report.pdf>]
#
# Spaces: app-team, markets. These are the only spaces this script will post to.
# Needs WEBEX_BOT_TOKEN; the bot must be a member of each space.
# DRY_RUN=true (default) prints instead of posting. Set $env:DRY_RUN = 'false' to post.
# Messages over 7000 characters are split at ## / ### headings. The PDF goes
# with the first part.

param(
    [string]$Attach,
    [Parameter(Mandatory = $true, Position = 0)][string]$File,
    [Parameter(Mandatory = $true, Position = 1, ValueFromRemainingArguments = $true)][string[]]$Spaces
)

$ErrorActionPreference = 'Stop'

# Same rooms as scripts/send-webex-update.ps1
$rooms = @{
    'app-team' = 'Y2lzY29zcGFyazovL3VzL1JPT00vNjdiMGNiNTAtZWU4Ny0xMWVmLTljOTMtNWIwMjE3MGI1ODY5'
    'markets'  = 'Y2lzY29zcGFyazovL3VzL1JPT00vMjc3ZTYwNDAtMGVkMi0xMWYwLTgzN2EtYmYxZmMwNjAwM2Nk'
}
$limit = 7000

if (-not (Test-Path $File)) { Write-Error "message file not found: $File"; exit 1 }
if ($Attach -and -not (Test-Path $Attach)) { Write-Error "attachment not found: $Attach"; exit 1 }
$unknown = @($Spaces | Where-Object { -not $rooms.ContainsKey($_) })
if ($unknown.Count -gt 0) { Write-Error "unknown space(s): $($unknown -join ', '); allowed: app-team, markets"; exit 1 }

$markdown = ([System.IO.File]::ReadAllText((Resolve-Path $File), [System.Text.Encoding]::UTF8)).Trim() -replace "`r`n", "`n"

# Split at headings so each message stays under the Webex limit.
$parts = @()
if ($markdown.Length -le $limit) {
    $parts = @($markdown)
} else {
    $current = ''
    foreach ($section in ($markdown -split "`n(?=#{2,3} )")) {
        if ($section.Length -gt $limit) { Write-Error "one section is over $limit characters; shorten it"; exit 1 }
        if ($current -and ($current.Length + $section.Length + 1) -gt $limit) {
            $parts += $current
            $current = $section
        } elseif ($current) {
            $current = "$current`n$section"
        } else {
            $current = $section
        }
    }
    if ($current) { $parts += $current }
}

function Send-Message([string]$roomId, [string]$text, [string]$filePath) {
    Add-Type -AssemblyName System.Net.Http
    $client = New-Object System.Net.Http.HttpClient
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $token)
    $form = New-Object System.Net.Http.MultipartFormDataContent
    $form.Add((New-Object System.Net.Http.StringContent($roomId, [System.Text.Encoding]::UTF8)), 'roomId')
    $form.Add((New-Object System.Net.Http.StringContent($text, [System.Text.Encoding]::UTF8)), 'markdown')
    if ($filePath) {
        $bytes = New-Object System.Net.Http.ByteArrayContent(, [System.IO.File]::ReadAllBytes($filePath))
        $bytes.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/pdf')
        $form.Add($bytes, 'files', (Split-Path $filePath -Leaf))
    }
    $res = $client.PostAsync('https://webexapis.com/v1/messages', $form).Result
    $body = $res.Content.ReadAsStringAsync().Result
    $client.Dispose()
    if (-not $res.IsSuccessStatusCode) { throw "Webex $([int]$res.StatusCode): $body" }
    return ($body | ConvertFrom-Json).id
}

$dryRun = -not ($env:DRY_RUN -and $env:DRY_RUN.ToLower() -eq 'false')
$token = $env:WEBEX_BOT_TOKEN
if (-not $dryRun -and -not $token) { Write-Error 'WEBEX_BOT_TOKEN is not set'; exit 1 }

foreach ($space in $Spaces) {
    for ($i = 0; $i -lt $parts.Count; $i++) {
        $label = if ($parts.Count -gt 1) { " (part $($i + 1)/$($parts.Count))" } else { '' }
        $file = if ($Attach -and $i -eq 0) { (Resolve-Path $Attach).Path } else { $null }
        if ($dryRun) {
            $with = if ($file) { " with $(Split-Path $file -Leaf)" } else { '' }
            Write-Host "[DRY_RUN] would post to $space$label$with, $($parts[$i].Length) chars:`n`n$($parts[$i])`n"
            continue
        }
        $id = Send-Message $rooms[$space] $parts[$i] $file
        Write-Host "Posted to $space$label - message $id"
    }
}
