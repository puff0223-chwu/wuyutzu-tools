<# : batch part (ASCII only)
@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%~f0'; iex ((Get-Content -LiteralPath $f -Encoding UTF8) -join [Environment]::NewLine)"
pause
exit /b
: end batch part #>
# =====================================================================
#  巫魚子教課事務所：本機資料夾自動同步（從 GitHub 下載最新版）
#  第一次：雙擊這個檔案 → 安裝排程，並馬上同步一次
#  之後完全不用管：電腦每小時「看一眼」GitHub 的版本號（只有幾十個字，約 1 秒就結束、不會常駐記憶體），
#  只有 Claude 推上新的開發或整理時才真的下載、更新；沒有新東西就什麼都不做
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
Write-Host '🔧 安裝排程（每小時檢查一次，有新版才下載）…'
$action  = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$Script`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$setting = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries
Register-ScheduledTask -TaskName $Task -Action $action -Trigger $trigger -Settings $setting -Description '巫魚子教課事務所：每小時檢查 GitHub，有新版本才同步 wuyutzu-tools 到桌面的系統工具開發資料夾' -Force | Out-Null
Write-Host '⬇️ 先馬上同步一次…'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Script
Write-Host ''
Write-Host '🎉 完成！之後有新的開發時，會自動下載最新版到：'
Write-Host "   $Target"
Write-Host "   同步紀錄：$Log"
Write-Host '   想停止：開「工作排程器」刪除 WuyutzuToolsAutoSync，（工作排程器程式庫 → WuyutzuToolsAutoSync → 刪除）'
