<#
.SYNOPSIS
  Turns a Webex recording (MP4) that Sean downloaded into an audio file Yogurt can take.

.DESCRIPTION
  Yogurt's "Upload a file" takes MP3, M4A or WAV; Webex recordings are MP4 (or ARF from very old
  meetings, which this can't read). This pulls the audio out with ffmpeg as 16 kHz mono M4A, which
  is what Yogurt's speech model uses anyway, so the file is small and nothing is lost.

  Agents never download Webex recordings (skills/webex-web rule). Sean downloads the recording
  himself in Webex, runs this, then uses Upload a file in Yogurt. Yogurt transcribes and writes
  notes on this PC; the meeting-notes agent then reads it through the yogurt MCP server.

.PARAMETER Path
  The downloaded recording (.mp4), or a folder: every .mp4 in it is converted.

.PARAMETER OutDir
  Where the .m4a files go. Default: Downloads\Yogurt uploads.

.EXAMPLE
  .\scripts\webex-recording-to-yogurt.ps1 "$env:USERPROFILE\Downloads\Curaden Phinamic weekly-20261120.mp4"
#>
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$OutDir = (Join-Path $env:USERPROFILE 'Downloads\Yogurt uploads')
)

$ErrorActionPreference = 'Stop'
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) { throw 'ffmpeg is not on PATH. Install it once with: winget install Gyan.FFmpeg' }
if (-not (Test-Path -LiteralPath $Path)) { throw "Not found: $Path" }

$files = if ((Get-Item -LiteralPath $Path).PSIsContainer) {
  Get-ChildItem -LiteralPath $Path -Filter *.mp4 -File
} else { Get-Item -LiteralPath $Path }
if (-not $files) { throw "No .mp4 recordings in $Path" }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
foreach ($f in $files) {
  if ($f.Extension -notin '.mp4', '.m4v', '.mov') { Write-Output "skip (not a video): $($f.Name)"; continue }
  $out = Join-Path $OutDir ($f.BaseName + '.m4a')
  if (Test-Path -LiteralPath $out) { Write-Output "already there: $out"; continue }
  & $ffmpeg.Source -hide_banner -loglevel error -i $f.FullName -vn -ac 1 -ar 16000 -c:a aac -b:a 64k $out
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed on $($f.Name)" }
  Write-Output "ready for Yogurt > Upload a file: $out"
}
