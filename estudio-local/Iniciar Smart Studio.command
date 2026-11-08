#!/bin/zsh
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
node start.mjs
