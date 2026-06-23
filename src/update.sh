#!/bin/bash
cd "$(dirname "$0")"
curl -L https://github.com/manuilsky/mcg-helper/releases/latest/download/extension.zip -o update.zip
unzip -o update.zip -d .
rm update.zip
echo "Done! Go to chrome://extensions and press the reload button."