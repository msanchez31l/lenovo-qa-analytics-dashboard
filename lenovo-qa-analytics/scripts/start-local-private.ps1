param([string]$ProjectPath='C:\code\lenovo-qa-analytics-dashboard\lenovo-qa-analytics')
$ErrorActionPreference='Stop'
Set-Location $ProjectPath
if (!(Test-Path 'dist/index.html')) { npm run build; if($LASTEXITCODE -ne 0){throw 'Build failed'} }
foreach($key in @('DASHBOARD_PASSWORD_HASH','SESSION_SECRET','REPORT_UPLOAD_TOKEN')){
 if(![Environment]::GetEnvironmentVariable($key)){throw "Missing environment variable: $key"}
}
$env:REPORT_PATH=Join-Path $env:LOCALAPPDATA 'LenovoQAStatusAgent\qa-dashboard-report.json'
$env:DIST_DIR=Join-Path $ProjectPath 'dist'
$env:HOST='127.0.0.1'
$env:PORT='4174'
node scripts/private-server.mjs
