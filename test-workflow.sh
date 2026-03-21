#!/bin/bash
# Test script for City Reporter n8n workflow
# Usage: ./test-workflow.sh <YOUR_WEBHOOK_URL> [USER_ID]
#
# Example:
#   ./test-workflow.sh https://your-instance.app.n8n.cloud/webhook/city-reporter/submit-issue jh7abc123def456

WEBHOOK_URL="${1:?Usage: ./test-workflow.sh <WEBHOOK_URL> [USER_ID]}"
USER_ID="${2:-test-user-001}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo "=== City Reporter: Full submission test ==="
echo "Webhook:   $WEBHOOK_URL"
echo "User ID:   $USER_ID"
echo "Timestamp: $TIMESTAMP"
echo ""

RESPONSE=$(curl -s -w "\n---HTTP_CODE:%{http_code}---" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"image_url\": \"https://images.unsplash.com/photo-1618477462146-050d2767eac4?w=640\",
    \"user_id\": \"$USER_ID\",
    \"location\": {
      \"latitude\": 49.1427,
      \"longitude\": 9.2109,
      \"address\": \"Kaiserstraße 27, 74072 Heilbronn\"
    },
    \"timestamp\": \"$TIMESTAMP\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/---HTTP_CODE:[0-9]*---//')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

echo ""
echo "=== Done ==="
