#!/bin/zsh
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
if /usr/bin/curl --silent --fail http://127.0.0.1:4317/ >/dev/null; then
  /usr/bin/open http://127.0.0.1:4317/
  exit 0
fi
(sleep 2; /usr/bin/open http://127.0.0.1:4317/) &
node server.mjs
