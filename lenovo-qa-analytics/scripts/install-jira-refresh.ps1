# Install 3 daily local QA Jira reporting jobs. Does not publish corporate data.
# Example: .\install-jira-refresh.ps1 -AgentPath "C:\code\lenovo-qa-status-agent"
param([Parameter(Mandatory=$true)][string]$AgentPath)
$ErrorActionPreference='Stop'
$agent=(Resolve-Path $AgentPath).Path
if (!(Test-Path (Join-Path $agent 'package.json'))) { throw "Agent package.json missing" }
$npm=(Get-Command npm.cmd -ErrorAction Stop).Source
$node=(Get-Command node.exe -ErrorAction Stop).Source
$normalize=Join-Path $PSScriptRoot 'normalize-agent-report.mjs'
$private=Join-Path $env:LOCALAPPDATA 'LenovoQAStatusAgent'
New-Item -ItemType Directory -Force -Path $private | Out-Null
$runner=Join-Path $private 'run-agent.ps1'
$runnerContent=@'
param([string]$Agent,[string]$Npm,[string]$Node,[string]$Normalizer,[string]$Private)
$ErrorActionPreference='Stop'
Set-Location $Agent
& $Npm run report
if ($LASTEXITCODE -ne 0) { throw "Jira agent failed. Private dashboard retains last good snapshot." }
$latest=Get-ChildItem -Path (Join-Path $Agent 'reports') -Filter 'status-*.json' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (!$latest) { throw "No agent status JSON output found" }
$target=Join-Path $Private 'qa-dashboard-report.json'
$temp=$target+'.tmp'
& $Node $Normalizer $latest.FullName $temp
if ($LASTEXITCODE -ne 0) { throw "JSON normalization failed" }
Move-Item -Force $temp $target
'@
Set-Content -Path $runner -Value $runnerContent -Encoding UTF8
$argument='-NoProfile -ExecutionPolicy Bypass -File "'+$runner+'" -Agent "'+$agent+'" -Npm "'+$npm+'" -Node "'+$node+'" -Normalizer "'+$normalize+'" -Private "'+$private+'"'
foreach($time in @('06:00','12:00','18:00')){
 $action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument
 $trigger=New-ScheduledTaskTrigger -Daily -At $time
 $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 45)
 Register-ScheduledTask -TaskName ("Lenovo QA Jira Refresh "+$time) -Action $action -Trigger $trigger -Settings $settings -Description 'Private Jira QA status report and local dashboard JSON' -Force | Out-Null
 Write-Host "Registered $time"
}
Write-Host "Report destination: $private\qa-dashboard-report.json"
Write-Host "Test manually: & powershell.exe $argument"
