@echo off

REM check passed by parameter
if "%~1"=="" (
    echo pass with the path, for example：start_backend.bat hl7parse.exe
    pause
    exit /b
)

:: check is administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ask for administrator...
    powershell -Command "Start-Process '%~f0' -ArgumentList '%*' -Verb RunAs"
    exit /b
)



start "" "%~dp0%~1"
timeout /t 8
start "" "http://localhost:8978"
