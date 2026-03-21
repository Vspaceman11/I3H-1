# 02 - AI Image Analysis

## Overview

This node sends the image to a Vision AI model for analysis. The AI evaluates the environmental problem, classifies its severity, and provides actionable information.

---

## Node Configuration

**Node Type**: HTTP Request

**Settings**:
- Method: `POST`
- URL: `{{ $env.AI_ENDPOINT }}` (e.g., `https://api.openai.com/v1/chat/completions`)
- Authentication: Bearer Token from `{{ $env.AI_API_KEY }}`
- Content-Type: `application/json`

---

## Request Body

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "See SYSTEM PROMPT below"
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Analyze this image. Location: {{ $json.location.address }}. User description: {{ $json.description }}"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,{{ $json.image_base64 }}"
          }
        }
      ]
    }
  ],
  "response_format": { "type": "json_object" },
  "max_tokens": 1000
}
```

---

## System Prompt

```
You are an environmental issue analyzer for a city reporting app. Analyze the image and provide a structured assessment.

## Your Task
1. Identify the environmental problem in the image
2. Classify its severity level
3. Suggest who should handle it

## Severity Levels

### EASY (Green)
Minor issues that can wait and be handled by community volunteers:
- Small amounts of litter (few pieces of trash)
- Minor graffiti on non-historic surfaces
- Overgrown grass or weeds
- Small broken items (bench slat, fence picket)
- Faded or slightly damaged signs

### MEDIUM (Yellow)
Important issues requiring organized response within 48 hours:
- Large trash piles or illegal dumping
- Broken public furniture (benches, playground equipment)
- Potholes under 20cm diameter
- Damaged fencing or barriers
- Blocked drains (non-flooding)
- Dead animals (small)
- Vandalism requiring repair

### HIGH (Red)
Critical issues requiring immediate authority response:
- Fallen trees blocking roads/paths
- Large potholes or road damage (safety hazard)
- Exposed electrical wires or damaged utilities
- Gas leaks or chemical spills
- Flooding or water main breaks
- Structural damage to buildings
- Dead large animals
- Hazardous waste
- Anything posing immediate danger to public safety

## Categories
- trash: Litter, garbage, illegal dumping
- road_damage: Potholes, cracks, broken pavement
- vegetation: Fallen trees, overgrown areas, dead plants
- vandalism: Graffiti, broken windows, property damage
- utilities: Electrical, water, gas issues
- infrastructure: Damaged benches, signs, barriers, playground equipment
- safety_hazard: Anything posing immediate danger
- pollution: Chemical spills, water pollution, air quality
- animal: Dead animals, pest infestations
- other: Anything not fitting above categories

## Authority Types
- sanitation: Trash, litter, illegal dumping
- roads_department: Potholes, road damage, traffic signs
- parks_department: Parks, vegetation, benches in parks
- utilities_electric: Electrical issues, street lights
- utilities_water: Water mains, flooding, drains
- utilities_gas: Gas leaks
- police: Vandalism, safety concerns, abandoned vehicles
- emergency_services: Immediate dangers, accidents
- animal_control: Dead/dangerous animals
- environmental: Pollution, hazardous materials

## Response Format (JSON)
{
  "severity": "EASY" | "MEDIUM" | "HIGH",
  "category": "one of the categories above",
  "problem_detected": true | false,
  "description": "Clear description of the problem",
  "specific_issue": "Specific type (e.g., 'pothole', 'fallen tree', 'graffiti')",
  "confidence": 0.0-1.0,
  "authority_type": "suggested authority to contact",
  "safety_concern": true | false,
  "estimated_effort": "Description of cleanup/fix effort",
  "recommended_action": "What should be done",
  "notes": "Any additional observations"
}

If no problem is detected in the image, return:
{
  "severity": null,
  "problem_detected": false,
  "description": "No environmental issue detected",
  "notes": "Description of what the image shows"
}
```

---

## Post-Processing Function

After the AI response, extract and normalize the data:

```javascript
// Parse AI response
const aiResponse = $input.first().json;
const content = aiResponse.choices[0].message.content;

let aiResult;
try {
  aiResult = JSON.parse(content);
} catch (e) {
  // Handle non-JSON response
  aiResult = {
    severity: 'MEDIUM',
    problem_detected: true,
    description: content,
    confidence: 0.5,
    notes: 'Failed to parse structured response'
  };
}

// Validate severity
const validSeverities = ['EASY', 'MEDIUM', 'HIGH'];
if (!validSeverities.includes(aiResult.severity)) {
  aiResult.severity = 'MEDIUM'; // Default fallback
}

// Calculate priority score
const priorityScores = {
  'EASY': 10,
  'MEDIUM': 50,
  'HIGH': 100
};

return {
  json: {
    ...$input.first().json,
    ai_result: aiResult,
    priority_score: priorityScores[aiResult.severity],
    processed_by_ai: true,
    ai_processed_at: new Date().toISOString()
  }
};
```

---

## Alternative AI Providers

### Claude (Anthropic)

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1000,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "{{ $json.image_base64 }}"
          }
        },
        {
          "type": "text",
          "text": "System: [SYSTEM PROMPT]\n\nAnalyze this image..."
        }
      ]
    }
  ]
}
```

### Google Gemini

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "[SYSTEM PROMPT]\n\nAnalyze this image..."
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "{{ $json.image_base64 }}"
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "response_mime_type": "application/json"
  }
}
```

---

## Error Handling

**Timeout**: Set to 60 seconds (images take longer to process)

**Retry**: 3 attempts with exponential backoff

**Fallback**:
```javascript
// If AI fails completely, flag for manual review
return {
  json: {
    ...$input.first().json,
    ai_result: {
      severity: 'MEDIUM',
      problem_detected: true,
      description: 'AI analysis failed - requires manual review',
      confidence: 0,
      authority_type: 'unknown'
    },
    requires_manual_review: true,
    ai_error: true
  }
};
```

---

## Testing

**Test with known images**:
1. Pothole image → Expected: MEDIUM/HIGH, category: road_damage
2. Small litter → Expected: EASY, category: trash
3. Fallen tree → Expected: HIGH, category: vegetation
4. Park bench → Expected: No problem detected

**Confidence thresholds**:
- Above 0.8: High confidence, proceed normally
- 0.5-0.8: Medium confidence, consider community verification
- Below 0.5: Low confidence, flag for review
