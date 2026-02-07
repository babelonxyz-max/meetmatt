#!/bin/bash

# Watch for user input events in real-time

echo "=== Watching for user inputs on localhost:3000 ==="
echo "Press Ctrl+C to stop"
echo ""

LAST_COUNT=0

while true; do
  # Get events from monitor API
  RESPONSE=$(curl -s "http://localhost:3000/api/monitor" 2>/dev/null)
  
  # Extract keystroke events
  COUNT=$(echo "$RESPONSE" | grep -o '"keystroke"' | wc -l | tr -d ' ')
  
  # Get latest agent_name value
  LATEST=$(echo "$RESPONSE" | grep -o '"value":"[^"]*"' | grep -v 'valueLength' | head -1 | cut -d'"' -f4)
  
  if [ "$COUNT" -ne "$LAST_COUNT" ] && [ -n "$LATEST" ]; then
    clear
    echo "=== LIVE INPUT MONITOR ==="
    echo "Last update: $(date '+%H:%M:%S')"
    echo ""
    echo "CURRENT INPUT:"
    echo "  $LATEST"
    echo ""
    echo "Recent events:"
    echo "$RESPONSE" | grep -E '(keystroke|agent_name_submitted)' | tail -10
    echo ""
    
    LAST_COUNT=$COUNT
  fi
  
  sleep 0.5
done
