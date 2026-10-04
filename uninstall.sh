#!/bin/sh
# firefox-autohide uninstaller for macOS and Linux.
#
#   ./uninstall.sh                  find Firefox automatically
#   ./uninstall.sh /path/to/Firefox.app
#
# Removes the mod's files and restores whatever was there before it.
set -e

MARK="uc.autohide."

die() { echo "Error: $*" >&2; exit 1; }

resolve_dir() {
  case "$1" in
    *.app|*.app/) echo "${1%/}/Contents/Resources" ;;
    *) echo "${1%/}" ;;
  esac
}

if [ -n "$1" ]; then
  DIR="$(resolve_dir "$1")"
else
  for c in \
    "/Applications/Firefox.app" "$HOME/Applications/Firefox.app" \
    /usr/lib/firefox /usr/lib64/firefox /usr/lib/firefox-esr /opt/firefox /usr/local/lib/firefox; do
    d="$(resolve_dir "$c")"
    if [ -f "$d/omni.ja" ]; then DIR="$d"; break; fi
  done
fi
[ -n "$DIR" ] && [ -f "$DIR/omni.ja" ] || die "Firefox not found. Pass its location: ./uninstall.sh /path/to/Firefox.app"

SUDO=""
[ -w "$DIR" ] || SUDO="sudo"

if [ -f "$DIR/config.js" ] && grep -q "$MARK" "$DIR/config.js"; then
  if [ -f "$DIR/config.js.before-autohide" ]; then
    $SUDO mv "$DIR/config.js.before-autohide" "$DIR/config.js"
  else
    $SUDO rm "$DIR/config.js"
  fi
fi

# Remove our autoconfig.js, and also any autoconfig.js that would now point
# at a config.js that no longer exists: Firefox refuses to start if the file
# it was told to load is missing.
AC="$DIR/defaults/pref/autoconfig.js"
if [ -f "$AC" ] && { grep -q "firefox-autohide" "$AC" || { [ ! -f "$DIR/config.js" ] && grep -q '"config.js"' "$AC"; }; }; then
  if [ -f "$AC.before-autohide" ]; then
    $SUDO mv "$AC.before-autohide" "$AC"
  else
    $SUDO rm "$AC"
  fi
fi

if [ ! -f "$DIR/config.js" ] && grep -ls "general.config.filename" "$DIR"/defaults/pref/*.js >/dev/null 2>&1; then
  echo "Warning: a file in $DIR/defaults/pref still sets general.config.filename," >&2
  echo "but config.js is gone. Firefox may fail to start until you remove that file." >&2
fi

echo "Removed from $DIR"
echo "Quit Firefox completely and start it again."
