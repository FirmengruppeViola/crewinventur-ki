# CrewInventurKI

KI-gestützte Inventur-App für die Gastronomie.

## 🚀 Quick Start für Entwickler

### 📋 WICHTIG: Lies zuerst die Plandatei!

**Hauptdokument mit allen Details:**
```
IMPLEMENTATION_PLAN.xml
```

Diese Datei enthält:
- ✅ **Alle Credentials** (Supabase, Railway, Cloudflare, GitHub)
- ✅ **Kompletten Tech Stack** Überblick
- ✅ **Phase 1 Tasks** (Authentication + Core UI)
- ✅ **Code-Beispiele** für Auth Integration
- ✅ **Design System** Specs
- ✅ **Test-Kriterien**

**Zusätzliche Docs:**
- `HANDOVER_PHASE_1.md` - Quick Reference für Phase 1
- `DEPLOYMENT_STATUS.md` - Infrastructure Übersicht
- `SETUP.md` - Supabase Setup (bereits erledigt)

---

## 🎯 Projekt Status

| Phase | Status | Beschreibung |
|-------|--------|--------------|
| **Phase 0** | ✅ DONE | Infrastructure Setup (GitHub, Supabase, Railway, Cloudflare) |
| **Phase 1** | 🔜 NEXT | Authentication + Core UI Components |
| **Phase 2** | ⏳ | Locations Management |
| **Phase 3** | ⏳ | Products + AI Recognition (Gemini Vision) |

---

## 🏗️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3
- Capacitor 6 (Mobile)
- Supabase Client
- Zustand (State)
- TanStack Query (Data Fetching)

### Backend
- FastAPI (Python 3.13.9)
- Uvicorn (ASGI Server)
- Supabase Client
- Google Gemini AI

### Infrastructure
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Backend Hosting:** Railway
- **Frontend Hosting:** Cloudflare Pages
- **Source Control:** GitHub

---

## 🌐 Live URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://crewinventur-ki.pages.dev |
| **Backend** | https://crewinventur-ki-backend-production.up.railway.app |
| **Health Check** | https://crewinventur-ki-backend-production.up.railway.app/health |
| **GitHub** | https://github.com/FirmengruppeViola/crewinventur-ki |
| **Supabase Dashboard** | https://supabase.com/dashboard/project/pzgpvwzmlssmepvqtgnq |
| **Railway Dashboard** | https://railway.com/project/f355ab60-ecba-457c-acdc-93147c8d3a67 |

---

## 💻 Lokale Entwicklung

### Backend starten
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
→ Läuft auf http://localhost:8000

### Frontend starten
```bash
cd frontend
npm install
npm run dev
```
→ Läuft auf http://localhost:5173

### Connections testen
```bash
# Backend Health Check
curl http://localhost:8000/health

# Supabase Connection Test
cd backend
venv\Scripts\python test_connection.py
```

---

## 📚 Business Kontext

**Was ist CrewInventurKI?**

Inventur-App für Gastronomen, die KI nutzt um Produkte automatisch zu erkennen:

1. **Foto machen** (z.B. Paulaner Weizen Flasche)
2. **KI erkennt** Marke, Name, Variante, Größe automatisch
3. **Menge eingeben** → Fertig

**Zusatz-Features:**
- Rechnungen hochladen → KI extrahiert Preise
- Multi-Location Support
- PDF Export fürs Finanzamt
- Vergleich mit vorheriger Inventur
- Barcode Scanner

**Zielgruppe:** Gastronomen in Deutschland (Bars, Restaurants, Hotels)

**Monetarisierung:**
- Version 1 (jetzt): Kostenlos für Firmengruppe Viola
- Version 2 (später): €2.99/Monat pro Location

---

## 📋 Phase 1 Tasks (Nächster Schritt)

Siehe `IMPLEMENTATION_PLAN.xml` für vollständige Task-Liste.

**Kurz-Übersicht:**
1. Supabase Auth Integration (AuthContext, useAuth Hook)
2. Auth Pages (Login, Register, Profile)
3. Core UI Components (Button, Card, Input, Modal, etc.)
4. App Layout (Header, BottomNav, Drawer)
5. Backend Profile API
6. Zustand Stores

**Geschätzte Zeit:** 3-4 Tage

---

## 🔑 Credentials & Access

**Alle Keys, Tokens, und Credentials findest du in:**
```
IMPLEMENTATION_PLAN.xml (Sektion: <credentials>)
```

Enthält:
- Supabase URL, Anon Key, Service Role Key
- Railway API Token, Project IDs
- Cloudflare API Key, Account ID
- GitHub Repo Details
- Database Passwords

**⚠️ Diese Datei NICHT committen!** (bereits in .gitignore)

---

## 🎨 Design System

**Colors:**
- Primary: `blue-600`
- Success: `green-600`
- Danger: `red-600`
- Gray: `gray-200` bis `gray-900`

**Components:**
- Mobile-first Design
- Capacitor-compatible (KEINE HTML5-only Features!)
- Native `<select>` statt `<datalist>`
- Tailwind CSS für alle Styles

---

## 📝 Wichtige Constraints

1. **Capacitor-Ready:** iOS WebView kompatibel
2. **Mobile-First:** Primär für mobile Nutzung
3. **Offline:** User kann Fotos offline machen, später hochladen
4. **RLS:** Alle DB-Queries respektieren Row Level Security
5. **TypeScript:** Strikte Types überall

---

## 🚢 Deployment

### Automatisches Deployment
```bash
git add -A
git commit -m "feat: your feature"
git push origin master
```

→ **Cloudflare Pages** deployed automatisch
→ **Railway Backend** deployed automatisch

### Production URLs
- Frontend: https://crewinventur-ki.pages.dev
- Backend: https://crewinventur-ki-backend-production.up.railway.app

---

## 📞 Support & Fragen

1. **Phase 1 Details?** → Lies `IMPLEMENTATION_PLAN.xml`
2. **Credentials fehlen?** → Check `IMPLEMENTATION_PLAN.xml` Sektion `<credentials>`
3. **Deployment Probleme?** → Check `DEPLOYMENT_STATUS.md`
4. **Supabase Setup?** → Check `SETUP.md` (bereits erledigt)

---

## ✅ Phase 0 Completion

Phase 0 ist zu **100% abgeschlossen**:
- ✅ GitHub Repository
- ✅ Supabase Database (8 Tabellen + RLS)
- ✅ Railway Backend (deployed + verified)
- ✅ Cloudflare Pages Frontend (deployed + verified)
- ✅ Alle Environment Variables gesetzt
- ✅ Health Checks passed
- ✅ Komplette Dokumentation

**Ready for Phase 1!** 🚀

---

## 📄 Lizenz

Proprietary - Firmengruppe Viola
