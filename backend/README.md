# FIAE AP2 Trainer — Backend

REST API für die FIAE-AP2-Prüfungsvorbereitungs-App, gebaut mit **Node.js + Express + TypeScript + SQLite**.

## Schnellstart

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen konfigurieren
cp .env.example .env
# .env öffnen und GEMINI_API_KEY eintragen

# 3. Entwicklungsserver starten
npm run dev
# ✅ Backend läuft auf http://localhost:3001

# 4. Production Build
npm run build && npm start
```

## Gemini API Key (kostenlos)

1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) aufrufen
2. Mit Google-Konto anmelden → "Create API Key"
3. Key in `.env` eintragen: `GEMINI_API_KEY=AIza...`

**Kostenloses Tier (Stand 2025/26):**
- 1.500 Anfragen / Tag
- 1.000.000 Tokens / Minute
- Kein Ablaufdatum, keine Kreditkarte nötig

## Voraussetzungen

- Node.js ≥ 18
- Schreibrechte im Projektverzeichnis (für `data/` SQLite-Datei und Uploads)

## Projektstruktur

```
src/
├── db/
│   └── database.ts       SQLite-Initialisierung, Schema-Migration, Demo-Seed
├── routes/
│   └── examRoutes.ts     Alle Express-Routen (Prüfungen, Sessions, Bewertung)
├── services/
│   └── aiService.ts      Gemini API-Integration + Prompt-Engineering
├── middleware/
│   └── auth.ts           Vereinfachte Auth-Middleware (userId-Injektion)
└── server.ts             Express-Einstiegspunkt

data/
├── fiae_ap2.db           SQLite-Datenbankdatei (wird automatisch angelegt)
└── uploads/              Hochgeladene Diagramm-Bilder
```

## API-Endpunkte

| Method | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/health` | Health-Check |
| `GET` | `/api/exams` | Alle Prüfungsvorlagen |
| `GET` | `/api/exams/:id` | Vorlage mit Aufgaben |
| `POST` | `/api/exams/:id/sessions` | Neue Session starten |
| `GET` | `/api/sessions/:sessionId` | Session mit Antworten laden |
| `PUT` | `/api/sessions/:sessionId/answers/:taskId` | Antwort speichern |
| `POST` | `/api/sessions/:sessionId/answers/:taskId/upload` | Diagrammbild hochladen |
| `POST` | `/api/sessions/:sessionId/answers/:answerId/evaluate` | KI-Bewertung anfordern |
| `POST` | `/api/sessions/:sessionId/submit` | Prüfung abgeben |

## Dokumentation

- [Datenbankschema](./docs/database.md)
- [API-Referenz](./docs/api.md)
- [KI-Integration & Prompt-Design](./docs/ai-integration.md)
- [Konfiguration & Deployment](./docs/deployment.md)
