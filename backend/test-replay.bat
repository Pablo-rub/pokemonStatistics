@echo off
REM Test script for Windows
REM Usage: test-replay.bat <replay-id> [debug]

if "%1"=="" (
    echo Usage: test-replay.bat ^<replay-id^> [debug]
    echo Example: test-replay.bat gen9vgc2025regh-2462071398
    echo Example with debug: test-replay.bat gen9vgc2025regh-2462071398 debug
    exit /b 1
)

if "%2"=="debug" (
    set LOG_LEVEL=DEBUG
) else (
    set LOG_LEVEL=INFO
)

echo Testing replay: %1
echo Log level: %LOG_LEVEL%
echo.

node test-single-replay.js %1