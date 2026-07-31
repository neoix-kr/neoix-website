#!/bin/bash
# NEOIX Admin — 빌드 완료 후 원탭 설치 마무리
# 사용법: ./finalize-install.sh            (최신 빌드 자동 사용)
#        ./finalize-install.sh <ipa-url>  (URL 직접 지정)
set -e
cd "$(dirname "$0")"
REPO=~/dev/neoix

IPA_URL="$1"
if [ -z "$IPA_URL" ]; then
  echo "— 최신 iOS 빌드에서 ipa URL 조회…"
  IPA_URL=$(npx --yes eas-cli build:list --platform ios --status finished --limit 1 --json --non-interactive 2>/dev/null \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['artifacts']['buildUrl'] if d else '')")
fi
[ -n "$IPA_URL" ] || { echo "❌ 완료된 iOS 빌드를 찾지 못했습니다"; exit 1; }
echo "  ipa: $IPA_URL"

BUNDLE=$(python3 -c "import json;print(json.load(open('app.json'))['expo']['ios']['bundleIdentifier'])")
VER=$(python3 -c "import json;print(json.load(open('app.json'))['expo']['version'])")

cat > "$REPO/admin/install/app.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key><string>software-package</string>
          <key>url</key><string>$IPA_URL</string>
        </dict>
        <dict>
          <key>kind</key><string>display-image</string>
          <key>url</key><string>https://neoix.kr/admin/icons/icon-512.png</string>
        </dict>
        <dict>
          <key>kind</key><string>full-size-image</string>
          <key>url</key><string>https://neoix.kr/admin/icons/icon-512.png</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key><string>$BUNDLE</string>
        <key>bundle-version</key><string>$VER</string>
        <key>kind</key><string>software</string>
        <key>title</key><string>NEOIX Admin</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>
PLIST

echo "— app.plist 생성 완료 → 배포"
cd "$REPO"
git add admin/install/app.plist
git commit -q -m "NEOIX Admin 원탭 설치 매니페스트 갱신 ($BUNDLE $VER)" || true
git push -q origin main
D=$(mktemp -d); git archive HEAD | tar -x -C "$D"; (cd "$D" && npx --yes wrangler deploy >/dev/null 2>&1)
echo "✅ 배포 완료 — 아이폰에서 https://neoix.kr/admin/install 열고 '설치하기'"
