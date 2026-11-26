param(
 [string]$ProjectPath=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
 [switch]$Publish
)
$ErrorActionPreference = 'Stop'
if (!$Publish) {
 & (Join-Path $PSScriptRoot 'prepare-public-report.ps1') -ProjectPath $ProjectPath
 Write-Host 'DRY RUN: nothing pushed to GitHub. To publish after review, use -Publish.'
 exit 0
}
if ($env:QA_PUBLICATION_APPROVED -ne 'YES') { throw 'Set QA_PUBLICATION_APPROVED=YES only after verifying the approved dataset.' }
$repo=(Resolve-Path (Join-Path $ProjectPath '..')).Path
Set-Location $repo
$branch=(git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw "Publishing requires local main branch; currently $branch" }
# Synchronize before preparing report/history, never after creating a data commit.
$beforeSync=@(git status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'git status failed before synchronization' }
if (@($beforeSync | Where-Object { $_ }).Count -gt 0) {
 throw ('Local changes before synchronization; refusing to overwrite: ' + ($beforeSync -join '; '))
}
git fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'git fetch failed; no publication' }
git merge --ff-only origin/main
if ($LASTEXITCODE -ne 0) { throw 'Cannot fast-forward local main; resolve divergence before publishing' }
Write-Host 'Local main synchronized with origin/main.'
& (Join-Path $PSScriptRoot 'prepare-public-report.ps1') -ProjectPath $ProjectPath
$reportPath='lenovo-qa-analytics/public/data/approved-report.json'
$historyPath='lenovo-qa-analytics/public/data/history.json'
$historyScript=Join-Path $ProjectPath 'scripts\update-history.mjs'
$historyTest=Join-Path $ProjectPath 'scripts\update-history.test.mjs'
node --test $historyTest
if ($LASTEXITCODE -ne 0) { throw 'History tests failed; no publication' }
node $historyScript (Join-Path $repo $reportPath) (Join-Path $repo $historyPath)
if ($LASTEXITCODE -ne 0) { throw 'History update failed; no publication' }
$activityPath='lenovo-qa-analytics/public/data/live-activity.json'
$allowed=@($reportPath,$historyPath)
if ($env:QA_ACTIVITY_PUBLICATION_APPROVED -eq 'YES') {
 node (Join-Path $ProjectPath 'scripts\prepare-live-activity.mjs')
 if ($LASTEXITCODE -ne 0) { throw 'Activity generation failed' }
 Copy-Item (Join-Path $env:LOCALAPPDATA 'LenovoQAStatusAgent\live-monitor\live-activity.json') (Join-Path $repo $activityPath) -Force
 $allowed += $activityPath
}
$dirty=@(git status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'git status failed' }
$unexpected=@($dirty | Where-Object { $_ -and ($_.Length -lt 4 -or $allowed -notcontains $_.Substring(3)) })
if ($unexpected.Count -gt 0) { throw ('Unexpected uncommitted files; stop before publishing: ' + ($unexpected -join '; ')) }
$staged=@(git diff --cached --name-only)
if ($LASTEXITCODE -ne 0) { throw 'git diff staged failed' }
if (@($staged | Where-Object { $_ -notin $allowed }).Count -gt 0) { throw 'Unexpected staged changes; stop before publishing' }
git add -f -- $allowed
if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { git push origin main; if ($LASTEXITCODE -ne 0) { throw 'Push failed' }; Write-Host 'No report changes'; exit 0 }
if ($LASTEXITCODE -ne 1) { throw 'git diff failed' }
$staged=@(git diff --cached --name-only)
if (@($staged | Where-Object { $_ -notin $allowed }).Count -gt 0) { throw 'Unexpected staged change' }
git commit -m 'data: publish approved QA snapshot and aggregate history'
if ($LASTEXITCODE -ne 0) { throw 'Commit failed' }
git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Push failed; check local commit before retry' }
Write-Host 'Approved sanitized snapshot pushed; GitHub Pages deployment will follow.'
