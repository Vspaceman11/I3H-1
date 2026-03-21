#!/bin/bash
# Test script for City Reporter n8n workflow
# Usage: ./test-workflow.sh <YOUR_WEBHOOK_URL>
#
# Example:
#   ./test-workflow.sh https://your-instance.app.n8n.cloud/webhook/city-reporter/submit-issue

WEBHOOK_URL="${1:?Usage: ./test-workflow.sh <WEBHOOK_URL>}"

echo "=== Sending LOW-severity test issue to: $WEBHOOK_URL ==="
echo ""

RESPONSE=$(curl -s -w "\n---HTTP_CODE:%{http_code}---" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "issue_id": "test-low-001",
    "user_id": "user-123",
    "image_url": "https://images.unsplash.com/photo-1618477462146-050d2767eac4?w=640",
    "location": {
      "latitude": 49.1427,
      "longitude": 9.2109,
      "address": "Heilbronner Straße 7, 74072 Heilbronn"
    },
    "description": "A few small pieces of litter near a bench in a park, no immediate danger",
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/---HTTP_CODE:[0-9]*---//')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

echo ""
echo "=== Done ==="
