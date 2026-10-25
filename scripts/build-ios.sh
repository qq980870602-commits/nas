#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p build/xcode build/output tools
curl --fail --retry 3 --connect-timeout 20 --max-time 180 -o build/game.pck http://142.111.17.194:7778/update/ios.pck
printf '%s  %s\n' '387d4efb65fbac0bfc824d62cf6f8a12ebbf56ccbbde3bbb9349a2083c101539' 'build/game.pck' | shasum -a 256 -c -
ENGINE="$ROOT/tools/Godot.app/Contents/MacOS/Godot"
if [ ! -x "$ENGINE" ]; then
 curl --fail --location --retry 3 -o tools/godot.zip https://github.com/godotengine/godot-builds/releases/download/4.4.1-stable/Godot_v4.4.1-stable_macos.universal.zip
 unzip -q tools/godot.zip -d tools
fi
TEMPLATES="$HOME/Library/Application Support/Godot/export_templates/4.4.1.stable"
if [ ! -f "$TEMPLATES/ios.zip" ]; then
 curl --fail --location --retry 3 -o tools/templates.tpz https://github.com/godotengine/godot-builds/releases/download/4.4.1-stable/Godot_v4.4.1-stable_export_templates.tpz
 mkdir -p "$TEMPLATES"
 unzip -j -q tools/templates.tpz templates/ios.zip templates/version.txt -d "$TEMPLATES"
fi
export GAME_PCK="$ROOT/build/game.pck" GAME_ICON="$ROOT/seed/icon.png"
"$ENGINE" --headless --path seed --script extract_icon.gd
"$ENGINE" --headless --path seed --import
"$ENGINE" --headless --path seed --export-release iOS "$ROOT/build/xcode/GBALink.ipa"
# The placeholder team is only for project generation; build without signing or a team.
cp build/game.pck build/xcode/GBALink.pck
python3 - <<'PY'
from pathlib import Path
import plistlib
for p in Path('build/xcode').rglob('*Info.plist'):
 with p.open('rb') as f: d=plistlib.load(f)
 d['NSAppTransportSecurity']={'NSAllowsArbitraryLoads':True}
 d['NSLocalNetworkUsageDescription']='连接联机游戏服务器'
 with p.open('wb') as f:plistlib.dump(d,f)
PY
xcodebuild -project build/xcode/GBALink.xcodeproj -scheme GBALink -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' DEVELOPMENT_TEAM='' build > build/xcodebuild.log 2>&1 || { tail -n 120 build/xcodebuild.log; exit 1; }
APP="$(find build/DerivedData/Build/Products/Release-iphoneos -maxdepth 1 -name '*.app' -type d -print -quit)"
test -n "$APP"
mkdir -p build/output/Payload
cp -R "$APP" build/output/Payload/
python3 - <<'PY'
from pathlib import Path
import plistlib,hashlib,json,subprocess
app=next(Path('build/output/Payload').glob('*.app'))
with (app/'Info.plist').open('rb') as f:d=plistlib.load(f)
assert d['CFBundleIdentifier']=='com.gbalink.client'
assert str(d['CFBundleShortVersionString'])=='0.6.7'
assert str(d['CFBundleVersion'])=='67'
expected='387d4efb65fbac0bfc824d62cf6f8a12ebbf56ccbbde3bbb9349a2083c101539'
packs=list(app.rglob('*.pck'));assert any(hashlib.sha256(p.read_bytes()).hexdigest()==expected for p in packs)
assert not (app/'embedded.mobileprovision').exists()
arch=subprocess.check_output(['lipo','-archs',str(app/d['CFBundleExecutable'])],text=True).strip();assert arch=='arm64',arch
receipt={'version':'0.6.7','bundle_id':d['CFBundleIdentifier'],'architecture':arch,'ios_resource_sha256':expected,'unsigned':True,'device_tested':False}
Path('build/output/build-receipt.json').write_text(json.dumps(receipt,indent=2))
PY
(cd build/output && /usr/bin/zip -q -r GBALink-v0.6.7-iOS-unsigned.ipa Payload)
shasum -a 256 build/output/GBALink-v0.6.7-iOS-unsigned.ipa > build/output/SHA256.txt
