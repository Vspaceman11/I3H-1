# 03 - Severity Routing & Handlers

## Overview

After AI analysis, issues are routed to different handlers based on severity level. Each handler has specific logic for how the issue should be processed and who should be notified.

---

## Severity Switch Node

**Node Type**: Switch

**Configuration**:
```
Mode: Rules
Data Type: String
Value: {{ $json.ai_result.severity }}

Rules:
  Output 0: equals "EASY"
  Output 1: equals "MEDIUM"  
  Output 2: equals "HIGH"
  Fallback: Output 1 (treat unknown as MEDIUM)
```

---

## EASY Handler (Output 0)

### Purpose
Minor issues that can be resolved by community volunteers at their convenience.

### Criteria
- Small litter (few items)
- Minor graffiti
- Overgrown grass
- Small maintenance issues

### Processing Logic

```javascript
// EASY Handler Function
const input = $input.first().json;

return {
  json: {
    ...input,
    severity: 'EASY',
    status: 'open',
    priority_score: 10,
    
    // Notification settings
    notifications: {
      push_to_nearby_users: true,
      push_radius_km: 1,
      add_to_community_feed: true,
      notify_volunteers: false,
      notify_authorities: false
    },
    
    // Points for reporter
    reporter_points: 5,
    
    // Resolution settings
    resolution: {
      can_be_community_resolved: true,
      estimated_volunteers_needed: 1,
      estimated_time_minutes: 15,
      requires_verification: true
    },
    
    // Expiry (auto-close if not addressed)
    auto_close_days: 30
  }
};
```

### Actions
1. Save to database with status `open`
2. Add to public community feed
3. Send optional push to users within 1km
4. Award 5 points to reporter
5. Enable community resolution (before/after photos)

---

## MEDIUM Handler (Output 1)

### Purpose
Important issues requiring organized volunteer response within 48 hours.

### Criteria
- Large trash piles
- Broken public furniture
- Medium potholes
- Blocked drains
- Vandalism

### Processing Logic

```javascript
// MEDIUM Handler Function
const input = $input.first().json;

return {
  json: {
    ...input,
    severity: 'MEDIUM',
    status: 'attention_needed',
    priority_score: 50,
    
    // Notification settings
    notifications: {
      push_to_nearby_users: true,
      push_radius_km: 2,
      add_to_community_feed: true,
      notify_volunteers: true,
      notify_authorities: false, // Not yet
      notify_municipal_dashboard: true // If connected
    },
    
    // Points for reporter
    reporter_points: 15,
    
    // Resolution settings
    resolution: {
      can_be_community_resolved: true,
      estimated_volunteers_needed: '2-4',
      estimated_time_minutes: 60,
      requires_verification: true,
      requires_before_after_photos: true
    },
    
    // Escalation rules
    escalation: {
      escalate_to_high_after_hours: 72,
      escalate_if_reports_count: 3, // Same location
      escalate_if_not_resolved_days: 7
    },
    
    // Cluster detection flag
    check_for_clusters: true
  }
};
```

### Actions
1. Save to database with status `attention_needed`
2. Add to community feed with highlight
3. Notify registered volunteers in 2km radius
4. Update municipal dashboard (if connected)
5. Award 15 points to reporter
6. Schedule cluster check (see below)
7. Set escalation timer

### Cluster Detection Sub-flow

Check if similar issues reported nearby:

```javascript
// Cluster Detection Function
// Run after saving to DB

const issue = $input.first().json;

// Query: Find similar issues within 500m, last 72 hours
const clusterQuery = {
  latitude: issue.location.latitude,
  longitude: issue.location.longitude,
  radius_meters: 500,
  category: issue.ai_result.category,
  hours_lookback: 72,
  exclude_id: issue.issue_id
};

// This would be a Supabase/DB query node
// If count >= 2 (3 total including current), escalate

return {
  json: {
    ...issue,
    cluster_check: clusterQuery
  }
};
```

**If cluster detected (3+ reports)**:
- Auto-escalate to HIGH
- Merge reports into single incident
- Increase priority score

---

## HIGH Handler (Output 2)

### Purpose
Critical issues requiring immediate response from local authorities.

### Criteria
- Fallen trees blocking passage
- Large potholes (safety hazard)
- Exposed utilities
- Gas leaks
- Flooding
- Structural damage
- Any immediate danger

### Processing Logic

```javascript
// HIGH Handler Function
const input = $input.first().json;

return {
  json: {
    ...input,
    severity: 'HIGH',
    status: 'urgent',
    priority_score: 100,
    
    // Notification settings
    notifications: {
      push_to_nearby_users: true,
      push_radius_km: 5,
      push_message: 'CAUTION: Environmental hazard reported nearby',
      add_to_community_feed: true,
      notify_volunteers: true,
      notify_authorities: true, // TRIGGER AUTHORITY CONTACT
      notify_municipal_dashboard: true,
      send_urgent_alert: true
    },
    
    // Points for reporter
    reporter_points: 30,
    
    // Authority contact required
    authority_contact: {
      required: true,
      authority_type: input.ai_result.authority_type,
      urgency: 'immediate',
      auto_email: true,
      auto_call: false, // Requires premium/municipal setup
      fallback_to_general: true
    },
    
    // Resolution settings
    resolution: {
      can_be_community_resolved: false, // Too dangerous
      requires_professional: true,
      requires_verification: true,
      track_authority_response: true
    },
    
    // Tracking
    tracking: {
      enable_realtime: true,
      update_interval_minutes: 30,
      max_response_time_hours: 24,
      escalate_if_no_response_hours: 4
    }
  }
};
```

### Actions
1. Save to database with status `urgent`
2. **TRIGGER: Authority Contact Sub-Workflow** (see `04-HIGH-PRIORITY-AGENT.md`)
3. Send urgent push notifications (5km radius)
4. Highlight on municipal dashboard
5. Award 30 points to reporter
6. Enable real-time tracking
7. Set response deadline timers

---

## Status Flow

```
EASY:    open → in_progress → resolved → verified
MEDIUM:  attention_needed → in_progress → resolved → verified
                         ↘ escalated → [becomes HIGH]
HIGH:    urgent → authority_contacted → in_progress → resolved → verified
                                     ↘ escalated (no response)
```

---

## Priority Score Calculation

Base scores:
- EASY: 10
- MEDIUM: 50
- HIGH: 100

Modifiers:
```javascript
function calculatePriorityScore(issue) {
  let score = basePriorityScores[issue.severity];
  
  // Multiple reports boost
  score += issue.similar_reports_count * 10;
  
  // Safety concern boost
  if (issue.ai_result.safety_concern) {
    score += 30;
  }
  
  // High confidence boost
  if (issue.ai_result.confidence > 0.9) {
    score += 10;
  }
  
  // Age penalty (older = more urgent)
  const hoursOld = (Date.now() - new Date(issue.created_at)) / 3600000;
  score += Math.min(hoursOld * 2, 50);
  
  return Math.min(score, 200); // Cap at 200
}
```

---

## Database Status Values

```sql
-- Issue statuses
CREATE TYPE issue_status AS ENUM (
  'open',              -- EASY: Waiting for volunteers
  'attention_needed',  -- MEDIUM: Needs organized response
  'urgent',            -- HIGH: Immediate action required
  'authority_contacted', -- HIGH: Authorities notified
  'in_progress',       -- Being resolved
  'resolved',          -- Claimed resolved
  'verified',          -- Community verified resolution
  'closed',            -- Confirmed closed
  'escalated',         -- Moved to higher severity
  'invalid'            -- Marked as invalid/spam
);
```

---

## Notifications Template

### EASY Push
```
New issue nearby: {{ category }}
{{ description | truncate(50) }}
📍 {{ distance }}m away
Tap to help!
```

### MEDIUM Push
```
Help needed: {{ category }}
{{ description | truncate(50) }}
📍 {{ address }}
{{ volunteers_needed }} volunteers needed
```

### HIGH Push
```
⚠️ CAUTION: {{ category }} reported
{{ description | truncate(50) }}
📍 {{ address }}
Authorities have been notified
```
