param(
 [string]$ProjectPath=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
 [switch]$Publish
)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'prepare-public-report.ps1') -ProjectPath $ProjectPath
if (!$Publish) { Write-Host 'DRY RUN: nothing pushed to GitHub. To publish after review, use -Publish.'; exit 0 }
if ($env:QA_PUBLICATION_APPROVED -ne 'YES') { throw 'Set QA_PUBLICATION_APPROVED=YES only after verifying the approved dataset.' }
$repo=(Resolve-Path (Join-Path $ProjectPath '..')).Path
Set-Location $repo
$branch=(git branch --show-current).Trim()
if ($branch -ne 'main') { throw "Publishing requires local main branch; currently $branch" }
$reportPath='lenovo-qa-analytics/public/data/approved-report.json'
$dirty=@(git status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'git status failed' }
$unexpected=@($dirty | Where-Object { $_ -and ($_.Length -lt 4 -or $_.Substring(3) -ne $reportPath) })
if ($unexpected.Count -gt 0) { throw ('Unexpected uncommitted files; stop before publishing: ' + ($unexpected -join '; ')) }
$staged=@(git diff --cached --name-only)
if ($LASTEXITCODE -ne 0) { throw 'git diff staged failed' }
if (@($staged | Where-Object { $_ -ne $reportPath }).Count -gt 0) { throw 'Unexpected staged changes; stop before publishing' }
git add -f -- $reportPath
if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host 'No report changes'; exit 0 }
if ($LASTEXITCODE -ne 1) { throw 'git diff failed' }
$staged=@(git diff --cached --name-only)
if (@($staged | Where-Object { $_ -ne $reportPath }).Count -gt 0) { throw 'Unexpected staged change' }
git commit -m 'data: publish approved sanitized QA snapshot'
if ($LASTEXITCODE -ne 0) { throw 'Commit failed' }
git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Push failed; check local commit before retry' }
Write-Host 'Approved sanitized snapshot pushed; GitHub Pages deployment will follow.'
