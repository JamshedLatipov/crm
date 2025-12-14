#!/usr/bin/env bash
# Collect Asterisk SIP/RTPC traces and initial CLI state for debugging one-way audio
# Usage: run from repo root: ./scripts/collect_asterisk_traces.sh

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT_DIR="$ROOT_DIR/diagnostics"
mkdir -p "$OUT_DIR"

DC_CMD=""
if command -v "docker" >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  DC_CMD="docker compose"
elif command -v "docker-compose" >/dev/null 2>&1; then
  DC_CMD="docker-compose"
else
  echo "Neither 'docker compose' nor 'docker-compose' found in PATH. Install Docker Compose or run commands manually." >&2
  exit 1
fi

ASTERISK_SVC=asterisk
PCAP_REMOTE=/tmp/trace.pcap
PIDFILE=/tmp/tcpdump.pid

echo "Using: $DC_CMD"
echo "Output directory: $OUT_DIR"

echo "Collecting initial Asterisk CLI state..."
# Run several CLI commands and save output
$DC_CMD exec -T $ASTERISK_SVC asterisk -rx "core set verbose 5; core set debug 5; pjsip set logger on; pjsip show endpoints; pjsip show aors; pjsip show registrations" > "$OUT_DIR/asterisk_initial.log" 2>&1 || true

echo "Starting tcpdump inside asterisk container (captures UDP 5060, WS 8089, RTP range 10000-10020)..."
$DC_CMD exec -T $ASTERISK_SVC sh -c "(tcpdump -i any -n -s 0 -w $PCAP_REMOTE 'udp and (port 5060 or portrange 10000-10020) or tcp port 8089') >/dev/null 2>&1 & echo \$! > $PIDFILE" || true

echo "tcpdump started. Make the failing call now (operator1 → operator2)."
read -r -p "When done reproducing the issue, press ENTER to stop capture and collect files..."

echo "Stopping tcpdump and collecting files..."
$DC_CMD exec -T $ASTERISK_SVC sh -c "if [ -f $PIDFILE ]; then kill \$(cat $PIDFILE) || true; fi" || true

# copy pcap out
CONTAINER_ID=$($DC_CMD ps -q $ASTERISK_SVC || true)
if [ -n "$CONTAINER_ID" ]; then
  echo "Copying pcap from container $CONTAINER_ID to $OUT_DIR/trace.pcap"
  docker cp "$CONTAINER_ID:$PCAP_REMOTE" "$OUT_DIR/trace.pcap" || true
  # also grab a short asterisk console log and pjsip logger dump
  $DC_CMD exec -T $ASTERISK_SVC asterisk -rx "pjsip show endpoints" > "$OUT_DIR/pjsip_endpoints.log" 2>&1 || true
  $DC_CMD exec -T $ASTERISK_SVC asterisk -rx "pjsip show aors" > "$OUT_DIR/pjsip_aors.log" 2>&1 || true
  $DC_CMD exec -T $ASTERISK_SVC asterisk -rx "pjsip show registrations" > "$OUT_DIR/pjsip_regs.log" 2>&1 || true
  echo "Collected logs in $OUT_DIR"
else
  echo "Could not determine container id for $ASTERISK_SVC; tcpdump capture may still be in container at $PCAP_REMOTE. Please copy manually." >&2
fi

echo "Done. Please attach $OUT_DIR/trace.pcap and the logs when you share results." 
