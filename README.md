# CrewInventurKI

KI-gestützte Inventur-App für die Gastronomie.

## Überblick

CrewInventurKI vereinfacht Inventuren dramatisch durch KI-gestützte Produkterkennung:
- **Foto machen** → KI erkennt Produkt automatisch
- **Menge eingeben** → Fertig
- **Rechnungen hochladen** → KI extrahiert Preise
- **PDF Export** → Professionelles Dokument fürs Finanzamt

## Tech Stack

- **Backend:** FastAPI (async) on Railway
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Frontend:** React + TypeScript + Vite + Tailwind
- **Mobile:** Capacitor 6 (iOS/Android)
- **AI:** Google Gemini 2.0 Flash

## Features

- 📸 **Photo-based Product Recognition** - Gemini Vision
- 🏷️ **Barcode Scanner** - Alternative zur Foto-Erkennung
- 📄 **Invoice Upload** - PDF → KI extrahiert Preise
- 🏢 **Multi-Location** - Mehrere Standorte pro Account
- 📊 **Inventory Comparison** - Vergleich mit letzter Inventur
- 📋 **PDF Export** - Professionell formatiert

## Lokale Entwicklung

### Voraussetzungen

- Python 3.13+
- Node.js 24+
- Poetry
- Supabase Account

### Setup

```bash
# Backend
cd backend
poetry install
cp .env.example .env  # Füge Supabase Keys hinzu
poetry run uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env.local  # Füge Supabase Keys hinzu
npm run dev
```

### Environment Variables

#### Backend (.env)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
GOOGLE_GEMINI_API_KEY=xxx
```

#### Frontend (.env.local)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## Deployment

- **Backend:** Railway (auto-deploy from main)
- **Frontend:** Cloudflare Pages (auto-deploy from main)

## Projekt-Status

Phase 0: Projekt-Setup ✅
- [x] GitHub Repository
- [x] Supabase Projekt + Schema
- [x] Backend Grundgerüst
- [x] Frontend Grundgerüst

Phase 1: Auth + Core UI (geplant)
Phase 2: Locations Management (geplant)
Phase 3: Products + AI Recognition (geplant)

## Lizenz

Proprietary - Firmengruppe Viola
