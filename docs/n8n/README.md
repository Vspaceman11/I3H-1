# City Reporter - n8n Workflow Documentation

## Overview

This folder contains instructions for building the n8n workflow that coordinates:
- Image analysis from citizen reports
- AI-powered issue classification
- Severity-based routing (EASY / MEDIUM / HIGH)
- Automated authority contact for critical issues

---

## Documentation Structure

```
n8n/
├── README.md                    # This file - overview & quick start
├── 01-MAIN-WORKFLOW.md          # Main workflow architecture
├── 02-AI-IMAGE-ANALYSIS.md      # AI node configuration & prompts
├── 03-SEVERITY-ROUTING.md       # EASY/MEDIUM/HIGH criteria & handlers
├── 04-HIGH-PRIORITY-AGENT.md    # Authority lookup & contact automation
└── 05-ENV-VARIABLES.md          # Required environment variables
```

---

## Quick Start

### 1. Import Order
1. Set up environment variables (see `05-ENV-VARIABLES.md`)
2. Create main workflow (see `01-MAIN-WORKFLOW.md`)
3. Configure AI analysis (see `02-AI-IMAGE-ANALYSIS.md`)
4. Set up severity routing (see `03-SEVERITY-ROUTING.md`)
5. Build HIGH priority agent (see `04-HIGH-PRIORITY-AGENT.md`)

### 2. Workflow Flow

```
User Photo → Webhook → AI Analysis → Severity Router
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
                  EASY                 MEDIUM                 HIGH
              (community)           (volunteers)          (authorities)
                    │                     │                     │
                    └─────────────────────┴─────────────────────┘
                                          ▼
                                    Store & Notify
```

---

## Severity Levels Summary

| Level | Response Time | Who Handles | Example |
|-------|---------------|-------------|---------|
| EASY | When possible | Community volunteers | Small litter, minor graffiti |
| MEDIUM | Within 48h | Organized volunteers | Large trash pile, broken bench |
| HIGH | Immediate | Local authorities | Fallen tree on road, gas leak |

---

## Key Integration Points

- **Webhook**: Receives reports from mobile app/web
- **AI API**: OpenAI GPT-4 Vision or similar
- **Database**: Supabase/PostgreSQL for issue storage
- **Maps API**: Google Maps for authority lookup
- **Email/SMS**: For authority notifications
