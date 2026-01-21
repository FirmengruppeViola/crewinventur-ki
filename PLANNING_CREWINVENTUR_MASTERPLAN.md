# CrewInventurKI – Masterplan (Stabilisierung → Produkt → Skalierung)

> Zweck: Diese Datei ist die **einzige** Planungs-/Wiederanlauf-Quelle, falls IDE/Agent/Session abstürzt.  
> **Kein Code in dieser Datei** – nur Spezifikation, Reihenfolge, Akzeptanzkriterien und Checklisten.
>
> **Stand:** 2026-01-21  
> **Zielgruppe:** Bars + kleine Ketten (z. B. 1–10 Standorte)  
> **North Star:** “Inventur in < 30 min pro Standort + Finanzamt/Steuerberater-fertig ohne Excel-Frickelei”

---

## 1) Produktvision & Prinzipien

### 1.1 Problem / Outcome
- Inventur soll **schneller**, **intuitiver** und **zuverlässiger** werden als Excel.
- Mit minimaler Reibung von “Zählen” → “Bewerten” → “Export/Versand Steuerberater”.
- KI/Automation ist **Assistenz**, kein Autopilot: Nutzer bestätigt, korrigiert, und das System lernt.

### 1.2 Leitplanken (verbindlich)
- **DB ist Source of Truth**: Totals/Values müssen server-/DB-seitig deterministisch sein (Gerätewechsel, Teamwechsel, Offline-Sync).
- **Fail-safe**: Jeder Schritt kann ohne Datenverlust wieder aufgenommen werden (Upload-Queue, idempotente Endpoints, Resume).
- **Auditierbar**: Wer hat was wann gezählt/geändert (für Kettenbetrieb + “Finanzamt-fähig”).
- **Human-in-the-loop**: Jede KI-Ausgabe hat Confidence und Review-UI.

### 1.3 Erfolgsmetriken (MVP)
- Zeit pro Standortinventur: Ziel < 30 Minuten (bei “bekannten” Produkten).
- Preisabdeckung: > 90% der Positionen mit Preis (über Rechnungimport + Review).
- Abschluss/Export: 1 Klick → PDF + CSV + DATEV-CSV + optional Email-Versand.

---

## 2) Stack-Überblick (für Kontext, ohne Secrets)

### 2.1 Komponenten
- Frontend: React + Vite + Tailwind + Capacitor (Mobile)
- Backend: FastAPI
- DB/Auth: Supabase (Postgres + RLS)
- Hosting: Railway (Backend), Cloudflare Pages (Frontend), Cloudflare R2 (Uploads)

### 2.2 URLs (öffentlich)
- Frontend: `https://crewinventurki.pages.dev`
- Backend: `https://crewinventur-ki-backend-production.up.railway.app` (Health: `/health`)
- Supabase Projekt-Ref (Prod): `pzgpvwzmlssmepvqtgnq`

> Hinweis: Credentials/Tokens gehören **nicht** in Repo-Dateien. Rotation/Secret-Store ist Teil der Härtung (siehe Abschnitt 8).

---

## 3) Ist-Zustand: verifizierte Systemprobleme (muss zuerst stabil werden)

> Dieser Block beschreibt **real festgestellte** Probleme (Schema/Code) – ohne Fix-Implementierung.

### 3.1 Schema-Drift: Repo-Schema ≠ Production-DB
- Production-DB `public.inventory_items` ist nicht deckungsgleich mit `supabase-schema.sql`.
- Beispiel: `total_price` ist in Production **generated** aus `quantity * unit_price`, während Code teils `total_price` setzt.

**Konsequenz:** Ohne Konsolidierung von Migrationen/Schemas entstehen wiederholt “funktioniert lokal, bricht in Prod”.

### 3.2 Blocker: Inventur-Abschluss schreibt auf nicht vorhandene Spalte
- Backend `complete_session` versucht `inventory_sessions.differences` zu schreiben.
- Production `inventory_sessions` hat diese Spalte aktuell nicht.

**Konsequenz:** Abschluss kann runtime-fehlschlagen (Inventur “nicht abschließbar”).

### 3.3 Blocker: Export-Preisupdate schreibt in generated Spalte
- Export-Endpoint setzt `inventory_items.total_price`.
- Production `total_price` ist generated → Postgres verbietet direkte Updates.

**Konsequenz:** “Preis nachtragen” kann runtime-fehlschlagen.

### 3.4 Datenkorrektheit: Mengenedit (full/partial) vs. total_price/quantity
- UI speichert `full_quantity/partial_quantity` (und Preis), aber `total_price` hängt von `quantity` ab.
- Wenn `quantity` nicht aus full/partial konsistent nachgeführt wird (DB- oder Backend-logik), entstehen falsche Summen/Exports.

**Konsequenz:** “Finanzamt-fähig” ist nicht zuverlässig, solange die Berechnung nicht eindeutig ist.

---

## 4) Zielbild Datenmodell (DB als Wahrheit)

### 4.1 Inventory Items – Zieldefinition
**Canonical Inputs**
- `full_quantity` (numeric, NOT NULL, default 0)
- `partial_quantity` (numeric, NOT NULL, default 0, Check: 0..1)
- `unit_price` (numeric, nullable oder default 0 – abhängig vom “missing price” Flow)

**Derived/Computed**
- `quantity := full_quantity + partial_quantity`
- `total_price := quantity * COALESCE(unit_price, 0)`

**Empfehlung:** `quantity` und `total_price` als **generated stored** Columns in Postgres, damit alle Clients identische Wahrheit sehen.

### 4.2 Inventory Sessions – Abschluss & Differences
Es gibt zwei robuste Varianten:

**Variante A (empfohlen): eigene Tabelle**
- `inventory_session_differences(session_id, product_id, previous_quantity, current_quantity, diff_quantity, created_at)`
- Vorteile: querybar, auditierbar, skaliert; keine JSON-Monolithe.

**Variante B: JSON in sessions**
- `inventory_sessions.differences jsonb`
- Vorteile: schnell “einfach”.
- Nachteile: schwerer zu pflegen/indizieren, Diff-Updates riskanter.

Entscheidung: **Variante A**, sofern keine zwingenden Gründe dagegen.

---

## 5) Produkt-Roadmap (Features + Reihenfolge)

> Fokus: erst Korrektheit + Abschluss/Export, dann KI-Mehrwert und Wachstum.

### Phase 1: Fundament stabilisieren (1–3 Tage)
**Ziel:** Keine Schema-/Write-Konflikte, Abschluss & Preisreview funktionieren 100%.

**Deliverables**
- Single Source of Truth für Migrationen + “Schema-Drift Guardrail”
- Abschluss-Flow stabil (keine missing columns / keine invalid updates)
- Preisupdate stabil (keine generated writes)

**Akzeptanzkriterien**
- Session kann abgeschlossen werden (mehrfach getestet) → Session-Status `completed`, totals korrekt.
- Missing-Price-Flow: Preis nachtragen → totals stimmen, keine DB-Errors.
- Staging/Prod Schema dokumentiert & reproduzierbar.

### Phase 2: Kern-Inventur UX (1–2 Wochen)
**Ziel:** Inventur schnell, angenehm, sicher.

**Features**
- Modi: Barcode (Standard), Foto (Fallback/Onboarding), Regal (Batch + Review)
- Duplikat-Handling: add/replace, Undo
- “Letzte Inventur übernehmen” (Startliste pro Standort)
- Plausibilitätscheck vor Abschluss (Ausreißer/Nullpreise/Einheiten)

**Akzeptanzkriterien**
- “Bekannte Produkte”-Inventur pro Standort realistisch < 30 Minuten.
- Fehlerquote: keine “stummen” Summenfehler (Totals deterministisch).

### Phase 3: Rechnungimport → Preise (2–4 Wochen iterativ)
**Ziel:** 90% Preisabdeckung mit Review.

**Features**
- Upload: mehrere PDFs + ZIP; Verarbeitung im Backend (job/queue)
- Extraction: Textlayer → OCR fallback
- Line-Items: Artikeltext, Menge, Einheit, Einzelpreis, Gesamt, Pfand, Rabatt
- Matching: Barcode/SKU → Alias → Fuzzy/Embedding
- Review UI: Bulk accept + Korrektur (lernt Alias)
- Preis-Historie: pro Produkt (+ optional Lieferant + Packung)

**Akzeptanzkriterien**
- ≥ 90% der Inventurpositionen erhalten Preis via Import+Review in ≤ 15 Minuten pro Monat/Standort.
- Fehlzuordnungen sind reversibel (Audit + “undo mapping”).

### Phase 4: Steuerberater-Exports & Versand (1 Woche)
**Ziel:** “Finanzamt-fertig” per 1 Klick.

**Exports**
- PDF: Detail + Summary + Standort + Datum + Audit
- CSV: generisch (Excel)
- DATEV-CSV: konfigurierbar (Konten/Warengruppen-Mapping)
- Email-Versand aus der App (Anhänge: PDF + CSV + DATEV)

**Akzeptanzkriterien**
- Steuerberater kann ohne Nacharbeit importieren/verwenden (einmalige Formatabnahme).
- Versand protokolliert (wann, an wen, welche Dateien).

### Phase 5: Multi-Location (6 Bars) & Team/Audit (1–2 Wochen)
**Ziel:** Kettenbetrieb = echter Mehrwert.

**Features**
- Rollup über Standorte (Bundles): Gesamtinventur + Standortvergleich
- Rollen/Permissions: Owner/Manager + Location-Zuordnung
- Auditlog: wer änderte Menge/Preis; optional 4-Augen-Abschluss

**Akzeptanzkriterien**
- Owner sieht alle Standorte; Manager nur zugewiesene.
- Änderungen sind nachvollziehbar (mind. “wer/was/wann”).

### Phase 6: Reorder/Bestellliste (1–2 Wochen)
**Ziel:** Operativer Mehrwert (nicht nur Compliance).

**Features**
- Mindestbestand pro Produkt/Standort
- Vorschlagsliste: “nachbestellen” basierend auf letzter Inventur + Verbrauch/Trend
- Export (CSV/PDF) oder Versand an Einkauf/Lieferant

**Akzeptanzkriterien**
- “Einkaufsliste” spart Zeit und reduziert Out-of-Stock.

---

## 6) DATEV-Export: Spezifikation (High Level)

> DATEV ist nicht “ein” Format; je Steuerbüro können Felder/Erwartungen variieren. Deshalb: **Exportprofile**.

### 6.1 Exportprofile
- Pro Account/Owner: `tax_export_profile`
- Enthält: Kontenrahmen/Warengruppen-Mapping, Rundungsregeln, Datumsquelle (completed_at), Trennzeichen, Encoding, Feldreihenfolge.

### 6.2 Minimaler MVP-Ansatz
- Start mit einem **Standard-CSV**, der vom Steuerbüro abgenommen wird (“DATEV-kompatibel nach deren Importmaske”).
- Danach erst strikte DATEV-Layouts (falls nötig).

---

## 7) KI-Strategie (Foto + Barcode + Rechnungen)

### 7.1 Barcode: was liefert er?
- In der Regel nur GTIN/EAN (ID), nicht den Produktnamen.
- Produktinfos kommen aus:
  1) eigener Produktdatenbank (nach einmaligem Anlernen),
  2) optional externen Datenquellen (Autocomplete/Seed),
  3) Rechnungstexten (Lieferantenbezeichnung/SKU als Alias).

### 7.2 Foto + Barcode als bestes Onboarding
- Wenn Barcode unbekannt: Foto vom Etikett → KI Vorschlag → bestätigen → Barcode wird stabiler Schlüssel.

### 7.3 Rechnungen: Matching-Qualität steigern
- Alias-Lernen: Jede Korrektur erzeugt Aliasregeln (Vendor-Text → canonical product).
- Pack/Unit Normalisierung ist entscheidend (Fass 30L vs 50L, Kiste vs Stück, Schutzgas-Packungen).

---

## 8) Security / Betrieb / “Bezahlprodukt”-Härtung

### 8.1 Secrets & Rotation (Pflicht)
- Keine Tokens/Passwörter in Markdown/Repo.
- Rotationsplan für: Backend SECRET_KEY, SMTP, Supabase Keys, R2 Keys.

### 8.2 Observability
- Sentry (Backend+Frontend), Request-IDs, strukturierte Logs
- Alarmierung: “Export failed”, “Invoice processing failed”, “Auth errors”

### 8.3 Release-Prozess
- Staging Umgebung (Supabase + Railway) + Smoke Tests
- “Schema drift check” in CI: Migrationen laufen durch, API-Mutations sind schema-safe.

---

## 9) Testplan (Minimum)

### 9.1 Automatisierte Checks
- Integration: add/update item → DB totals korrekt
- Integration: complete session → keine DB-Errors, status/totals korrekt
- Integration: update unit_price → totals korrekt, no generated writes

### 9.2 Smoke-Runbook (manuell, 10 Minuten)
- Login
- Session erstellen → 3 Items hinzufügen → Item editieren (full/partial) → Abschluss
- Missing prices prüfen → 1 Preis nachtragen → Export PDF/CSV
- Email an Testadresse (Steuerberater-Flow)

---

## 10) Crash-/Wiederanlauf-Protokoll (wichtig)

Wenn es abstürzt, arbeite so weiter:
1) Diese Datei öffnen und zum Abschnitt **“11) Arbeitsstand”** springen.
2) Prüfen: welche Phase ist “in progress” (Checkboxen).
3) Nur das nächste Deliverable anfassen (kein Parallel-Fix ohne Grund).
4) Nach jedem abgeschlossenen Deliverable: in **“11) Arbeitsstand”** Datum + Ergebnis notieren.

---

## 11) Arbeitsstand (Checkpoint-Log)

> Hier wird **nur** händisch der Fortschritt festgehalten, um nach Crash weiterzumachen.

### Aktueller Fokus
- [ ] Phase 1: Fundament stabilisieren
- [ ] Phase 2: Kern-Inventur UX
- [x] Phase 3: Rechnungimport → Preise
- [ ] Phase 4: Exporte/Steuerberater
- [ ] Phase 5: Multi-Location & Team
- [ ] Phase 6: Reorder

### Letzter Checkpoint
- Datum: 2026-01-21
- Was wurde verifiziert/entschieden: Reorder-MVP ergänzt (Mindestbestand pro Location + Nachbestellliste), Review-Flow erweitert, OCR-Fallback aktiv.
- Was wurde verifiziert/entschieden: Reorder-MVP ergänzt (Mindestbestand pro Location + Nachbestellliste), Audit-Log-View im Session Summary, OCR-Fallback aktiv.
- Nächster Schritt: Verbrauch/Trend-basierte Vorschlaege für Reorder (weitere Verfeinerung).
