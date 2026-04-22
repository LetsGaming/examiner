# AP2 Trainer — Backend

REST API für die IHK AP2 Prüfungsvorbereitungs-App (FIAE & FISI).
Gebaut mit **Node.js · Express · TypeScript · SQLite**.

## Schnellstart

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen konfigurieren
cp .env.example .env
# .env öffnen — mindestens JWT_SECRET und einen KI-Provider-Key eintragen

# 3. Entwicklungsserver starten
npm run dev
# ✅ Backend läuft auf http://localhost:8031

# 4. Production Build
npm run build && npm start
```

## KI-Anbieter konfigurieren

Nur **einen** der folgenden Keys in `.env` setzen — der erste konfigurierte wird als Server-Fallback genutzt.
Nutzer können in den App-Einstellungen ihren eigenen Key hinterlegen (hat immer Vorrang).

| Anbieter | Env-Variable | Key erstellen |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic | `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| Google | `GOOGLE_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Mistral | `MISTRAL_API_KEY` | [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys) |

## Voraussetzungen

- Node.js ≥ 20
- Schreibrechte im Projektverzeichnis (für `data/` SQLite-Datei und Uploads)

## Projektstruktur

```
src/
├── db/
│   └── database.ts          SQLite-Schema, Migrationen, Pool-Abfragen
├── routes/
│   ├── poolRoutes.ts         Pool-Status, Task-Generierung, Prüfungsstart
│   ├── sessionRoutes.ts      Session laden, Antworten speichern, Abgeben
│   ├── evaluationRoutes.ts   KI-Bewertung einzelner Antworten
│   ├── settingsRoutes.ts     KI-Provider-Einstellungen
│   ├── authRoutes.ts         Login & Registrierung
│   └── routeHelpers.ts       Shared helpers (getUserId, insertTasksIntoDB, ...)
├── services/
│   ├── aiService.ts          KI-Provider-Abstraktion (Text + Bild)
│   ├── examGenerator.ts      Aufgabengenerierung mit 3-stufigem Fallback
│   ├── topics.ts             IHK-Themengebiete für FIAE und FISI
│   └── scenarios.ts          Unternehmensszenarien für Aufgabenkontexte
├── middleware/
│   └── auth.ts               JWT-Validierung
├── utils/
│   └── encryption.ts         AES-256-GCM für gespeicherte API-Keys
└── server.ts                 Express-Einstiegspunkt

data/
├── ap2_trainer.db            SQLite-Datenbankdatei (wird automatisch angelegt)
└── uploads/                  Hochgeladene Diagramm-Bilder
```

## Dokumentation

- [Datenbankschema](./docs/database.md)
- [API-Referenz](./docs/api.md)
- [KI-Integration & Prompt-Design](./docs/ai-integration.md)
- [Konfiguration & Deployment](./docs/deployment.md)
