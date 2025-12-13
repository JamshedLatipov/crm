#!/bin/bash
# Usage: find_busy_threads.sh <pid> <interval_seconds>
if [ -z "$1" ]; then
  echo "usage: $0 <pid> [interval_seconds]"
  exit 1
fi
PID="$1"
INT=${2:-1}
TMP1=/tmp/t1_$$
TMP2=/tmp/t2_$$
for t in /proc/$PID/task/*; do
  TID=$(basename "$t")
  if [ -r "/proc/$PID/task/$TID/stat" ]; then
    awk '{print $1, $14+$15}' "/proc/$PID/task/$TID/stat" >> "$TMP1"
  fi
done
sleep $INT
for t in /proc/$PID/task/*; do
  TID=$(basename "$t")
  if [ -r "/proc/$PID/task/$TID/stat" ]; then
    awk '{print $1, $14+$15}' "/proc/$PID/task/$TID/stat" >> "$TMP2"
  fi
done
awk 'NR==FNR{a[$1]=$2;next}{print $1, $2-a[$1]}' "$TMP1" "$TMP2" | sort -k2 -nr | head -n 20
rm -f "$TMP1" "$TMP2"
