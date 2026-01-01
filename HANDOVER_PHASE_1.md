# 🎯 Phase 1 Handover - Authentication + Core UI

> **Status:** Phase 0 zu 100% abgeschlossen. Full Stack ist LIVE.
> **Nächste Schritte:** Phase 1 kann sofort begonnen werden.

---

## 📋 Was bereits erledigt ist (Phase 0)

✅ **GitHub Repo:** https://github.com/FirmengruppeViola/crewinventur-ki
✅ **Supabase Database:** 8 Tabellen + RLS + 2 Storage Buckets
✅ **Railway Backend:** https://crewinventur-ki-backend-production.up.railway.app
✅ **Cloudflare Frontend:** https://crewinventur-ki.pages.dev
✅ **Environment Variables:** Alle Keys gesetzt (Backend + Frontend)
✅ **Health Checks:** Alle Services verified

---

## 🔑 Komplette Zugangsdaten

### Supabase
```
URL: https://pzgpvwzmlssmepvqtgnq.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z3B2d3ptbHNzbWVwdnF0Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDY0MzIsImV4cCI6MjA4Mjg4MjQzMn0.Ue9gEhbjCWt1hZO9hxKmMAvn4_q8Og_wUf3Tfuf7PSc
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Z3B2d3ptbHNzbWVwdnF0Z25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMwNjQzMiwiZXhwIjoyMDgyODgyNDMyfQ.27ocqOKDgSjqRarSggcCrPOtomGRShKF3lZxWxmw31c
Database Password: CrewInv2026!Secure
Region: eu-central-1 (Frankfurt)
Dashboard: https://supabase.com/dashboard/project/pzgpvwzmlssmepvqtgnq
```

### Railway
```
Backend URL: https://crewinventur-ki-backend-production.up.railway.app
Project ID: f355ab60-ecba-457c-acdc-93147c8d3a67
Service ID: 31373cf8-ca09-4267-b2e6-28ac7d860aac
API Token: 82a19704-6e09-4514-bc7a-079c8c89c712
Dashboard: https://railway.com/project/f355ab60-ecba-457c-acdc-93147c8d3a67
```

### Cloudflare Pages
```
Frontend URL: https://crewinventur-ki.pages.dev
Project Name: crewinventur-ki
Account ID: 06633edf3843240956d67e95a1d03aba
API Key: 4cacfee9cd7e1317b721e27ebed1355fcdc94
Email: firmengruppe.viola@gmail.com
```

### GitHub
```
Repo: https://github.com/FirmengruppeViola/crewinventur-ki
Branch: master
Commits: 7 (Phase 0 Complete)
```

---

## 🚀 Schnellstart für Phase 1

### 1. Projekt lokal clonen
```bash
git clone https://github.com/FirmengruppeViola/crewinventur-ki.git
cd crewinventur-ki
```

### 2. Backend starten
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# Läuft auf http://localhost:8000
```

### 3. Frontend starten
```bash
cd frontend
npm install
npm run dev
# Läuft auf http://localhost:5173
```

### 4. Teste Connections
```bash
# Backend Health Check
curl http://localhost:8000/health
# Sollte zurückgeben: {"status":"ok","service":"CrewInventurKI"}

# Supabase Test
cd backend
venv\Scripts\python test_connection.py
# Sollte 5 Kategorien anzeigen
```

---

## 📝 Phase 1 Aufgaben (aus Plandatei)

### Workstream 1.1: Supabase Auth Integration
- [ ] AuthContext erstellen (React Context)
- [ ] useAuth Hook (login, logout, signup, getUser)
- [ ] ProtectedRoute Component
- [ ] Auth State Persistence
- [ ] Lokaler Test

**Files zu erstellen:**
- `frontend/src/features/auth/AuthContext.tsx`
- `frontend/src/features/auth/useAuth.ts`
- `frontend/src/features/auth/ProtectedRoute.tsx`

### Workstream 1.2: Auth Pages
- [ ] LoginPage (Email + Password)
- [ ] RegisterPage (Email + Password + Display Name)
- [ ] ForgotPasswordPage
- [ ] ProfilePage (View + Edit)
- [ ] Redirect Logic
- [ ] Error Handling

**Files zu erstellen:**
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/auth/RegisterPage.tsx`
- `frontend/src/pages/auth/ForgotPasswordPage.tsx`
- `frontend/src/pages/settings/ProfilePage.tsx`

### Workstream 1.3: Core UI Components
- [ ] Button Component (primary, secondary, danger)
- [ ] Card Component
- [ ] Input Component (text, email, password)
- [ ] Select Component (NATIVE, kein datalist!)
- [ ] Modal/Sheet Component
- [ ] Loading Spinner
- [ ] Toast/Alert
- [ ] EmptyState

**Files zu erstellen:**
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/ui/Input.tsx`
- `frontend/src/components/ui/Select.tsx`
- `frontend/src/components/ui/Modal.tsx`
- `frontend/src/components/ui/Loading.tsx`
- `frontend/src/components/ui/Toast.tsx`
- `frontend/src/components/ui/EmptyState.tsx`

### Workstream 1.4: App Layout
- [ ] AppShell Component
- [ ] Header Component
- [ ] BottomNav Component (Mobile)
- [ ] Drawer Component (Tablet/Desktop)
- [ ] Routing Setup

**Files zu erstellen:**
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/BottomNav.tsx`
- `frontend/src/components/layout/Drawer.tsx`

### Workstream 1.5: Backend Profile API
- [ ] GET /api/v1/profile
- [ ] PUT /api/v1/profile
- [ ] get_current_user() Dependency
- [ ] Pydantic Schemas
- [ ] Tests

**Files zu erstellen:**
- `backend/app/api/endpoints/profile.py`
- `backend/app/schemas/profile.py`
- `backend/app/api/deps.py`

### Workstream 1.6: Zustand Stores
- [ ] authStore
- [ ] uiStore
- [ ] Integration in Components

**Files zu erstellen:**
- `frontend/src/stores/authStore.ts`
- `frontend/src/stores/uiStore.ts`

---

## ✅ Test-Kriterien für Phase 1

- [ ] User kann Account erstellen
- [ ] User erhält Email Confirmation
- [ ] User kann sich einloggen
- [ ] Session bleibt nach Reload erhalten
- [ ] User kann Profil ansehen + editieren
- [ ] User kann sich ausloggen
- [ ] Protected Routes funktionieren
- [ ] UI Components rendern korrekt
- [ ] Mobile Navigation funktioniert

---

## 📚 Wichtige Dokumentation

| Datei | Zweck |
|-------|-------|
| `C:\Users\viola\.claude\plans\compiled-wandering-micali.xml` | **KOMPLETTE PLANDATEI** mit allen Details |
| `DEPLOYMENT_STATUS.md` | Infrastructure Übersicht |
| `SETUP.md` | Supabase Setup Guide |
| `RAILWAY_ENV_VARS.md` | Railway Variables |
| `supabase-schema.sql` | Komplettes DB Schema |

---

## 🎨 Design System

**Colors (Tailwind):**
- Primary: `blue-600`
- Success: `green-600`
- Danger: `red-600`
- Gray: `gray-200` bis `gray-900`

**Typography:**
- Headings: `font-bold`
- Body: `font-normal`
- Small: `text-sm`

**Spacing:**
- Padding: `p-4`, `p-6`
- Margin: `mb-4`, `mt-6`
- Gap: `gap-4`

**Border Radius:**
- Small: `rounded-md`
- Large: `rounded-lg`

---

## ⚠️ Wichtige Constraints

1. **Capacitor-Ready:** KEINE HTML5-only Features (datalist, dialog)
2. **Mobile-First:** iOS WebView kompatibel
3. **Native Select:** Statt `<datalist>` nutze `<select>`
4. **Tailwind:** Alle Styles mit Tailwind CSS
5. **TypeScript:** Strikte Types
6. **RLS:** Alle DB-Queries respektieren Row Level Security

---

## 🚢 Deployment nach Phase 1

1. **Git Push:**
   ```bash
   git add -A
   git commit -m "feat: Phase 1 - Authentication + Core UI complete"
   git push origin master
   ```

2. **Cloudflare Pages:** Auto-deploys bei push
3. **Railway Backend:** Auto-deploys bei push
4. **Teste Production:**
   - Frontend: https://crewinventur-ki.pages.dev
   - Backend: https://crewinventur-ki-backend-production.up.railway.app

---

## 📞 Bei Fragen/Problemen

1. **Credentials fehlen?** → Siehe Sektion "Komplette Zugangsdaten" oben
2. **Deployment Fehler?** → Check `DEPLOYMENT_STATUS.md`
3. **Supabase Probleme?** → Check `SETUP.md`
4. **Code-Beispiele?** → Siehe `compiled-wandering-micali.xml`

**Die komplette Plandatei enthält ALLE Details für Phase 1!**

---

**Status:** ✅ Ready to code! Viel Erfolg! 🚀
