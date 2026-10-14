#!/usr/bin/env bash
# Give the TurboMusic server a sound server, so Spotify Soloist can actually play.
#
#   sudo ./scripts/setup-pi-audio.sh [--user turbomusic] [--dry-run]
#
# Soloist plays only through PipeWire or PulseAudio. Raspberry Pi OS Lite has neither, and a server that systemd starts as its own account
# has no audio session: Soloist then connects to Spotify, shows up as a device, and plays nothing. This installs PipeWire (with its
# PulseAudio layer), lets the service account use the sound card, and keeps its audio session running without anyone logged in.
set -euo pipefail
USER_NAME="turbomusic"; DRY=0
while [ $# -gt 0 ]; do case "$1" in --user) USER_NAME="${2:?--user needs a name}"; shift 2 ;; --dry-run) DRY=1; shift ;; -h|--help) sed -n 2,10p "$0"; exit 0 ;; *) echo "unknown option $1" >&2; exit 2 ;; esac; done
say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
note() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[31mStopped: %s\033[0m\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY" = 1 ]; then printf '    [dry run] %s\n' "$*"; else "$@"; fi; }
[ "$DRY" = 1 ] || [ "$(id -u)" = 0 ] || die "run it with sudo"
command -v apt-get >/dev/null 2>&1 || die "this script is for Debian, Raspberry Pi OS and Ubuntu (apt). On another system install PipeWire with its package manager, then run: loginctl enable-linger $USER_NAME"
id "$USER_NAME" >/dev/null 2>&1 || { [ "$DRY" = 1 ] || die "the user $USER_NAME does not exist (run install-pi.sh first, or pass --user)"; }

say "1/4 Installing PipeWire (and ffmpeg, which \"Send the sound to the apps\" uses)"
run apt-get update -qq
run apt-get install -y pipewire pipewire-pulse wireplumber pulseaudio-utils alsa-utils ffmpeg

say "2/4 Letting $USER_NAME use the sound card"
run usermod -aG audio "$USER_NAME"

say "3/4 Keeping an audio session running for $USER_NAME"
run loginctl enable-linger "$USER_NAME"
# the sound server starts with that session; Debian ships these as user units, enabled for every account
run systemctl --global enable pipewire.socket pipewire-pulse.socket wireplumber.service
if [ "$DRY" = 0 ]; then
  uid="$(id -u "$USER_NAME")"
  systemctl start "user@${uid}.service" || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do [ -S "/run/user/$uid/pipewire-0" ] && break; sleep 1; done
fi

say "4/4 Checking"
if [ "$DRY" = 1 ]; then note "[dry run] would list the outputs PipeWire sees for $USER_NAME and restart turbomusic"; exit 0; fi
uid="$(id -u "$USER_NAME")"
if [ -S "/run/user/$uid/pipewire-0" ]; then note "PipeWire is running for $USER_NAME (/run/user/$uid/pipewire-0)"; else
  note "PipeWire did not start yet. Reboot once (sudo reboot) and run: ls /run/user/$uid/pipewire-0"; fi
note "Sound outputs this account can see:"
sudo -u "$USER_NAME" XDG_RUNTIME_DIR="/run/user/$uid" wpctl status 2>/dev/null | sed -n '/Sinks:/,/Sources:/p' | sed 's/^/      /' || note "(wpctl could not list them; run: sudo -u $USER_NAME XDG_RUNTIME_DIR=/run/user/$uid wpctl status)"
note "To pick a different output (HDMI, headphone jack, USB DAC), put its name in Settings > Spotify > Soloist > Output."
systemctl restart turbomusic 2>/dev/null && note "Restarted the turbomusic service." || note "Restart the server (sudo systemctl restart turbomusic) so it sees the new audio session."
echo
echo "Done. In TurboMusic: Settings > Library & server > Spotify > Soloist > Start. Turn the volume up on the Pi's speakers, and make sure the output you want is not muted (alsamixer)."
