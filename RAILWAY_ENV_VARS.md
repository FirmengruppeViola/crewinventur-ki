# Railway Environment Variables

**WICHTIG:** Diese müssen im Railway Dashboard unter "Variables" gesetzt werden!

Dashboard: https://railway.com/project/f355ab60-ecba-457c-acdc-93147c8d3a67

## Backend Environment Variables

```
SUPABASE_URL=https://pzgpvwzmlssmepvqtgnq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z3B2d3ptbHNzbWVwdnF0Z25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMwNjQzMiwiZXhwIjoyMDgyODgyNDMyfQ.27ocqOKDgSjqRarSggcCrPOtomGRShKF3lZxWxmw31c
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z3B2d3ptbHNzbWVwdnF0Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDY0MzIsImV4cCI6MjA4Mjg4MjQzMn0.Ue9gEhbjCWt1hZO9hxKmMAvn4_q8Og_wUf3Tfuf7PSc
GOOGLE_GEMINI_API_KEY=placeholder-gemini-key
SECRET_KEY=production-secret-key-change-later
ENVIRONMENT=production
SMTP_HOST=82.165.96.118
SMTP_PORT=465
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=inventur@euredomain.de
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
