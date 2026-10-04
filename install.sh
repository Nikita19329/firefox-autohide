#!/bin/sh
# firefox-autohide installer for macOS and Linux.
#
#   ./install.sh                  find Firefox automatically
#   ./install.sh /path/to/Firefox.app   or the folder that contains omni.ja
#
# Copies two files into the Firefox install folder:
#   config.js                  the mod itself
#   defaults/pref/autoconfig.js tells Firefox to load config.js
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
MARK="uc.autohide."

die() { echo "Error: $*" >&2; exit 1; }

# Folder that holds omni.ja and the defaults/ directory
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

if [ -z "$DIR" ]; then
  if command -v snap >/dev/null 2>&1 && snap list firefox >/dev/null 2>&1; then
    die "Firefox is installed as a Snap package. Snap packages are read-only, so this mod can't be installed there. Use Firefox from mozilla.org or your distro's .deb/.rpm package."
  fi
  die "Firefox not found. Pass its location: ./install.sh /path/to/Firefox.app (or the folder with omni.ja)."
fi
[ -f "$DIR/omni.ja" ] || die "$DIR doesn't look like a Firefox install folder (no omni.ja)."

SUDO=""
if [ ! -w "$DIR" ]; then
  echo "Need administrator rights to write to $DIR"
  SUDO="sudo"
fi

# Don't clobber someone else's autoconfig setup: back it up first
if [ -f "$DIR/config.js" ] && ! grep -q "$MARK" "$DIR/config.js"; then
  echo "Found another config.js, saving it as config.js.before-autohide"
  $SUDO cp "$DIR/config.js" "$DIR/config.js.before-autohide"
fi
# An autoconfig.js that loads a different file belongs to another setup.
# One that already loads config.js does the same job as ours: just replace it.
AC="$DIR/defaults/pref/autoconfig.js"
if [ -f "$AC" ] && ! grep -q "firefox-autohide" "$AC" && ! grep -q '"general.config.filename", *"config.js"' "$AC"; then
  echo "Found another autoconfig.js, saving it as autoconfig.js.before-autohide"
  $SUDO cp "$AC" "$AC.before-autohide"
fi

$SUDO mkdir -p "$DIR/defaults/pref"
$SUDO cp "$HERE/src/config.js" "$DIR/config.js"
$SUDO cp "$HERE/src/defaults/pref/autoconfig.js" "$DIR/defaults/pref/autoconfig.js"

echo "Installed into $DIR"
echo "Quit Firefox completely and start it again."
