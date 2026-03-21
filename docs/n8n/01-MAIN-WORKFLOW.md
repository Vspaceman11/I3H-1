# 01 - Main Workflow Architecture

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CITY REPORTER MAIN WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────────────────┐   │
│  │ Webhook  │───▶│ Validate │───▶│   AI     │───▶│  Severity Switch    │   │
│  │ Trigger  │    │  Input   │    │ Analysis │    │                     │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┬──────────┘   │
│                                                              │              │
│                    ┌─────────────────┬───────────────────────┤              │
│                    ▼                 ▼                       ▼              │
│             ┌───────────┐     ┌───────────┐          ┌───────────────┐     │
│             │   EASY    │     │  MEDIUM   │          │     HIGH      │     │
│             │  Handler  │     │  Handler  │          │    Handler    │     │
│             └─────┬─────┘     └─────┬─────┘          └───────┬───────┘     │
│                   │                 │                        │              │
│                   │                 │                ┌───────▼───────┐     │
│                   │                 │                │  Authority    │     │
│                   │                 │                │  Contact      │     │
│                   │                 │                │  Sub-Workflow │     │
│                   │                 │                └───────┬───────┘     │
│                   │                 │                        │              │
│                   └────────────────┬┴────────────────────────┘              │
│                                    ▼                                        │
│                           ┌──────────────┐                                  │
│                           │  Save to DB  │                                  │
│                           │  & Respond   │                                  │
│                           └──────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Node 1: Webhook Trigger

**Node Type**: Webhook

**Settings**:
- HTTP Method: `POST`
- Path: `city-reporter/submit-issue`
- Authentication: `Header Auth` (recommended)
- Response Mode: `Response using Respond to Webhook node`

**Expected Request Body**:
```json
{
  "issue_id": "uuid-v4",
  "user_id": "uuid-v4",
  "image_url": "https://your-storage.com/uploads/image.jpg",
  "image_base64": "optional - base64 encoded image",
  "location": {
    "latitude": 55.7558,
    "longitude": 37.6173,
    "address": "User-provided or reverse-geocoded address"
  },
  "description": "Optional user description of the problem",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Node 2: Validate Input

**Node Type**: Function

**Purpose**: Validate required fields and prepare data

```javascript
// Validate Input Function
const input = $input.first().json;

// Required field validation
const required = ['issue_id', 'user_id', 'location'];
const missing = required.filter(field => !input[field]);

if (missing.length > 0) {
  throw new Error(`Missing required fields: ${missing.join(', ')}`);
}

// Must have either image_url or image_base64
if (!input.image_url && !input.image_base64) {
  throw new Error('Either image_url or image_base64 is required');
}

// Validate location
if (!input.location.latitude || !input.location.longitude) {
  throw new Error('Location must include latitude and longitude');
}

// Prepare normalized output
return {
  json: {
    issue_id: input.issue_id,
    user_id: input.user_id,
    image_url: input.image_url || null,
    image_base64: input.image_base64 || null,
    location: {
      latitude: parseFloat(input.location.latitude),
      longitude: parseFloat(input.location.longitude),
      address: input.location.address || 'Unknown'
    },
    description: input.description || '',
    timestamp: input.timestamp || new Date().toISOString(),
    validated_at: new Date().toISOString()
  }
};
```

---

## Node 3: Fetch Image (Conditional)

**Node Type**: HTTP Request (only if image_url provided)

**Purpose**: Download image if URL provided, convert to base64

**Settings**:
- Method: `GET`
- URL: `{{ $json.image_url }}`
- Response Format: `File`

**Post-processing Function**:
```javascript
// Convert downloaded image to base64
const imageBuffer = $input.first().binary.data;
const base64 = Buffer.from(imageBuffer.data, 'base64').toString('base64');

return {
  json: {
    ...$input.first().json,
    image_base64: base64,
    image_mime: imageBuffer.mimeType || 'image/jpeg'
  }
};
```

---

## Node 4: AI Analysis

See `02-AI-IMAGE-ANALYSIS.md` for detailed configuration.

**Summary**: Sends image to GPT-4 Vision for analysis, returns:
- Severity level (EASY/MEDIUM/HIGH)
- Problem category
- Description
- Suggested authority type

---

## Node 5: Severity Switch

**Node Type**: Switch

**Routing Rules**:

| Output | Condition | Description |
|--------|-----------|-------------|
| 0 | `{{ $json.ai_result.severity }}` equals `EASY` | Minor issues |
| 1 | `{{ $json.ai_result.severity }}` equals `MEDIUM` | Important issues |
| 2 | `{{ $json.ai_result.severity }}` equals `HIGH` | Critical issues |
| Fallback | Default | Treat as MEDIUM |

See `03-SEVERITY-ROUTING.md` for handler details.

---

## Node 6: Save to Database

**Node Type**: Supabase / PostgreSQL / HTTP Request

**Table**: `issues`

**Fields to Save**:
```json
{
  "id": "{{ $json.issue_id }}",
  "user_id": "{{ $json.user_id }}",
  "severity": "{{ $json.ai_result.severity }}",
  "status": "{{ $json.status }}",
  "category": "{{ $json.ai_result.category }}",
  "ai_description": "{{ $json.ai_result.description }}",
  "user_description": "{{ $json.description }}",
  "latitude": "{{ $json.location.latitude }}",
  "longitude": "{{ $json.location.longitude }}",
  "address": "{{ $json.location.address }}",
  "image_url": "{{ $json.image_url }}",
  "priority_score": "{{ $json.priority_score }}",
  "created_at": "{{ $json.timestamp }}",
  "processed_at": "{{ $now }}"
}
```

---

## Node 7: Respond to Webhook

**Node Type**: Respond to Webhook

**Success Response**:
```json
{
  "success": true,
  "issue_id": "{{ $json.issue_id }}",
  "severity": "{{ $json.ai_result.severity }}",
  "status": "{{ $json.status }}",
  "message": "Issue received and processed"
}
```

**Error Response** (on Error Trigger):
```json
{
  "success": false,
  "error": "{{ $json.error.message }}",
  "code": "PROCESSING_ERROR"
}
```

---

## Error Handling

Add an **Error Trigger** node connected to error handling:

1. **Log Error**: Save to error log table
2. **Retry Logic**: For transient failures (AI timeout, DB connection)
3. **Manual Queue**: Flag for human review if AI fails

```javascript
// Error handler function
const error = $input.first().json.error;
const originalData = $input.first().json.execution?.data;

return {
  json: {
    error_type: error.name || 'UnknownError',
    error_message: error.message,
    issue_id: originalData?.issue_id || 'unknown',
    timestamp: new Date().toISOString(),
    requires_manual_review: true
  }
};
```

---

## Testing the Workflow

**Test Payload**:
```json
{
  "issue_id": "test-001",
  "user_id": "user-123",
  "image_url": "https://example.com/test-image.jpg",
  "location": {
    "latitude": 55.7558,
    "longitude": 37.6173,
    "address": "Test Address, Moscow"
  },
  "description": "Test issue - fallen tree blocking sidewalk",
  "timestamp": "2024-01-15T10:30:00Z"
}
```
