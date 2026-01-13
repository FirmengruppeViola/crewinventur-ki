# Railway Environment Variables

**WICHTIG:** Diese müssen im Railway Dashboard unter "Variables" gesetzt werden!

Dashboard: https://railway.com/project/f355ab60-ecba-457c-acdc-93147c8d3a67

## Backend Environment Variables

```
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_KEY=<REDACTED>
SUPABASE_ANON_KEY=<REDACTED>
GOOGLE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
SECRET_KEY=YOUR_BACKEND_SECRET_KEY
ENVIRONMENT=production
SMTP_HOST=YOUR_SMTP_HOST
SMTP_PORT=465
SMTP_USER=YOUR_SMTP_USER
SMTP_PASSWORD=<REDACTED>
SMTP_FROM=YOUR_SMTP_FROM_ADDRESS
SMTP_USE_TLS=false
SMTP_USE_SSL=true
SMTP_VERIFY_CERT=false
```

## Schritt-für-Schritt Anleitung

1. Öffne https://railway.com/project/f355ab60-ecba-457c-acdc-93147c8d3a67
2. Klicke auf den Service (oder erstelle ihn via "New Service" → "GitHub Repo")
3. Gehe zu "Variables" Tab
4. Füge ALLE oben genannten Variables hinzu (eine nach der anderen)
5. Click "Deploy" um mit den neuen Variables neu zu deployen
