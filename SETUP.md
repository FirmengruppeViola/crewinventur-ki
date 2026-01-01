# CrewInventurKI - Setup Anleitung

> Stand nach Phase 0 - GitHub ✅ | Backend ✅ | Frontend ✅ | Supabase ⏳

---

## ✅ Was bereits erledigt ist

| Komponente | Status | Details |
|------------|--------|---------|
| GitHub Repo | ✅ Done | https://github.com/FirmengruppeViola/crewinventur-ki |
| Backend Setup | ✅ Done | FastAPI + Uvicorn + Supabase Client |
| Frontend Setup | ✅ Done | Vite + React + Tailwind + Landing Page |
| Git Push | ✅ Done | Alle Dateien committed & gepusht |

---

## ⏳ Was noch fehlt: Supabase Projekt

### Schritt 1: Supabase Projekt erstellen

1. Gehe zu https://supabase.com/dashboard
2. Logge dich ein (oder nutze den Access Token aus CREWCHECKER_INFRA_STATE.md)
3. Klicke auf **"New Project"**
4. Einstellungen:
   - **Organization:** FirmengruppeViola (oder deine Org)
   - **Name:** `crewinventur-ki`
   - **Database Password:** [Sichere ein Passwort - speichere es separat!]
   - **Region:** **Europe (Frankfurt)** ← WICHTIG für DSGVO!
   - **Pricing:** Free Tier ist OK für Entwicklung
5. Klicke **"Create new project"**
6. Warte ~2 Minuten bis Projekt bereit ist

---

### Schritt 2: Database Schema ausführen

1. Im Supabase Dashboard: Gehe zu **"SQL Editor"** (linkes Menü)
2. Klicke **"New Query"**
3. Öffne die Datei `supabase-schema.sql` (in diesem Projektordner)
4. Kopiere den **gesamten Inhalt** und füge ihn in den SQL Editor ein
5. Klicke **"Run"** (oder Strg+Enter)
6. Warte bis alle Statements erfolgreich durchgelaufen sind

**Erwartetes Ergebnis:**
- 8 Tabellen erstellt: profiles, locations, categories, products, invoices, invoice_items, inventory_sessions, inventory_items
- Row Level Security (RLS) auf allen Tabellen aktiviert
- System-Kategorien geseedet (Spirituosen, Bier, Wein, etc.)

---

### Schritt 3: Storage Buckets erstellen

1. Im Supabase Dashboard: Gehe zu **"Storage"** (linkes Menü)
2. Klicke **"Create a new bucket"**

**Bucket 1: invoices**
- Name: `invoices`
- Public: **NO** (private)
- Click "Create bucket"

**Bucket 2: product-images**
- Name: `product-images`
- Public: **NO** (private)
- Click "Create bucket"

---

### Schritt 4: Email Auth aktivieren

1. Im Supabase Dashboard: Gehe zu **"Authentication"** → **"Providers"**
2. **Email** sollte standardmäßig aktiviert sein
3. Falls nicht: Enable "Email Provider"
4. **Confirm email:** Für Development kann das deaktiviert bleiben
5. **OAuth Providers:** Können wir später hinzufügen (Google, GitHub, etc.)

---

### Schritt 5: API Keys kopieren

1. Im Supabase Dashboard: Gehe zu **"Project Settings"** → **"API"**
2. Du brauchst:
   - **Project URL:** `https://xxx.supabase.co`
   - **anon public key:** `eyJhb...` (langer String)
   - **service_role key:** `eyJhb...` (NOCH LÄNGER, SECRET!)

**Diese Keys SOFORT kopieren und sicher speichern!**

---

### Schritt 6: Environment Variables setzen

#### Backend (.env)

Datei: `C:\Projects\CrewInventurKI\backend\.env`

Ersetze die Placeholder-Werte:

```env
# Supabase
SUPABASE_URL=https://[DEIN-PROJEKT-REF].supabase.co
SUPABASE_SERVICE_KEY=[DEIN-SERVICE-ROLE-KEY]
SUPABASE_ANON_KEY=[DEIN-ANON-KEY]

# Google Gemini AI (später)
GOOGLE_GEMINI_API_KEY=placeholder-gemini-key

# Security
SECRET_KEY=dev-secret-key-change-in-production

# Environment
ENVIRONMENT=development
```

#### Frontend (.env.local)

Datei: `C:\Projects\CrewInventurKI\frontend\.env.local`

```env
# Supabase
VITE_SUPABASE_URL=https://[DEIN-PROJEKT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[DEIN-ANON-KEY]
```

---

### Schritt 7: Teste Lokal

#### Backend starten:

```bash
cd C:\Projects\CrewInventurKI\backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

**Test:** Öffne http://localhost:8000/health
**Erwartung:** `{"status": "ok", "service": "CrewInventurKI"}`

#### Frontend starten:

```bash
cd C:\Projects\CrewInventurKI\frontend
npm run dev
```

**Test:** Öffne http://localhost:5173
**Erwartung:** Landing Page mit "CrewInventurKI" und 3 Feature-Cards

---

## 🚀 Nächste Schritte (nach Phase 0)

Sobald Supabase läuft:
- ✅ Update Plandatei: `C:\Users\viola\.claude\plans\compiled-wandering-micali.md`
- ✅ Commit + Push der .env Dateien (OHNE Keys!)
- 🎯 **Phase 1:** Authentication + Core UI Components
- 🎯 **Phase 2:** Locations Management
- 🎯 **Phase 3:** Products + AI Recognition (Gemini Vision)

---

## 📚 Nützliche Links

| Ressource | URL |
|-----------|-----|
| Supabase Dashboard | https://supabase.com/dashboard |
| GitHub Repo | https://github.com/FirmengruppeViola/crewinventur-ki |
| Supabase Docs | https://supabase.com/docs |
| FastAPI Docs | https://fastapi.tiangolo.com |
| Vite Docs | https://vitejs.dev |

---

## ❗ Troubleshooting

### Backend startet nicht
- Prüfe ob venv aktiviert ist: `venv\Scripts\activate`
- Prüfe ob Dependencies installiert: `pip list | grep fastapi`
- Prüfe .env Datei: Alle Keys korrekt?

### Frontend startet nicht
- Prüfe ob node_modules existiert: `npm install`
- Prüfe .env.local: VITE_ Prefix?
- Lösche `node_modules` und `npm install` nochmal

### Supabase Connection Error
- Prüfe ob Projekt URL korrekt ist (kein Trailing Slash!)
- Prüfe ob Keys keine Leerzeichen haben
- Teste SQL Query direkt im Dashboard

---

**Status:** Phase 0 zu ~75% abgeschlossen. Supabase-Setup fehlt noch.
