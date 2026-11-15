param([switch]$EnablePublication)
$ErrorActionPreference='Stop'
if (!$EnablePublication) { throw 'Explicit -EnablePublication required after reviewing and approving the public dataset' }
$script=(Resolve-Path (Join-Path $PSScriptRoot 'run-scheduled-pages-publish.ps1')).Path
foreach($time in @('06:15','12:15','18:15')){
 $name='Lenovo QA Pages Publish '+$time.Replace(':','')
 $arg='-NoProfile -ExecutionPolicy Bypass -File "'+$script+'"'
 $action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg
 $trigger=New-ScheduledTaskTrigger -Daily -At $time
 $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
 Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
 Write-Host "Installed: $name"
}
Write-Warning 'Scheduled task identity must have Git credentials, repository access, and QA_PUBLICATION_APPROVED=YES; verify first scheduled run.'
