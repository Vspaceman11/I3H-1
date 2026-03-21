# 04 - High Priority Agent (Authority Contact)

## Overview

When an issue is classified as HIGH severity, this sub-workflow automatically:
1. Determines the geographic jurisdiction
2. Finds relevant local authorities
3. Composes and sends notifications (email, form submission)
4. Tracks response status

---

## Sub-Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HIGH PRIORITY AGENT SUB-WORKFLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌───────────────┐    ┌─────────────────┐                   │
│  │ Trigger  │───▶│ Reverse       │───▶│ Find Authority  │                   │
│  │ (Input)  │    │ Geocode       │    │ Database        │                   │
│  └──────────┘    └───────────────┘    └────────┬────────┘                   │
│                                                 │                            │
│                         ┌───────────────────────┼───────────────────┐       │
│                         ▼                       ▼                   ▼       │
│                  ┌────────────┐         ┌────────────┐      ┌────────────┐  │
│                  │ Send Email │         │ Submit     │      │ API Call   │  │
│                  │            │         │ Web Form   │      │ (if avail) │  │
│                  └─────┬──────┘         └─────┬──────┘      └─────┬──────┘  │
│                        │                      │                   │         │
│                        └──────────────────────┼───────────────────┘         │
│                                               ▼                             │
│                                    ┌─────────────────┐                      │
│                                    │ Log & Update    │                      │
│                                    │ Issue Status    │                      │
│                                    └─────────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Node 1: Trigger (Execute Workflow)

**Receives from HIGH Handler**:
```json
{
  "issue_id": "uuid",
  "location": {
    "latitude": 55.7558,
    "longitude": 37.6173,
    "address": "Known address or empty"
  },
  "ai_result": {
    "severity": "HIGH",
    "category": "vegetation",
    "description": "Large fallen tree blocking main road",
    "authority_type": "roads_department",
    "safety_concern": true
  },
  "image_url": "https://...",
  "reporter_id": "user-uuid",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Node 2: Reverse Geocode

**Purpose**: Get detailed location info to determine jurisdiction

**Option A: Google Maps Geocoding API**

**Node Type**: HTTP Request
```
Method: GET
URL: https://maps.googleapis.com/maps/api/geocode/json
Query Parameters:
  - latlng: {{ $json.location.latitude }},{{ $json.location.longitude }}
  - key: {{ $env.GOOGLE_MAPS_API_KEY }}
  - language: ru (or local language)
  - result_type: administrative_area_level_2|locality|sublocality
```

**Option B: OpenStreetMap Nominatim (Free)**

```
Method: GET
URL: https://nominatim.openstreetmap.org/reverse
Query Parameters:
  - lat: {{ $json.location.latitude }}
  - lon: {{ $json.location.longitude }}
  - format: json
  - addressdetails: 1
Headers:
  - User-Agent: CityReporterApp/1.0
```

**Response Processing**:
```javascript
// Extract jurisdiction info
const geoData = $input.first().json;

// Google Maps format
const addressComponents = geoData.results[0].address_components;

const jurisdiction = {
  country: findComponent(addressComponents, 'country'),
  region: findComponent(addressComponents, 'administrative_area_level_1'),
  city: findComponent(addressComponents, 'locality'),
  district: findComponent(addressComponents, 'administrative_area_level_2'),
  neighborhood: findComponent(addressComponents, 'sublocality'),
  postal_code: findComponent(addressComponents, 'postal_code'),
  formatted_address: geoData.results[0].formatted_address
};

function findComponent(components, type) {
  const comp = components.find(c => c.types.includes(type));
  return comp ? comp.long_name : null;
}

return {
  json: {
    ...$input.first().json,
    jurisdiction
  }
};
```

---

## Node 3: Find Authority Database

**Purpose**: Look up contact info for relevant authority based on:
- Location (city/district)
- Issue category
- Authority type suggested by AI

### Option A: Internal Database (Supabase)

**Table Structure**: `authorities`
```sql
CREATE TABLE authorities (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  authority_type VARCHAR(50) NOT NULL,
  -- Coverage area
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  district VARCHAR(100),
  -- Contact methods
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  contact_form_url VARCHAR(255),
  api_endpoint VARCHAR(255),
  -- Metadata
  categories TEXT[], -- Issues they handle
  response_sla_hours INT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- Index for location lookup
CREATE INDEX idx_authorities_location 
ON authorities(country, region, city, district);
```

**Query Node**:
```sql
SELECT * FROM authorities
WHERE 
  authority_type = :authority_type
  AND city = :city
  AND (district = :district OR district IS NULL)
  AND is_active = true
ORDER BY 
  CASE WHEN district = :district THEN 0 ELSE 1 END
LIMIT 3;
```

### Option B: Google Places API (Dynamic Lookup)

```
Method: GET
URL: https://maps.googleapis.com/maps/api/place/nearbysearch/json
Query Parameters:
  - location: {{ $json.location.latitude }},{{ $json.location.longitude }}
  - radius: 10000
  - type: local_government_office
  - keyword: {{ $json.ai_result.authority_type }}
  - key: {{ $env.GOOGLE_MAPS_API_KEY }}
```

### Option C: AI-Assisted Lookup

Use AI to find contact info:

```javascript
// Prompt for AI to find authority
const prompt = `
Find the contact information for the local authority responsible for:
- Issue type: ${issue.ai_result.category}
- Location: ${issue.jurisdiction.formatted_address}
- City: ${issue.jurisdiction.city}
- Country: ${issue.jurisdiction.country}

Required authority type: ${issue.ai_result.authority_type}

Provide in JSON format:
{
  "authority_name": "Official name",
  "department": "Specific department if known",
  "email": "contact email",
  "phone": "phone number",
  "website": "official website",
  "contact_form": "URL to online form if exists",
  "confidence": 0-1
}
`;
```

---

## Node 4: Send Email

**Node Type**: Send Email (SMTP) or HTTP Request (API)

**Email Template**:
```
Subject: [URGENT] Environmental Issue Report - {{ category }} at {{ address }}

To: {{ authority.email }}

Dear {{ authority.name }},

An environmental issue requiring urgent attention has been reported through the City Reporter system.

ISSUE DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: {{ ai_result.category }}
Severity: HIGH - Immediate attention required
Description: {{ ai_result.description }}
Safety Concern: {{ ai_result.safety_concern ? 'YES' : 'No' }}

LOCATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Address: {{ jurisdiction.formatted_address }}
Coordinates: {{ location.latitude }}, {{ location.longitude }}
Google Maps: https://maps.google.com/?q={{ location.latitude }},{{ location.longitude }}

PHOTO EVIDENCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{ image_url }}

REPORT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report ID: {{ issue_id }}
Reported: {{ timestamp }}
Status: Awaiting authority response

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This report was generated automatically by City Reporter.
To view full details or update status, visit:
{{ dashboard_url }}/issues/{{ issue_id }}

If this is not within your jurisdiction, please forward to the appropriate department.

Best regards,
City Reporter System
```

**SMTP Configuration**:
```json
{
  "fromEmail": "reports@cityreporter.app",
  "toEmail": "{{ $json.authority.email }}",
  "subject": "[URGENT] Environmental Issue - {{ $json.ai_result.category }}",
  "html": "{{ $json.email_html }}",
  "attachments": [],
  "replyTo": "no-reply@cityreporter.app"
}
```

---

## Node 5: Submit Web Form (Optional)

**Purpose**: Some authorities have online complaint forms

**Node Type**: HTTP Request

```javascript
// Example for a municipality form
// This varies greatly by authority

const formData = {
  name: 'City Reporter System',
  email: 'reports@cityreporter.app',
  phone: '',
  category: mapCategoryToFormValue($json.ai_result.category),
  description: $json.ai_result.description,
  address: $json.jurisdiction.formatted_address,
  latitude: $json.location.latitude,
  longitude: $json.location.longitude,
  image_url: $json.image_url,
  urgency: 'high'
};

// Submit as form-data or JSON depending on endpoint
```

---

## Node 6: Log & Update Status

**Update Issue in Database**:
```javascript
// Authority contact log
const contactLog = {
  issue_id: $json.issue_id,
  timestamp: new Date().toISOString(),
  authority: {
    name: $json.authority.name,
    email: $json.authority.email,
    type: $json.authority.authority_type
  },
  methods_used: [],
  results: {}
};

// Add email result
if ($json.email_sent) {
  contactLog.methods_used.push('email');
  contactLog.results.email = {
    sent: true,
    to: $json.authority.email,
    message_id: $json.email_message_id
  };
}

// Add form submission result
if ($json.form_submitted) {
  contactLog.methods_used.push('web_form');
  contactLog.results.web_form = {
    submitted: true,
    url: $json.authority.contact_form_url,
    confirmation_id: $json.form_confirmation_id
  };
}

return {
  json: {
    update_issue: {
      id: $json.issue_id,
      status: 'authority_contacted',
      authority_contact_log: contactLog,
      authority_contacted_at: new Date().toISOString()
    }
  }
};
```

---

## Fallback Handling

If no authority found or contact fails:

```javascript
// Fallback logic
const issue = $input.first().json;
const fallbackActions = [];

// 1. Try general municipal contact
if (!issue.authority_found) {
  fallbackActions.push({
    action: 'contact_general_municipality',
    target: getMunicipalityGeneralContact(issue.jurisdiction.city)
  });
}

// 2. Alert human moderator
fallbackActions.push({
  action: 'alert_moderator',
  message: `HIGH priority issue ${issue.issue_id} - no authority contact found`,
  issue_id: issue.issue_id
});

// 3. Post to public escalation queue
fallbackActions.push({
  action: 'add_to_escalation_queue',
  issue_id: issue.issue_id,
  reason: 'authority_contact_failed'
});

return { json: { fallbackActions } };
```

---

## Response Tracking

### Scheduled Check (Separate Workflow)

Run every hour to check for authority responses:

```javascript
// Check for unresponded HIGH issues
const query = {
  status: 'authority_contacted',
  severity: 'HIGH',
  authority_contacted_at: {
    lt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
  }
};

// For each, escalate or re-contact
```

### Actions on No Response:
1. After 4 hours: Send follow-up email
2. After 12 hours: Try alternative contact method
3. After 24 hours: Alert human moderator + mark as "escalated"

---

## Authority Database Seeding

Example data for common authority types:

```json
[
  {
    "authority_type": "roads_department",
    "name": "City Roads Department",
    "city": "Moscow",
    "email": "roads@mos.ru",
    "categories": ["road_damage", "infrastructure"]
  },
  {
    "authority_type": "sanitation",
    "name": "Sanitation Services",
    "city": "Moscow", 
    "email": "sanitation@mos.ru",
    "categories": ["trash", "pollution"]
  },
  {
    "authority_type": "utilities_electric",
    "name": "Power Grid Company",
    "city": "Moscow",
    "email": "emergency@power.ru",
    "phone": "+7-xxx-xxx-xxxx",
    "categories": ["utilities"]
  },
  {
    "authority_type": "emergency_services",
    "name": "Emergency Services",
    "city": "Moscow",
    "phone": "112",
    "categories": ["safety_hazard"]
  }
]
```
