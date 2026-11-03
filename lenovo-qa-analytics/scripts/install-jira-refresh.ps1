# Schedule private Jira reporting agent on Windows (LOCAL PC only)
# Run: .\install-jira-refresh.ps1 -AgentPath "C:\code\lenovo-qa-status-agent"
param([Parameter(Mandatory=$true)][string]$AgentPath)
$ErrorActionPreference = 'Stop'
$agent = (Resolve-Path $AgentPath).Path
if (!(Test-Path (Join-Path $agent 'package.json'))) { throw "Agent package.json missing" }
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$runner = Join-Path $env:LOCALAPPDATA 'LenovoQAStatusAgent\run-agent.cmd'
New-Item -ItemType Directory -Force -Path (Split-Path $runner) | Out-Null
$cmd = '@echo off' + [Environment]::NewLine + 'cd /d "' + $agent + '"' + [Environment]::NewLine + '"' + $npm + '" run report'
[IO.File]::WriteAllText($runner,$cmd)
foreach ($time in @('06:00','12:00','18:00')) {
 $trigger = New-ScheduledTaskTrigger -Daily -At $time
 $action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c ""' + $runner + '""')
 $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
 Register-ScheduledTask -TaskName ("Lenovo QA Jira Refresh " + $time) -Action $action -Trigger $trigger -Settings $settings -Description 'Run private Jira QA reporting agent locally' -Force | Out-Null
 Write-Host "Scheduled $time"
}
Write-Host "The PC must be on, with a valid Jira SSO session. No private data is published to GitHub Pages."
