# Konfiguration & Deployment

## Umgebungsvariablen

Alle Konfigurationswerte werden über eine `.env`-Datei im Backend-Verzeichnis bereitgestellt.

```bash
cp .env.example .env
```

| Variable | Pflicht | Standard | Beschreibung |
|---|---|---|---|
| `GEMINI_API_KEY` | **Ja** | — | Google Gemini API Key |
| `PORT` | Nein | `3001` | HTTP-Port des Servers |
| `FRONTEND_URL` | Nein | `http://localhost:5173` | Frontend-URL für CORS |

### Gemini API Key erstellen

1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) öffnen
2. Google-Konto wählen oder erstellen
3. "Create API Key" klicken — ein Projekt wird automatisch angelegt
4. Key kopieren und in `.env` eintragen

Der Key beginnt mit `AIza` und ist ca. 39 Zeichen lang.

---

## Entwicklungsumgebung

```bash
npm install
npm run dev
```

`tsx watch` startet den Server mit automatischem Neustart bei Dateiänderungen (ähnlich `nodemon`, aber mit nativer TypeScript-Unterstützung).

---

## Production Build

```bash
npm run build    # Kompiliert TypeScript → dist/
npm start        # Startet dist/server.js
```

**Voraussetzungen für Production:**
- `data/`-Verzeichnis muss vom Prozess beschreibbar sein
- `GEMINI_API_KEY` muss gesetzt sein

---

## Datenbank-Backup

Die SQLite-Datenbankdatei liegt unter `data/fiae_ap2.db`. Ein Backup ist einfaches Kopieren dieser Datei:

```bash
cp data/fiae_ap2.db data/fiae_ap2_backup_$(date +%Y%m%d).db
```

Für automatische Backups kann ein Cron-Job genutzt werden:

```bash
# Täglich um 03:00 Uhr
0 3 * * * cp /pfad/zu/data/fiae_ap2.db /backups/fiae_ap2_$(date +\%Y\%m\%d).db
```

---

## Eigene Prüfungsaufgaben hinzufügen

Neue Aufgaben können direkt via SQL oder über ein Admin-Skript eingespielt werden.

### Beispiel: Neue Prüfungsvorlage per SQL

```sql
-- Vorlage anlegen
INSERT INTO exam_templates (id, title, year, part, max_points, duration_minutes)
VALUES ('ap2-2025-t1', 'AP2 2025 – Teil 1', 2025, 'teil_1', 36, 90);

-- Freitext-Aufgabe hinzufügen
INSERT INTO tasks (
  id, exam_template_id, position, task_type,
  question_text, expected_answer, max_points, topic_area
) VALUES (
  'task-2025-t1-01',
  'ap2-2025-t1',
  1,
  'freitext',
  'Erklären Sie das SOLID-Prinzip und nennen Sie für jeden Buchstaben ein Beispiel.',
  '{"keyPoints": ["Single Responsibility", "Open/Closed", "Liskov Substitution", "Interface Segregation", "Dependency Inversion"], "minKeyPointsRequired": 4}',
  10,
  'Softwaredesign'
);
```

### Beispiel: MC-Aufgabe

```sql
INSERT INTO tasks (
  id, exam_template_id, position, task_type,
  question_text, expected_answer, max_points, mc_options
) VALUES (
  'task-2025-t1-02',
  'ap2-2025-t1',
  2,
  'mc',
  'Welches Entwurfsmuster beschreibt die Trennung von Datenhaltung, Anzeigelogik und Steuerung?',
  '{"correctOptionId": "b", "explanation": "MVC (Model-View-Controller) trennt Daten (Model), Darstellung (View) und Steuerung (Controller)."}',
  2,
  '[{"id":"a","text":"Singleton"},{"id":"b","text":"Model-View-Controller"},{"id":"c","text":"Observer"},{"id":"d","text":"Factory"}]'
);
```

---

## CORS-Konfiguration

Das Backend erlaubt standardmäßig nur Anfragen von `FRONTEND_URL`. Für lokale Entwicklung:

```
FRONTEND_URL=http://localhost:5173
```

Für Production mit eigenem Domain:

```
FRONTEND_URL=https://meine-app.example.com
```

---

## Upload-Konfiguration

Hochgeladene Diagramm-Bilder werden unter `data/uploads/` gespeichert und sind über `/uploads/<dateiname>` erreichbar.

**Limits (in `examRoutes.ts` konfigurierbar):**

```typescript
const upload = multer({
  limits: { fileSize: 8 * 1024 * 1024 },  // 8 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})
```

---

## Mehrbenutzer-Betrieb

Die aktuelle `auth.ts`-Middleware injiziert `local-user` als Standard-`userId`. Für Mehrbenutzer-Betrieb kann hier eine JWT-Validierung ergänzt werden:

```typescript
// src/middleware/auth.ts — Erweiterung für JWT
import jwt from 'jsonwebtoken'

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Kein Token' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    (req as AuthRequest).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Ungültiger Token' })
  }
}
```

Für eine Einzelnutzer-Lernapp auf dem eigenen Rechner ist die bestehende Middleware ausreichend.

---

## Empfohlene Verzeichnisstruktur für Production

```
/opt/fiae-ap2-backend/
├── dist/                  Kompilierter TypeScript-Code
├── src/                   Quellcode
├── data/
│   ├── fiae_ap2.db        SQLite-Datenbankdatei
│   └── uploads/           Hochgeladene Bilder
├── .env                   Umgebungsvariablen (nicht im Git!)
└── package.json
```
