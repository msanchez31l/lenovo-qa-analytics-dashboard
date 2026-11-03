# Start the private dashboard on this PC (not GitHub Pages).
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$report=Join-Path $env:LOCALAPPDATA 'LenovoQAStatusAgent\qa-dashboard-report.json'
if (!(Test-Path $report)) { Write-Warning "No Jira report yet. Run the scheduled task or the agent first." }
Push-Location $project
try {
 npm install --no-audit --no-fund
 if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
 npm run build
 if ($LASTEXITCODE -ne 0) { throw "Dashboard build failed" }
 $env:QA_REPORT_PATH=$report
 node .\scripts\local-dashboard-server.mjs
} finally { Pop-Location }
