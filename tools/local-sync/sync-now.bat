@echo off
rem ==================================================================
rem  wuyutzu-tools : sync this folder with GitHub (simple version)
rem  - Only uses tools built into Windows 10/11: curl, tar, robocopy
rem  - No PowerShell, no admin rights needed (do NOT run as admin)
rem  - Only adds / overwrites files. Never deletes your files.
rem  - Only website used: github.com
rem ==================================================================
setlocal
set "REPO=puff0223-chwu/wuyutzu-tools"

rem This file lives in <folder>\tools\local-sync\ , so <folder> is two levels up
for %%I in ("%~dp0..\..") do set "TARGET=%%~fI"
if not exist "%TARGET%\HANDBOOK.md" (
  echo [X] Cannot find the wuyutzu-tools folder: "%TARGET%"
  goto end
)

rem Work box in the TEMP folder (only this box is cleared, nothing else)
set "WORK=%TEMP%\wuyutzu-sync"
if exist "%WORK%" rmdir /s /q "%WORK%"
mkdir "%WORK%"

echo [1/3] Downloading the latest version from GitHub ...
curl.exe -fsSL --retry 2 -o "%WORK%\repo.zip" "https://github.com/%REPO%/archive/refs/heads/main.zip"
if errorlevel 1 ( echo [X] Download failed. Check the internet and try again. & goto end )

echo [2/3] Unzipping ...
tar.exe -xf "%WORK%\repo.zip" -C "%WORK%"
if errorlevel 1 ( echo [X] Unzip failed. & goto end )

echo [3/3] Copying into "%TARGET%" ...
rem /E = all sub folders; no /PURGE = never delete; skip .git (GitHub Desktop data) and this running file
robocopy "%WORK%\wuyutzu-tools-main" "%TARGET%" /E /XD .git /XF "%~nx0" /R:1 /W:1 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 ( echo [X] Copy failed. Close files opened from this folder and try again. & goto end )

echo.
echo [OK] Done! Your folder now matches GitHub.
echo      %DATE% %TIME:~0,5%  synced>> "%TARGET%\..\sync-log.txt"

:end
echo.
pause
