#!/usr/bin/env bash
# Packages Vox for people who do not have Java installed:
#
#   dist/vox/                              vox launcher + trimmed Java runtime
#   dist/vox-<version>-<os>-<arch>.zip     the same, zipped
#   dist/vox-setup-<version>.exe           Windows installer (needs Inno Setup 6)
#
# Needs a JDK 14 or newer: jpackage and jlink ship with it. jpackage builds
# only for the OS it runs on. Verified on Windows; on Linux the launcher ends
# up at dist/vox/bin/voxand on macOS jpackage writes a vox.app bundle.
set -euo pipefail
cd "$(dirname "$0")"

VERSION="$(tr -d '[:space:]' < VERSION)"

case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) OS=windows ;;
    Darwin)               OS=macos ;;
    *)                    OS=linux ;;
esac
ARCH="$(uname -m)"
case "$ARCH" in
    x86_64)        ARCH=x64 ;;
    aarch64|arm64) ARCH=arm64 ;;
esac

[ -f build/vox.jar ] || ./build.sh

echo "==> staging"
rm -rf dist/stage dist/vox dist/vox.app
mkdir -p dist/stage
cp build/vox.jar dist/stage/

EXTRA=()
case "$OS" in
    windows) EXTRA+=(--win-console --icon installer/vox.ico) ;;
    linux)   EXTRA+=(--icon web/public/icon.png) ;;
esac

echo "==> building dist/vox (jpackage)"
jpackage --type app-image --name vox --dest dist \
    --input dist/stage --main-jar vox.jar --main-class VoxMain \
    --app-version "$VERSION" --vendor Vox \
    --description "The Vox programming language" \
    --add-modules java.base \
    --jlink-options "--strip-native-commands --strip-debug --no-man-pages --no-header-files --compress zip-6" \
    ${EXTRA[@]+"${EXTRA[@]}"}
rm -rf dist/stage

echo "==> zipping"
ZIP="dist/vox-$VERSION-$OS-$ARCH.zip"
rm -f "$ZIP"
if [ "$OS" = windows ]; then
    # Windows ships bsdtar, which writes a zip when the name ends in .zip.
    /c/Windows/System32/tar.exe -a -c -f "$ZIP" -C dist vox
else
    (cd dist && zip -qr "../$ZIP" vox*)
fi

if [ "$OS" = windows ]; then
    ISCC=""
    for candidate in \
        "$LOCALAPPDATA/Programs/Inno Setup 6/ISCC.exe" \
        "/c/Program Files (x86)/Inno Setup 6/ISCC.exe" \
        "/c/Program Files/Inno Setup 6/ISCC.exe"; do
        if [ -f "$candidate" ]; then ISCC="$candidate"; break; fi
    done
    if [ -n "$ISCC" ]; then
        echo "==> building installer (Inno Setup)"
        # MSYS would otherwise rewrite /D... as a path.
        MSYS_NO_PATHCONV=1 "$ISCC" /Q "/DAppVersion=$VERSION" installer/vox.iss
    else
        echo "==> skipping installer: Inno Setup 6 not found (winget install JRSoftware.InnoSetup)"
    fi
fi

echo "==> done"
ls -la dist | grep -v '^total'
