#!/bin/sh
# FinUI's installer, published at https://finui.finstats.no/install.sh by the pages workflow (tools/build-site.mjs
# fills in the lists below). FinUI is source you copy and own, so installing it is copying it, with the tokens of a
# preset made at FinUI create after tokens.css' own. Nothing but sh and curl:
#   curl -fsSL https://finui.finstats.no/install.sh | sh -s -- <code> [--css] [--dir <folder>]
# A preset is one small file of tokens per choice (p/<axis>/<option>.css), fetched in axis order: the later sets a
# token last, as create/preset.js says it should.
set -eu

SITE="${FINUI_SITE:-https://finui.finstats.no}"
COUNTS="@COUNTS@"
FILES="@FILES@"
FONTS="@FONTS@"

usage() {
  cat <<'HELP'
FinUI: the components FinStats is built from.

  curl -fsSL https://finui.finstats.no/install.sh | sh -s -- <code> [--css] [--dir <folder>]

  <code>          a preset made at https://finui.finstats.no/create/ (none: FinUI as it ships)
  --dir <folder>  where to put it (default: finui); it must be empty, or not there yet
  --css           one stylesheet, finui.css, with the fonts beside it, instead of the source
HELP
}
fail() { printf 'finui: %s\n' "$1" >&2; exit 1; }

code=""; dir="finui"; css=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --css) css=1 ;;
    --dir) [ $# -ge 2 ] || fail "--dir needs a folder"; dir="$2"; shift ;;
    -*) fail "\"$1\" is not an option (--help says which are)" ;;
    *) [ -z "$code" ] || fail "one preset at a time"; code="$1" ;;
  esac
  shift
done

# The code: one base-36 digit per axis, in presets.json's order. A shorter one was made before the later axes existed,
# and leaves them at their defaults.
nopreset() { fail "\"$code\" names no preset. A code is one letter or digit per choice, such as 0101; make one at https://finui.finstats.no/create/"; }
digits=0123456789abcdefghijklmnopqrstuvwxyz
case "$code" in *[!0123456789abcdefghijklmnopqrstuvwxyz]*) nopreset ;; esac
set -- $COUNTS
[ ${#code} -le $# ] || nopreset
parts=""; rest="$code"; axis=0
while [ -n "$rest" ]; do
  c="${rest%"${rest#?}"}"; rest="${rest#?}"
  before="${digits%%"$c"*}"; option=${#before}
  [ "$option" -lt "$1" ] || nopreset
  [ "$option" -eq 0 ] || parts="$parts $axis/$option"
  axis=$((axis + 1)); shift
done

if [ -e "$dir" ] && [ -n "$(ls -A "$dir" 2>/dev/null)" ]; then
  fail "$dir already holds files; FinUI is copied only into an empty folder, so nothing of yours is overwritten."
fi
command -v curl >/dev/null 2>&1 || fail "curl is needed to fetch FinUI"

# Everything is fetched into a folder of its own first, so a download that fails leaves nothing behind.
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
get() { mkdir -p "$work/$(dirname "$1")"; curl -fsSL "$SITE/$1" -o "$work/$1" || fail "could not fetch $SITE/$1"; }
preset() {
  [ -n "$parts" ] || return 0
  printf '\n/* FinUI preset %s, made at FinUI create: %s/create/?preset=%s */\n' "$code" "$SITE" "$code"
  for p in $parts; do curl -fsSL "$SITE/p/$p.css" || fail "could not fetch the preset's tokens ($SITE/p/$p.css)"; done
}
block="$(preset)"
# The fonts the preset's faces name, and their licences, beside the ones every install brings.
FONTS="$FONTS $(printf '%s\n' "$block" | grep -o 'fonts/[A-Za-z0-9._-]*' | sed 's|^fonts/||' | sort -u | tr '\n' ' ')"

if [ "$css" = 1 ]; then
  get finui.css
  [ -z "$block" ] || printf '%s\n' "$block" >> "$work/finui.css"
  shown="$dir/finui.css"
else
  for f in $FILES; do get "$f"; done
  [ -z "$block" ] || printf '%s\n' "$block" >> "$work/tokens.css"
  shown="$dir"
fi
for f in $FONTS; do get "fonts/$f"; done
mkdir -p "$dir"
cp -R "$work/." "$dir/"

if [ "$css" = 1 ]; then
  printf 'FinUI: %s%s, with its fonts beside it.\n' "$shown" "${code:+ (preset $code)}"
else
  printf "FinUI is in %s%s. Load tokens.css, base.css and each component's CSS in registry.json's order, then import what you need.\n" "$shown" "${code:+, with preset $code}"
fi
