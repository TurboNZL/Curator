#!/usr/bin/env bash
# Runs on a booted emulator (CI): installs the debug app, starts the service the way another app would, and waits for the server to answer.
# Proves that Node starts in-process, that node:sqlite works there, and that the bundled web client is served. It does NOT test yt-dlp or ffmpeg.
set -u
APK="${1:-apps/android-server/app/build/outputs/apk/debug/app-debug.apk}"
TOKEN="smoketoken0123456789abcdef"
fail() { echo "SMOKE FAILED: $*"; adb logcat -d -s TurboMusicNode TurboMusicServer AndroidRuntime:E DEBUG:F 2>&1 | tail -80; exit 1; }
adb install -r "$APK" || fail "install"
adb shell am start-foreground-service -n app.turbomusic.server/.ServerService --es token "$TOKEN" || fail "start the service"
adb forward tcp:47813 tcp:47813
for i in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:47813/api/health" > /tmp/health.json 2>/dev/null; then echo "health: $(cat /tmp/health.json) after ${i}s"; break; fi
  sleep 1
done
[ -s /tmp/health.json ] || fail "the server did not answer /api/health in 90 s"
curl -fsS -H "Authorization: Bearer $TOKEN" http://127.0.0.1:47813/api/status > /tmp/status.json || fail "/api/status with the token (the database did not open?)"
echo "status: $(cat /tmp/status.json)"
code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:47813/) ; [ "$code" = "200" ] || fail "the web client was not served at / (HTTP $code)"
echo "SMOKE OK"
adb logcat -d -s TurboMusicNode TurboMusicServer 2>&1 | tail -30
