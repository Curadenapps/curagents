# Render an HTML report to PDF with a local Edge or Chrome (headless print-to-pdf).
#
#   powershell -File scripts/render-pdf.ps1 <report.html> [out.pdf]
#
# Set CHROME_PATH to use a specific browser.

param(
    [Parameter(Mandatory = $true, Position = 0)][string]$Html,
    [Parameter(Position = 1)][string]$Out
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Html)) { Write-Error "HTML file not found: $Html"; exit 1 }
$source = (Resolve-Path $Html).Path
if (-not $Out) { $Out = [System.IO.Path]::ChangeExtension($source, '.pdf') }
$Out = [System.IO.Path]::GetFullPath($Out)

$browser = @($env:CHROME_PATH,
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Google\Chrome\Application\chrome.exe') | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $browser) { Write-Error 'No Edge or Chrome found; set CHROME_PATH'; exit 1 }

$profileDir = Join-Path $env:TEMP "render-pdf-$PID"
$url = ([System.Uri]$source).AbsoluteUri
$browserArgs = @('--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--no-pdf-header-footer',
    "--user-data-dir=`"$profileDir`"", "--print-to-pdf=`"$Out`"", $url)
$p = Start-Process -FilePath $browser -ArgumentList $browserArgs -Wait -PassThru -WindowStyle Hidden
Remove-Item -Recurse -Force $profileDir -ErrorAction SilentlyContinue
if (-not (Test-Path $Out)) { Write-Error "PDF was not written (browser exit $($p.ExitCode))"; exit 1 }
Write-Host "PDF: $Out"
