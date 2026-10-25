<# : batch part (ASCII only)
@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%~f0'; iex ((Get-Content -LiteralPath $f -Encoding UTF8) -join [Environment]::NewLine)"
pause
exit /b
: end batch part #>
# =====================================================================
#  巫魚子教課事務所：本機資料夾「立即同步」（從 GitHub 下載最新版）
#  雙擊一次＝同步一次，跑完就結束，不會在背景定時執行
#  （如果之前裝過「每小時自動同步」排程，這裡會順便把它移除）
#  不需要安裝 git、不需要系統管理員權限；只會「新增／覆蓋」檔案，不會刪除你電腦裡的任何檔案
# =====================================================================
$ErrorActionPreference = 'Stop'
$Repo    = 'puff0223-chwu/wuyutzu-tools'
$Branch  = 'main'
$Desktop = [Environment]::GetFolderPath('Desktop')
$Base    = Join-Path $Desktop '系統工具開發\Claude-Code'
$Target  = Join-Path $Base 'wuyutzu-tools'
$Home2   = Join-Path $env:LOCALAPPDATA 'WuyutzuSync'
$Script  = Join-Path $Home2 'sync.ps1'
$Log     = Join-Path $Base '自動同步紀錄.txt'
$Task    = 'WuyutzuToolsAutoSync'

$SyncCode = @'
$ErrorActionPreference = 'Stop'
$Repo = '__REPO__'; $Branch = '__BRANCH__'; $Target = '__TARGET__'; $Log = '__LOG__'
function Say($m) { $line = (Get-Date -Format 'yyyy-MM-dd HH:mm') + '  ' + $m; Add-Content -LiteralPath $Log -Value $line -Encoding UTF8; Write-Host $line }
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  # 先問 GitHub 最新版本號（commit 編號，回應不到 1 KB）；和上次一樣就直接結束
  $state = Join-Path $env:LOCALAPPDATA 'WuyutzuSync\last-commit.txt'
  $sha = ((Invoke-WebRequest -UseBasicParsing -UserAgent 'wuyutzu-sync' -Uri ("https://api.github.com/repos/$Repo/git/refs/heads/$Branch")).Content | ConvertFrom-Json).object.sha
  $last = if (Test-Path -LiteralPath $state) { (Get-Content -LiteralPath $state -Raw).Trim() } else { '' }
  if ($sha -and $sha -eq $last -and (Test-Path -LiteralPath $Target)) { Write-Host '👌 本機已經是最新版，不用下載'; exit 0 }
  New-Item -ItemType Directory -Force -Path $Target | Out-Null
  $tmp = Join-Path $env:TEMP ('wuyutzu-sync-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $zip = Join-Path $tmp 'repo.zip'
  Invoke-WebRequest -UseBasicParsing -Uri ("https://github.com/$Repo/archive/refs/heads/$Branch.zip") -OutFile $zip
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
  $src = Get-ChildItem -LiteralPath $tmp -Directory | Select-Object -First 1
  # /E 複製所有子資料夾；不加 /PURGE → 不刪除本機任何檔案
  robocopy $src.FullName $Target /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
  Remove-Item -LiteralPath $tmp -Recurse -Force
  if ($sha) { Set-Content -LiteralPath $state -Value $sha -Encoding ASCII }
  Say ('✅ 有新的開發，已從 GitHub 同步到 ' + $Target + '（版本 ' + $sha.Substring(0, [Math]::Min(7, $sha.Length)) + '）')
} catch { Say ('⚠️ 同步失敗：' + $_.Exception.Message) }
'@
$SyncCode = $SyncCode.Replace('__REPO__', $Repo).Replace('__BRANCH__', $Branch).Replace('__TARGET__', $Target).Replace('__LOG__', $Log)

New-Item -ItemType Directory -Force -Path $Home2, $Base | Out-Null
Set-Content -LiteralPath $Script -Value $SyncCode -Encoding UTF8
if (Get-ScheduledTask -TaskName $Task -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $Task -Confirm:$false
  Write-Host '🧹 已移除之前裝的「每小時自動同步」排程'
}
Write-Host '⬇️ 同步中…'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Script
Write-Host ''
Write-Host '🎉 完成！資料夾：' $Target
Write-Host '   （如果顯示沒有變動，代表本機已經是最新版）'
