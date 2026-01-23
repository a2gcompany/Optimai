#!/bin/bash
# Monitor visual de Ralph

clear
while true; do
  tput cup 0 0

  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║              🤖 RALPH MONITOR - OPTIMAI                   ║"
  echo "╠════════════════════════════════════════════════════════════╣"

  # Estado
  if pgrep -f "ralph_loop" > /dev/null; then
    echo "║  Estado: 🟢 CORRIENDO                                      ║"
  else
    echo "║  Estado: 🔴 DETENIDO                                       ║"
  fi

  # Calls
  calls=$(cat .call_count 2>/dev/null || echo "0")
  echo "║  Calls esta hora: $calls/5                                   ║"

  # Último loop
  last_loop=$(grep -E "Starting Loop" logs/ralph.log 2>/dev/null | tail -1 | grep -oE "Loop #[0-9]+" || echo "Loop #0")
  echo "║  Último: $last_loop                                          ║"

  echo "╠════════════════════════════════════════════════════════════╣"
  echo "║  📋 ÚLTIMOS COMMITS                                        ║"
  echo "╠════════════════════════════════════════════════════════════╣"

  git log --oneline -5 --format="║  %h %s" 2>/dev/null | head -5 | while read line; do
    printf "%-60s║\n" "$line"
  done

  echo "╠════════════════════════════════════════════════════════════╣"
  echo "║  📜 LOG EN VIVO                                            ║"
  echo "╠════════════════════════════════════════════════════════════╣"

  tail -8 logs/ralph.log 2>/dev/null | while read line; do
    short="${line:0:58}"
    printf "║ %-58s ║\n" "$short"
  done

  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  Ctrl+C para salir"

  sleep 5
done
