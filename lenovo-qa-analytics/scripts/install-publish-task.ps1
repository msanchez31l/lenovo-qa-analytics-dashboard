param(
 [Parameter(Mandatory=$true)][string]$ServerUrl,
 [string]$ScriptsPath=$PSScriptRoot
)
$ErrorActionPreference='Stop'
if (!$ServerUrl.StartsWith('https://')) { throw 'HTTPS URL required' }
$script=(Resolve-Path (Join-Path $ScriptsPath 'publish-report.ps1')).Path
foreach($time in @('06:15','12:15','18:15')){
 $name='Lenovo QA Dashboard Publish '+$time.Replace(':','')
 $arg='-NoProfile -ExecutionPolicy Bypass -File "'+$script+'" -ServerUrl "'+$ServerUrl+'"'
 $action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg
 $trigger=New-ScheduledTaskTrigger -Daily -At $time
 $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
 Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Force -ErrorAction Stop | Out-Null
 Write-Host "Installed: $name"
}
Write-Warning 'The scheduled task user must have REPORT_UPLOAD_TOKEN in its environment. Test one task and verify report timestamp.'
