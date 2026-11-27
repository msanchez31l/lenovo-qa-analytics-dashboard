# Update existing Windows tasks without replacing the production runner.
$ErrorActionPreference = 'Stop'
$runner = Join-Path $env:LOCALAPPDATA 'LenovoQAStatusAgent\run-agent.ps1'
if (!(Test-Path $runner)) { throw 'Production runner missing' }
$command = Get-Command $runner
if (!$command.Parameters.ContainsKey('Silent')) { throw 'Production runner does not support -Silent' }
$tasks = @(Get-ScheduledTask | Where-Object { $_.TaskName -match '^Lenovo QA Jira Refresh (0600|0800|1000|1200|1400|1600|1800)$' })
if ($tasks.Count -ne 7) { throw "Expected seven refresh tasks; found $($tasks.Count)" }
foreach ($task in $tasks) {
 if ($task.Actions.Count -ne 1 -or $task.Actions[0].Arguments -notmatch 'run-agent\.ps1' -or $task.State -eq 'Running') { throw "Unexpected or running task: $($task.TaskName)" }
}
$template = $tasks | Where-Object TaskName -eq 'Lenovo QA Jira Refresh 1800'
$dailyName = 'Lenovo QA Daily Teams Report 2000'
$existing = Get-ScheduledTask -TaskName $dailyName -ErrorAction SilentlyContinue
if ($existing -and $existing.State -eq 'Running') { throw 'Daily report is running' }
$backup = Join-Path $env:LOCALAPPDATA ('LenovoQAStatusAgent\scheduler-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
foreach ($task in @($tasks) + @($existing | Where-Object { $_ })) {
 Export-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath | Set-Content (Join-Path $backup ($task.TaskName + '.xml')) -Encoding Unicode
}
function Copy-Action($old, [string]$arguments) {
 $action = New-ScheduledTaskAction -Execute $old.Execute -Argument $arguments
 if ($old.WorkingDirectory) { $action.WorkingDirectory = $old.WorkingDirectory }
 return $action
}
$dailyAction = Copy-Action $template.Actions[0] ($template.Actions[0].Arguments -replace '\s+-Silent\b','')
foreach ($task in $tasks) {
 $old = $task.Actions[0]
 $arguments = $old.Arguments
 if ($arguments -notmatch '\s-Silent\b') { $arguments += ' -Silent' }
 Set-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath -Action (Copy-Action $old $arguments) | Out-Null
}
Register-ScheduledTask -TaskName $dailyName -Action $dailyAction -Trigger (New-ScheduledTaskTrigger -Daily -At '20:00') -Settings $template.Settings -Principal $template.Principal -Description 'Single daily consolidated QA Teams report' -Force | Out-Null
Get-ScheduledTask | Where-Object { $_.TaskName -match '^Lenovo QA (Jira Refresh|Daily Teams Report)' } | ForEach-Object {
 [PSCustomObject]@{Task=$_.TaskName; Silent=($_.Actions[0].Arguments -match '\s-Silent\b'); State=$_.State; NextRun=($_ | Get-ScheduledTaskInfo).NextRunTime}
} | Format-Table -AutoSize
Write-Host "Backup: $backup"
Write-Host 'Configuration applied. No reports sent by this installer.'
