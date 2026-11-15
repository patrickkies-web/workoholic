#!/bin/sh
# Setzt den Stand (die Version) der App – vor JEDEM Veröffentlichen ausführen.
# Schreibt denselben Stempel an drei Stellen:
#   index.html   <html data-stand="…">  und  ?v=… an allen Skripten
#   js/version.js                        (wird von js/update.js am Zwischenspeicher vorbei abgefragt)
# Aufruf:  tools/stand.sh            -> Stempel aus Datum und Uhrzeit (JJJJMMTT-HHMM)
#          tools/stand.sh pruefen    -> prüft nur, ob alle Stellen übereinstimmen
set -e
cd "$(dirname "$0")/.."

lesen() {
  H=$(sed -n 's/.*<html lang="de" data-stand="\([^"]*\)".*/\1/p' index.html | head -1)
  V=$(sed -n "s/^window.WK_STAND = '\([^']*\)';$/\1/p" js/version.js)
  OHNE=$(grep -c '<script src="[^"?]*"' index.html || true)
  FALSCH=$(grep '<script src="' index.html | grep -vc "?v=$H\"" || true)
}

if [ "$1" = "pruefen" ]; then
  lesen
  if [ -n "$H" ] && [ "$H" = "$V" ] && [ "$OHNE" = "0" ] && [ "$FALSCH" = "0" ]; then echo "Stand $H – stimmig."; exit 0; fi
  echo "Stand NICHT stimmig: index.html=$H version.js=$V Skripte ohne ?v=$OHNE mit anderem ?v=$FALSCH" >&2; exit 1
fi

S="${1:-$(TZ=Europe/Berlin date +%Y%m%d-%H%M)}"
case "$S" in *[!0-9-]*|'') echo "Ungültiger Stand: $S" >&2; exit 1;; esac
printf "window.WK_STAND = '%s';\n" "$S" > js/version.js
sed -e "s/\(<html lang=\"de\"\)\( data-stand=\"[^\"]*\"\)\{0,1\}/\1 data-stand=\"$S\"/" \
    -e "s/\(<script src=\"[^\"?]*\)\(?v=[^\"]*\)\{0,1\}\"/\1?v=$S\"/" index.html > index.html.neu
mv index.html.neu index.html
lesen
[ "$H" = "$S" ] && [ "$V" = "$S" ] && [ "$OHNE" = "0" ] && [ "$FALSCH" = "0" ] || { echo "Stempeln fehlgeschlagen" >&2; exit 1; }
echo "Stand $S gesetzt."
