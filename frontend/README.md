# FIAE AP2 Trainer — Frontend

Single Page Application für die FIAE-AP2-Prüfungsvorbereitung, gebaut mit **Ionic 8 + Vue 3 + TypeScript + Vite**.

## Schnellstart

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Entwicklungsserver starten (Backend muss laufen)
npm run dev
# → http://localhost:5173

# 3. Production Build
npm run build
```

## Voraussetzungen

- Node.js ≥ 18
- Das Backend läuft auf `http://localhost:8031` (konfigurierbar in `vite.config.ts`)

## Projektstruktur

```
src/
├── components/
│   ├── ExamView.vue        Prüfungs-Hauptansicht (Timer, Navigation, Eingabe)
│   └── EvaluationPanel.vue KI-Bewertungsanzeige mit IHK-Note
├── composables/
│   └── useApi.ts           Axios-basierter API-Client
├── views/
│   ├── HomeView.vue        Prüfungsauswahl-Seite
│   ├── ExamStartView.vue   Details & Session-Start
│   ├── SessionView.vue     Wrapper mit Session-Ladung
│   └── ResultsView.vue     Gesamtergebnis nach Abgabe
├── router/
│   └── index.ts            Vue Router Konfiguration
├── types/
│   └── index.ts            Gemeinsame TypeScript-Typen
├── theme/
│   └── variables.css       Ionic CSS-Variablen / Dark Mode
├── App.vue                 Root-Komponente
└── main.ts                 App-Einstiegspunkt
```

## Technologie-Entscheidungen

**Ionic Vue** liefert native-ähnliche UI-Komponenten (`IonCard`, `IonSegment`, `IonModal`) mit eingebautem Responsive Design und Dark-Mode-Support — ohne eigenes Komponenten-System bauen zu müssen.

**Vue 3 Composition API** hält die Logik pro Komponente klar strukturiert und ermöglicht wiederverwendbare Composables (`useApi.ts`).

**Vite** sorgt für schnelle HMR-Entwicklungszyklen und optimierte Production Builds.

## Dokumentation

- [Komponentenarchitektur](./docs/components.md)
- [API-Client](./docs/api-client.md)
- [Typsystem](./docs/types.md)
- [Routing](./docs/routing.md)
- [Theming & Styles](./docs/theming.md)
