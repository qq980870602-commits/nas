#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ "$(uname -s)" != "Darwin" ]; then
  echo "Unsigned device IPA builds require macOS and Xcode; Windows cannot run this build."
  exit 1
fi
command -v xcodebuild >/dev/null || { echo "Install and select Xcode first."; exit 1; }
command -v pod >/dev/null || { echo "Install CocoaPods first."; exit 1; }
SDK_MAJOR="$(xcrun --sdk iphoneos --show-sdk-version | cut -d. -f1)"
if [ "$SDK_MAJOR" -lt 26 ]; then
  echo "This glass UI build requires Xcode with the iOS 26 SDK or newer."
  exit 1
fi
if [ "${QIDU_SKIP_NPM_CI:-0}" != "1" ]; then npm ci; fi
npx --no-install expo prebuild --platform ios --no-install
pod install --project-directory=ios
WORKSPACE="$(find ios -maxdepth 1 -name '*.xcworkspace' -print -quit)"
[ -n "$WORKSPACE" ] || { echo "No iOS workspace was generated."; exit 1; }
SCHEME="${IOS_SCHEME:-$(basename "$WORKSPACE" .xcworkspace)}"
BUILD_ROOT="$ROOT/work/ios-unsigned"
mkdir -p "$BUILD_ROOT" "$ROOT/artifacts"
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath "$BUILD_ROOT/DerivedData" \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build
APP="$(find "$BUILD_ROOT/DerivedData/Build/Products/Release-iphoneos" -maxdepth 1 -name '*.app' -print -quit)"
[ -n "$APP" ] || { echo "Build did not produce a device app."; exit 1; }
STAGING="$(mktemp -d "$BUILD_ROOT/staging.XXXXXX")"
mkdir -p "$STAGING/Payload"
ditto "$APP" "$STAGING/Payload/$(basename "$APP")"
rm -f "$ROOT/artifacts/Qidu-unsigned.ipa"
(cd "$STAGING" && /usr/bin/zip -qry "$ROOT/artifacts/Qidu-unsigned.ipa" Payload)
echo "Unsigned IPA: $ROOT/artifacts/Qidu-unsigned.ipa"
echo "This file must be signed by the user before device installation."
