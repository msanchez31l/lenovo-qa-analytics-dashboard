$ErrorActionPreference = 'Stop'
# Explicitly scoped approval for the scheduled publication process.
$env:QA_PUBLICATION_APPROVED = 'YES'
$publisher = Join-Path $PSScriptRoot 'publish-approved-pages.ps1'
& $publisher -Publish
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "Publisher exited with code $LASTEXITCODE" }
