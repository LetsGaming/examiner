# API-Referenz

Alle Endpunkte geben JSON zurück. Erfolgreiche Antworten folgen dem Schema:

```json
{ "success": true, "data": { ... } }
```

Fehler:

```json
{ "success": false, "error": "Fehlerbeschreibung" }
```

---

## GET `/api/health`

Health-Check.

**Response:**
```json
{ "ok": true, "timestamp": "2024-09-15T10:30:00.000Z" }
```

---

## GET `/api/exams`

Alle Prüfungsvorlagen auflisten.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "demo-teil1-2024",
      "title": "AP2 Musterpüfung 2024 – Teil 1",
      "year": 2024,
      "part": "teil_1",
      "max_points": 36,
      "duration_minutes": 90,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## GET `/api/exams/:id`

Eine Prüfungsvorlage mit allen Aufgaben laden.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "demo-teil1-2024",
    "title": "AP2 Musterpüfung 2024 – Teil 1",
    "part": "teil_1",
    "max_points": 36,
    "duration_minutes": 90,
    "tasks": [
      {
        "id": "task-t1-01",
        "position": 1,
        "task_type": "freitext",
        "question_text": "Erläutern Sie den Unterschied...",
        "max_points": 8,
        "topic_area": "Anforderungsanalyse",
        "diagram_type": null,
        "expectedElements": [],
        "mcOptions": []
      }
    ]
  }
}
```

**Fehler:** `404` wenn Vorlage nicht gefunden.

---

## POST `/api/exams/:id/sessions`

Neue Prüfungssession starten. Wenn bereits eine laufende Session des gleichen Nutzers für diese Vorlage existiert, wird deren ID zurückgegeben (idempotent).

**Request Body:** leer

**Response:**
```json
{ "success": true, "data": { "sessionId": "abc123..." } }
```

**Fehler:** `404` wenn Vorlage nicht gefunden.

---

## GET `/api/sessions/:sessionId`

Session mit allen Antworten und vorhandenen Bewertungen laden.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "user_id": "local-user",
    "exam_template_id": "demo-teil1-2024",
    "title": "AP2 Musterpüfung 2024 – Teil 1",
    "part": "teil_1",
    "duration_minutes": 90,
    "started_at": "2024-09-15T10:00:00.000Z",
    "status": "in_progress",
    "answers": [
      {
        "id": "answer-uuid",
        "task_id": "task-t1-01",
        "text_value": "Funktionale Anforderungen beschreiben...",
        "selected_mc_option": null,
        "answered_at": "2024-09-15T10:15:00.000Z",
        "evaluation": {
          "awardedPoints": 6,
          "maxPoints": 8,
          "percentageScore": 75,
          "ihkGrade": "befriedigend",
          "feedbackText": "...",
          "criterionScores": [...],
          "keyMistakes": [...],
          "improvementHints": [...]
        }
      }
    ]
  }
}
```

**Fehler:** `404` wenn Session nicht gefunden.

---

## PUT `/api/sessions/:sessionId/answers/:taskId`

Antwort speichern oder aktualisieren. Existiert noch keine Antwort für diese Aufgabe in der Session, wird sie angelegt (INSERT). Sonst UPDATE.

**Request Body:**
```json
{
  "textValue": "Der Unterschied zwischen...",
  "selectedMcOption": null
}
```

Beide Felder sind optional. Nur gesetzte Felder werden übernommen.

**Response:**
```json
{ "success": true, "data": { "answerId": "answer-uuid" } }
```

---

## POST `/api/sessions/:sessionId/answers/:taskId/upload`

Diagramm-Bild hochladen. Erwartet `multipart/form-data` mit dem Feld `diagram`.

**Erlaubte MIME-Types:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`

**Max. Dateigröße:** 8 MB

**Request:** `Content-Type: multipart/form-data`
```
diagram: <Datei>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answerId": "answer-uuid",
    "imagePath": "/home/.../data/uploads/1700000000-abc123.png"
  }
}
```

**Fehler:** `400` wenn keine Datei empfangen.

---

## POST `/api/sessions/:sessionId/answers/:answerId/evaluate`

KI-Bewertung für eine gespeicherte Antwort anfordern. Der Endpunkt ermittelt anhand der Aufgabe automatisch, welche Bewertungsstrategie verwendet wird:

| `task_type` | Strategie |
|---|---|
| `mc` | Lokaler Vergleich mit `correctOptionId` — kein API-Aufruf |
| `freitext` / `pseudocode` | Gemini Text-Bewertung |
| `plantuml` | Gemini Text-Analyse des PlantUML-Codes |
| `diagram_upload` | Gemini Vision — Bild wird als Base64 übergeben |

Eine bestehende Bewertung wird überschrieben (UPSERT).

**Antwortzeit:** 3–15 Sekunden je nach Aufgabenlänge.

**Response:**
```json
{
  "success": true,
  "data": {
    "awardedPoints": 6,
    "maxPoints": 8,
    "percentageScore": 75,
    "ihkGrade": "befriedigend",
    "feedbackText": "Die Antwort trifft den Kern der Unterscheidung...",
    "criterionScores": [
      {
        "criterion": "Definition funktionale Anforderungen",
        "awarded": 2,
        "max": 2,
        "comment": "Korrekt und vollständig erläutert."
      }
    ],
    "keyMistakes": ["Beispiele für nicht-funktionale Anforderungen fehlen"],
    "improvementHints": ["Nennen Sie konkrete Qualitätsmerkmale wie Antwortzeit oder Verfügbarkeit"],
    "modelUsed": "gemini-3.1-flash-lite-preview"
  }
}
```

**Fehler:**
- `404` wenn Antwort/Session nicht gefunden
- `500` wenn KI-API-Aufruf fehlschlägt (mit Fehlerbeschreibung)

---

## POST `/api/sessions/:sessionId/submit`

Prüfung abgeben. Berechnet die Gesamtnote aus allen vorhandenen `ai_evaluations` in dieser Session. Aufgaben ohne Bewertung zählen mit 0 Punkten.

**Request Body:** leer

**Response:**
```json
{
  "success": true,
  "data": {
    "totalScore": 22,
    "maxPoints": 36,
    "percentageScore": 61,
    "ihkGrade": "ausreichend"
  }
}
```

**Fehler:** `404` wenn keine aktive Session gefunden (Status bereits `graded` oder nicht existent).

---

## Statische Dateien

Hochgeladene Diagramm-Bilder sind unter `/uploads/<dateiname>` erreichbar:

```
GET /uploads/1700000000-abc123.png
```
