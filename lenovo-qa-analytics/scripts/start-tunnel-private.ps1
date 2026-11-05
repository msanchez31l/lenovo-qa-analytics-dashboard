param(
 [Parameter(Mandatory=$true)][string]$PublicHostname,
 [string]$ProjectPath='C:\code\lenovo-qa-analytics-dashboard\lenovo-qa-analytics'
)
$ErrorActionPreference='Stop'
if ($PublicHostname -notmatch '^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$' -or $PublicHostname -notmatch '\.') { throw 'Specify a valid hostname such as dashboard.example.com (without https://)' }
foreach ($key in @('DASHBOARD_PASSWORD_HASH','SESSION_SECRET','REPORT_UPLOAD_TOKEN')) {
 if (![Environment]::GetEnvironmentVariable($key)) { throw "Missing environment variable: $key" }
}
if (!(Test-Path (Join-Path $ProjectPath 'dist\index.html'))) { throw 'Build the frontend first: npm run build' }
$env:REPORT_PATH=Join-Path $env:LOCALAPPDATA 'LenovoQAStatusAgent\qa-dashboard-report.json'
if (!(Test-Path $env:REPORT_PATH)) { throw "Real Jira report not found: $env:REPORT_PATH" }
$env:DIST_DIR=Join-Path $ProjectPath 'dist'
$env:HOST='127.0.0.1'
$env:PORT='4174'
$env:NODE_ENV='production'
$env:TRUST_HTTPS_PROXY='true'
$env:PUBLIC_HOST=$PublicHostname.ToLowerInvariant()
$env:PUBLIC_ORIGIN='https://'+$PublicHostname.ToLowerInvariant()
Set-Location $ProjectPath
Write-Host "Serving the private dashboard on 127.0.0.1:4174 for https://$PublicHostname"
Write-Warning 'Run only behind an approved HTTPS tunnel. Do not expose port 4174 publicly.'
node scripts/private-server.mjs
