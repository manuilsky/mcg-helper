@echo off
cd /d "%~dp0"

echo Downloading update...
curl -L https://github.com/manuilsky/mcg-helper/releases/latest/download/extension.zip -o update.zip

echo Extracting...
tar -xf update.zip
del update.zip

echo Done! Go to chrome://extensions and press the reload button.
pause