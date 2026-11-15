param(
 [string]$ReportPath=(Join-Path $env:LOCALAPPDATA 'LenovoQAStatusAgent\qa-dashboard-report.json'),
 [string]$ProjectPath=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference='Stop'
if (!(Test-Path $ReportPath)) { throw "Missing source report: $ReportPath" }
$destination=Join-Path $ProjectPath 'public\data\approved-report.json'
$sanitizer=Join-Path $ProjectPath 'scripts\sanitize-public-report.mjs'
$test=Join-Path $ProjectPath 'scripts\sanitize-public-report.test.mjs'
node --test $test
if ($LASTEXITCODE -ne 0) { throw 'Sanitizer tests failed; no publication' }
$temporary=Join-Path $env:TEMP ('qa-public-'+[guid]::NewGuid().ToString('N')+'.json')
try {
 node $sanitizer $ReportPath $temporary
 if ($LASTEXITCODE -ne 0) { throw 'Sanitization failed; no publication' }
 $data=Get-Content -LiteralPath $temporary -Raw | ConvertFrom-Json
 $age=[datetime]::UtcNow - [datetime]::Parse($data.capturedAt).ToUniversalTime()
 if ($age.TotalMinutes -lt -10 -or $age.TotalMinutes -gt 90) { throw "Report is stale or future-dated: $($data.capturedAt)" }
 New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
 Copy-Item -LiteralPath $temporary -Destination $destination -Force
 Write-Host "Prepared approved public dataset at $destination. NOT published."
} finally { Remove-Item $temporary -ErrorAction SilentlyContinue }
