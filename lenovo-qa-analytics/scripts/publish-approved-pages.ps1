param(
 [string]$ProjectPath=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
 [switch]$Publish
)
$ErrorActionPreference='Stop'
& (Join-Path $PSScriptRoot 'prepare-public-report.ps1') -ProjectPath $ProjectPath
if (!$Publish) { Write-Host 'DRY RUN: nothing pushed to GitHub. To publish after review, use -Publish.'; exit 0 }
if ($env:QA_PUBLICATION_APPROVED -ne 'YES') { throw 'Set QA_PUBLICATION_APPROVED=YES only after verifying the approved dataset.' }
$repo=(Resolve-Path (Join-Path $ProjectPath '..')).Path
Set-Location $repo
$branch=(git branch --show-current).Trim()
if ($branch -ne 'main') { throw "Publishing requires local main branch; currently $branch" }
$dirty=@(git status --porcelain)
$unexpected=@($dirty | Where-Object { $_ -notmatch '^([ MARCUD?!]{2}) lenovo-qa-analytics/public/data/approved-report\.json
git add -f -- 'lenovo-qa-analytics/public/data/approved-report.json'
if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host 'No report changes'; exit 0 }
git diff --cached --name-only | ForEach-Object { if ($_ -ne 'lenovo-qa-analytics/public/data/approved-report.json') { throw 'Unexpected staged change' } }
git commit -m 'data: publish approved sanitized QA snapshot'
if ($LASTEXITCODE -ne 0) { throw 'Commit failed' }
git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Push failed; check local commit before retry' }
Write-Host 'Approved sanitized snapshot pushed; GitHub Pages deployment will follow.'
 })
if ($unexpected.Count -gt 0) { throw ('Unexpected uncommitted files; stop before publishing: ' + ($unexpected -join '; ')) }
git add -f -- 'lenovo-qa-analytics/public/data/approved-report.json'
if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host 'No report changes'; exit 0 }
git diff --cached --name-only | ForEach-Object { if ($_ -ne 'lenovo-qa-analytics/public/data/approved-report.json') { throw 'Unexpected staged change' } }
git commit -m 'data: publish approved sanitized QA snapshot'
if ($LASTEXITCODE -ne 0) { throw 'Commit failed' }
git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Push failed; check local commit before retry' }
Write-Host 'Approved sanitized snapshot pushed; GitHub Pages deployment will follow.'
