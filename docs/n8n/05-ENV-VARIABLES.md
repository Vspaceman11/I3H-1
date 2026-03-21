# 05 - Environment Variables

## Required Variables

Set these in n8n under Settings > Environment Variables or in your `.env` file.

---

## AI Service

```env
# OpenAI (GPT-4 Vision)
AI_ENDPOINT=https://api.openai.com/v1/chat/completions
AI_API_KEY=sk-...

# OR Anthropic (Claude)
AI_ENDPOINT=https://api.anthropic.com/v1/messages
AI_API_KEY=sk-ant-...

# OR Google (Gemini)
AI_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent
AI_API_KEY=...
```

---

## Database (Supabase Example)

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...  # For client-side
SUPABASE_SERVICE_KEY=eyJ... # For server-side (n8n)

# OR PostgreSQL Direct
DATABASE_URL=postgresql://user:pass@host:5432/cityreporter
```

---

## Maps & Geocoding

```env
# Google Maps (recommended)
GOOGLE_MAPS_API_KEY=AIza...

# OR OpenStreetMap (free, no key needed)
# Just use Nominatim endpoints directly
```

---

## Email (SMTP)

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=reports@cityreporter.app
SMTP_PASS=...
SMTP_FROM=City Reporter <reports@cityreporter.app>

# OR SendGrid
SENDGRID_API_KEY=SG...

# OR Mailgun
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=mg.cityreporter.app
```

---

## Push Notifications (Optional)

```env
# Firebase Cloud Messaging
FCM_SERVER_KEY=...
FCM_PROJECT_ID=cityreporter

# OR OneSignal
ONESIGNAL_APP_ID=...
ONESIGNAL_API_KEY=...
```

---

## Image Storage (Optional)

```env
# If handling image uploads in n8n
# Supabase Storage
SUPABASE_STORAGE_BUCKET=issue-images

# OR AWS S3
AWS_S3_BUCKET=cityreporter-images
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-central-1

# OR Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## Application URLs

```env
# Base URLs
APP_URL=https://cityreporter.app
API_URL=https://api.cityreporter.app
DASHBOARD_URL=https://admin.cityreporter.app

# n8n Webhook Base
N8N_WEBHOOK_URL=https://n8n.yourserver.com/webhook
```

---

## Security

```env
# Webhook Authentication
WEBHOOK_AUTH_HEADER=X-API-Key
WEBHOOK_AUTH_TOKEN=your-secret-token-here

# JWT for API calls (if needed)
JWT_SECRET=your-jwt-secret
```

---

## Environment-Specific

```env
# Development
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug

# Production
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error
```

---

## n8n Credentials Setup

In n8n, create these credential types:

### 1. Header Auth (for webhook)
- Name: `CityReporter API Key`
- Header Name: `X-API-Key`
- Header Value: `{{ $env.WEBHOOK_AUTH_TOKEN }}`

### 2. OpenAI API
- Name: `OpenAI`
- API Key: `{{ $env.AI_API_KEY }}`

### 3. Supabase
- Name: `Supabase`
- Host: `{{ $env.SUPABASE_URL }}`
- Service Role Key: `{{ $env.SUPABASE_SERVICE_KEY }}`

### 4. SMTP
- Name: `Email SMTP`
- Host: `{{ $env.SMTP_HOST }}`
- Port: `{{ $env.SMTP_PORT }}`
- User: `{{ $env.SMTP_USER }}`
- Password: `{{ $env.SMTP_PASS }}`

### 5. Google Maps
- Name: `Google Maps`
- API Key: `{{ $env.GOOGLE_MAPS_API_KEY }}`

---

## Minimum Required for Basic Setup

To get started, you only need:

```env
# Essential
AI_API_KEY=sk-...           # For image analysis
SUPABASE_URL=...            # For database
SUPABASE_SERVICE_KEY=...    # For database
SMTP_HOST=...               # For authority emails
SMTP_USER=...
SMTP_PASS=...
```

All other variables are for extended functionality.
