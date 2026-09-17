@echo off
REM Packages Vox for people who do not have Java installed:
REM
REM   dist\vox\                          vox.exe launcher + trimmed Java runtime
REM   dist\vox-<version>-windows-x64.zip  the same, zipped
REM   dist\vox-setup-<version>.exe        installer (needs Inno Setup 6)
REM
REM Needs a JDK 14 or newer: jpackage and jlink ship with it.

setlocal
cd /d "%~dp0"

set /p VERSION=<VERSION

if not exist build\vox.jar (
    call build.bat
    if errorlevel 1 exit /b 1
)

echo ==^> staging
if exist dist\stage rmdir /s /q dist\stage
if exist dist\vox rmdir /s /q dist\vox
mkdir dist\stage
copy /y build\vox.jar dist\stage\ >nul

echo ==^> building dist\vox (jpackage)
jpackage --type app-image --name vox --dest dist ^
    --input dist\stage --main-jar vox.jar --main-class VoxMain ^
    --win-console --icon installer\vox.ico ^
    --app-version %VERSION% --vendor Vox ^
    --description "The Vox programming language" ^
    --add-modules java.base ^
    --jlink-options "--strip-native-commands --strip-debug --no-man-pages --no-header-files --compress zip-6"
if errorlevel 1 exit /b 1
rmdir /s /q dist\stage

echo ==^> zipping
set "ZIP=dist\vox-%VERSION%-windows-x64.zip"
if exist "%ZIP%" del "%ZIP%"
REM Windows ships bsdtar, which writes a zip when the name ends in .zip.
tar -a -c -f "%ZIP%" -C dist vox
if errorlevel 1 exit /b 1

set "ISCC="
if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if "%ISCC%"=="" (
    echo ==^> skipping installer: Inno Setup 6 not found ^(winget install JRSoftware.InnoSetup^)
) else (
    echo ==^> building installer ^(Inno Setup^)
    "%ISCC%" /Q "/DAppVersion=%VERSION%" installer\vox.iss
    if errorlevel 1 exit /b 1
)

echo ==^> done
dir /b dist
