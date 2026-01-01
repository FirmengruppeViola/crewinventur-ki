# CrewInventurKI Backend

FastAPI Backend für die CrewInventurKI App.

## Setup

```bash
# Virtual Environment erstellen
python -m venv venv

# Dependencies installieren
venv\Scripts\pip install -r requirements.txt

# Environment Variables konfigurieren
cp .env.example .env
# .env editieren mit echten Credentials

# Server starten
venv\Scripts\python app\main.py
```

## Endpoints

- `GET /health` - Health check
- `GET /api/v1/` - API Router (placeholder)

## Entwicklung

Lokal mit hot-reload:
```bash
venv\Scripts\uvicorn app.main:app --reload
```
