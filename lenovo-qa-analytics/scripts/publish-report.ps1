param([Parameter(Mandatory=$true)][string]$ServerUrl,[string]$ReportPath=(Join-Path $env:LOCALAPPDATA 'LenovoQAStatusAgent\qa-dashboard-report.json'))
$ErrorActionPreference='Stop'
if (!(Test-Path $ReportPath)) { throw "Report missing: $ReportPath" }
if (!$env:REPORT_UPLOAD_TOKEN) { throw 'REPORT_UPLOAD_TOKEN environment variable is missing' }
if (!$ServerUrl.StartsWith('https://')) { throw 'Publishing requires HTTPS' }
Invoke-RestMethod -Method Post -Uri ($ServerUrl.TrimEnd('/')+'/api/publish') -Headers @{Authorization=('Bearer '+$env:REPORT_UPLOAD_TOKEN)} -ContentType 'application/json' -InFile $ReportPath
