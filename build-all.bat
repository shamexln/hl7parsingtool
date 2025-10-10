@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Build script for hl7parsingtool: builds Angular client and packages Node server
REM Usage: double-click or run from terminal: build-all.bat

set ROOT=%~dp0
set CLIENT=%ROOT%client
set SERVER=%ROOT%server
set CLIENT_DIST=%CLIENT%\dist\hl7parsegui
set SERVER_PUBLIC=%SERVER%\public

echo ======================================================
echo [1/5] Installing client dependencies (npm ci)
echo ======================================================
pushd "%CLIENT%"
if %ERRORLEVEL% NEQ 0 goto :error

call npm ci
if %ERRORLEVEL% NEQ 0 goto :error

echo.
echo =============================================
echo [2/5] Building Angular client (production)
echo =============================================
call npx ng build --configuration production
if %ERRORLEVEL% NEQ 0 goto :error
popd

REM Ensure server/public exists
if not exist "%SERVER_PUBLIC%" (
  mkdir "%SERVER_PUBLIC%"
  if %ERRORLEVEL% NEQ 0 goto :error
)

echo.
echo ======================================================
echo [3/5] Copying client dist to server\public (via robocopy)
echo Source: %CLIENT_DIST%
echo Target: %SERVER_PUBLIC%
echo ======================================================
if not exist "%CLIENT_DIST%" (
  echo ERROR: Client dist folder not found: %CLIENT_DIST%
  goto :error
)

REM Copy all files (including the browser folder) to server\public
robocopy "%CLIENT_DIST%" "%SERVER_PUBLIC%" /MIR /NFL /NDL /NP /NJH /NJS >nul
set RC=%ERRORLEVEL%
REM robocopy returns 1 or less for success
if %RC% GEQ 8 (
  echo ERROR: robocopy failed with code %RC%
  goto :error
)

echo.
echo =============================================
echo [4/5] Installing server deps and packaging (pkg)
echo =============================================
pushd "%SERVER%"
call npm ci
if %ERRORLEVEL% NEQ 0 goto :error

call npm run build
if %ERRORLEVEL% NEQ 0 goto :error
popd

REM Build Windows installer via Inno Setup if script is present
set ISS_FILE=%SERVER%\hl7parse.iss
if exist "%ISS_FILE%" (
  echo.
  echo =============================================
  echo [5/5] Building Windows installer (Inno Setup)
  echo =============================================
  call :find_iscc
  echo ISCC is [%ISCC%]

  if not defined ISCC (
    echo WARNING: Inno Setup compiler ISCC.exe not found in PATH or default locations.
    echo WARNING: Skipping installer build. Install "Inno Setup 6" and ensure ISCC.exe is in PATH.
  ) else (
    echo Using ISCC: "%ISCC%"
    "%ISCC%" "/Qp" "%ISS_FILE%"
    if %ERRORLEVEL% NEQ 0 goto :error
  )
) else (
  echo WARNING: Installer script not found: %ISS_FILE% . Skipping installer build.
)


echo.
echo Build completed successfully.
echo - Angular output copied to server\public (expects public\browser\index.html)
echo - Server package built under server\dist

echo - If Inno Setup was available, the installer has been compiled per server\hl7parse.iss

goto :eof

:find_iscc
REM Try to locate ISCC.exe via PATH
for /f "delims=" %%i in ('where ISCC 2^>nul') do (
  set "ISCC=%%i"
  goto :eof
)

REM Try common install locations (avoid parentheses blocks and use proper quoting)
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe" & goto :eof
if exist "C:\Program Files\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe" & goto :eof

REM Not found
set "ISCC="
goto :eof

:error
echo.
echo Build FAILED. See messages above for details.
exit /b 1
