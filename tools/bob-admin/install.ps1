<#
.SYNOPSIS
  Install (or update) the bob-admin and bob-qa CLIs for the current Windows user.

.DESCRIPTION
  Creates a private Python environment in %USERPROFILE%\.bob-admin\venv,
  installs bob-admin (and bob-qa, the BOB web app QA CLI) into it, and puts
  bob-admin.cmd and bob-qa.cmd in
  %USERPROFILE%\.bob-admin\bin. Run it again any time to update.

  From a curagents checkout it installs that checkout. Anywhere else (or with
  -FromGitHub) it installs the latest version from the curagents repository.

.PARAMETER AddToPath
  Also add %USERPROFILE%\.bob-admin\bin to your user PATH, so "bob-admin"
  works in every new terminal. Without it, the script prints the line to use.

.PARAMETER FromGitHub
  Install from GitHub even when run inside a checkout.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\tools\bob-admin\install.ps1 -AddToPath
#>
param(
    [switch]$AddToPath,
    [switch]$FromGitHub
)
$ErrorActionPreference = "Stop"

$Repo    = "git+https://github.com/Curadenapps/curagents.git#subdirectory=tools/bob-admin/agent-harness"
$Home2   = Join-Path $env:USERPROFILE ".bob-admin"
$Venv    = Join-Path $Home2 "venv"
$Bin     = Join-Path $Home2 "bin"
$Local   = Join-Path $PSScriptRoot "agent-harness"

# 1. Python 3.10+
$py = $null
foreach ($cand in @("py", "python", "python3")) {
    if (Get-Command $cand -ErrorAction SilentlyContinue) { $py = $cand; break }
}
if (-not $py) { throw "Python 3.10 or newer is needed. Install it from https://www.python.org/downloads/ and run this again." }
$ver = & $py -c "import sys; print('%d.%d' % sys.version_info[:2])"
if ([version]$ver -lt [version]"3.10") { throw "Python $ver found; bob-admin needs 3.10 or newer." }

# 2. Private environment
New-Item -ItemType Directory -Force -Path $Home2, $Bin | Out-Null
if (-not (Test-Path (Join-Path $Venv "Scripts\python.exe"))) {
    Write-Host "Creating environment in $Venv"
    & $py -m venv $Venv
}
$vpy = Join-Path $Venv "Scripts\python.exe"
& $vpy -m pip install --quiet --upgrade pip

# 3. Install bob-admin
if ((Test-Path (Join-Path $Local "setup.py")) -and -not $FromGitHub) {
    Write-Host "Installing bob-admin from this checkout ($Local)"
    & $vpy -m pip install --quiet --upgrade $Local
} else {
    Write-Host "Installing bob-admin from GitHub (Curadenapps/curagents)"
    & $vpy -m pip install --quiet --upgrade $Repo
}

# 4. Shim on a stable path
$exe = Join-Path $Venv "Scripts\bob-admin.exe"
Set-Content -Path (Join-Path $Bin "bob-admin.cmd") -Encoding ascii -Value "@echo off`r`n`"$exe`" %*"
# bob-qa (BOB web app QA) ships in the same package
$qaExe = Join-Path $Venv "Scripts\bob-qa.exe"
Set-Content -Path (Join-Path $Bin "bob-qa.cmd") -Encoding ascii -Value "@echo off`r`n`"$qaExe`" %*"

# 5. PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$onPath = $userPath -and ($userPath.Split(";") -contains $Bin)
if ($AddToPath -and -not $onPath) {
    $newPath = if ($userPath) { "$($userPath.TrimEnd(';'));$Bin" } else { $Bin }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added $Bin to your user PATH. Open a new terminal to use 'bob-admin'."
} elseif (-not $onPath) {
    Write-Host ""
    Write-Host "To use 'bob-admin' in this terminal now:"
    Write-Host "  Set-Alias bob-admin `"$(Join-Path $Bin 'bob-admin.cmd')`""
    Write-Host "Or run this script again with -AddToPath for every new terminal."
}

& $exe --help | Select-Object -First 3
Write-Host ""
Write-Host "Done. Next: bob-admin auth login   (test)   or   bob-admin --env prod auth login"
Write-Host "BOB web app QA: bob-qa auth login   (your coach login on test), then: bob-qa qa run smoke"
