param([Parameter(Mandatory=$true)][string]$ZipFolder)
$ErrorActionPreference='Stop'
$repo='msanchez31l/lenovo-qa-analytics-dashboard'
$tag='qa-tools-2026-11-15'
$items=@(
 @{Zip='lenovo-pdp-content-comparator-RELEASE.2.0.0.zip'; Match='Lenovo PDP Content Comparator-0.3.2-fix1-x64.exe'; Output='lenovo-pdp-content-comparator-0.3.2-fix1-x64.exe'},
 @{Zip='lenovo-pictures-fonts-comparator-RELEASE.1.0.0(1).zip'; Match='Lenovo Pictures Fonts Content Comparator-1.0.4-x64.exe'; Output='lenovo-pictures-fonts-comparator-1.0.4-x64.exe'},
 @{Zip='Lenovo-Link-CTA-Validator-RELEASE-v1.0.1.zip'; Match='Lenovo Link CTA Validator-1.0.4-x64.exe'; Output='lenovo-links-cta-validator-1.0.4-x64.exe'},
 @{Zip='Lenovo-Perf-Accesibility-Forms-Inspector-V1.0.1.zip'; Match='Lenovo Performance, Accessibility & Forms Validator-1.2.6-x64.exe'; Output='lenovo-performance-accessibility-forms-1.2.6-x64.exe'}
)
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI (gh) is required. Install it and run gh auth login.' }
& gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Run gh auth login first.' }
Add-Type -AssemblyName System.IO.Compression
$dir=Join-Path ([IO.Path]::GetTempPath()) ('lenovo-qa-release-'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($dir) | Out-Null
try {
 $assets=@()
 foreach($item in $items) {
  $zipPath=Join-Path $ZipFolder $item.Zip
  if (-not (Test-Path -LiteralPath $zipPath)) { throw "Missing ZIP: $zipPath" }
  $zip=[IO.Compression.ZipFile]::OpenRead($zipPath)
  try {
   $entry=@($zip.Entries | Where-Object { $_.FullName.EndsWith('/'+$item.Match,[StringComparison]::OrdinalIgnoreCase) -or $_.FullName -eq $item.Match })
   if ($entry.Count -ne 1) { throw "Expected one installer $($item.Match), found $($entry.Count)" }
   $out=Join-Path $dir $item.Output
   $inputStream=$entry[0].Open()
   try { $outputStream=[IO.File]::Create($out); try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose() } } finally { $inputStream.Dispose() }
   $assets+= $out
   Write-Host "Prepared $($item.Output)"
  } finally { $zip.Dispose() }
 }
 & gh release view $tag -R $repo *> $null
 if ($LASTEXITCODE -eq 0) { throw "Release $tag already exists. Review it before overwriting assets." }
 & gh release create $tag @assets -R $repo --title 'Lenovo QA Tools - November 2026' --notes 'Approved Windows x64 installers for Lenovo QA Hub. See individual tool cards for versions.'
 if ($LASTEXITCODE -ne 0) { throw 'GitHub release creation failed.' }
 Write-Host "Release published: https://github.com/$repo/releases/tag/$tag"
} finally { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue }
