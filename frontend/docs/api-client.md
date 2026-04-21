# API-Client (`useApi.ts`)

Der API-Client kapselt alle HTTP-Anfragen an das Backend hinter typisierten Funktionen. Er verwendet **Axios** mit einer zentralen Instanz.

## Basis-Konfiguration

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8031/api',
  timeout: 60_000,  // 60s — großzügig für KI-Antworten
})
```

Der `VITE_API_URL` Wert kann in einer `.env`-Datei im Frontend-Verzeichnis gesetzt werden:

```
VITE_API_URL=http://localhost:8031/api
```

## Exportierte Funktionen

### `fetchExamList(): Promise<ExamTemplate[]>`

Lädt alle verfügbaren Prüfungsvorlagen.

```typescript
GET /api/exams
→ ExamTemplate[] (ohne tasks)
```

### `fetchExamTemplate(examId: string): Promise<ExamTemplate>`

Lädt eine Prüfungsvorlage inklusive aller Aufgaben.

```typescript
GET /api/exams/:examId
→ ExamTemplate (mit tasks[])
```

### `startSession(examId: string): Promise<string>`

Startet eine neue Prüfungssession oder gibt eine laufende zurück.

```typescript
POST /api/exams/:examId/sessions
→ { sessionId: string }
```

### `fetchSession(sessionId: string): Promise<ExamSession>`

Lädt eine Session mit allen bisher gespeicherten Antworten und Bewertungen.

```typescript
GET /api/sessions/:sessionId
→ ExamSession (mit answers[], evaluation pro Antwort)
```

### `saveAnswer(sessionId, taskId, payload): Promise<string>`

Speichert oder aktualisiert eine Antwort (Text oder MC-Option).

```typescript
PUT /api/sessions/:sessionId/answers/:taskId
Body: { textValue?: string, selectedMcOption?: string | null }
→ { answerId: string }
```

### `uploadDiagramImage(sessionId, taskId, file): Promise<{ answerId, imagePath }>`

Lädt ein Diagramm-Bild als `multipart/form-data` hoch.

```typescript
POST /api/sessions/:sessionId/answers/:taskId/upload
FormData: { diagram: File }
→ { answerId: string, imagePath: string }
```

### `requestEvaluation(sessionId, answerId): Promise<AiEvaluation>`

Fordert eine KI-Bewertung für eine gespeicherte Antwort an. Dieser Aufruf kann je nach KI-Antwortzeit 5–15 Sekunden dauern — daher ist der `timeout` auf 60s gesetzt.

```typescript
POST /api/sessions/:sessionId/answers/:answerId/evaluate
→ AiEvaluation
```

### `submitSession(sessionId): Promise<{ totalScore, maxPoints, percentageScore, ihkGrade }>`

Gibt die Prüfung ab. Berechnet die Gesamtnote aus allen vorliegenden Bewertungen.

```typescript
POST /api/sessions/:sessionId/submit
→ { totalScore, maxPoints, percentageScore, ihkGrade }
```

## Fehlerbehandlung

Alle Funktionen werfen bei Fehler einen `Error` mit lesबarer Nachricht. Empfehlung: In den Views mit `try/catch` und einem `error`-Ref abfangen.

```typescript
const error = ref<string | null>(null)
try {
  const exams = await fetchExamList()
} catch (err) {
  error.value = err instanceof Error ? err.message : 'Unbekannter Fehler'
}
```
