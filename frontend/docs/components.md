# Komponentenarchitektur

## Übersicht

Das Frontend ist in **Views** (Seiten, routbar) und **Components** (wiederverwendbare UI-Bausteine) unterteilt.

```
Views (Seiten)              Components (Bausteine)
─────────────────           ──────────────────────────
HomeView                    ExamView
  └─ Prüfungsauswahl           └─ Kernkomponente der Prüfung
ExamStartView                     ├─ Timer-Header
  └─ Details & Start               ├─ Aufgaben-Navigation (Sidebar)
SessionView                        ├─ Eingabe-Editoren (MC, Text, PlantUML, Upload)
  └─ Lädt Session, bindet          └─ Bewertungs-Button
     ExamView ein            EvaluationPanel
ResultsView                     └─ IHK-Note, Kriterien, Feedback
  └─ Gesamtergebnis
```

---

## ExamView.vue

Die zentrale Komponente der Anwendung. Sie orchestriert den gesamten Prüfungsablauf.

### Props

| Prop | Typ | Beschreibung |
|---|---|---|
| `sessionId` | `string` | ID der laufenden Prüfungssession |
| `examPart` | `ExamPart` | Prüfungsteil (`teil_1` / `teil_2` / `teil_3`) |
| `tasks` | `Task[]` | Liste aller Aufgaben dieser Prüfung |

### Emits

| Event | Payload | Beschreibung |
|---|---|---|
| `submitted` | `{ totalScore, maxPoints, percentageScore, ihkGrade }` | Wird nach erfolgreicher Abgabe gefeuert |

### Interner Zustand

```typescript
interface AnswerState {
  taskId:           string
  answerId:         string | null   // null bis erste Speicherung
  textValue:        string
  selectedMcOption: string | null
  uploadedFile:     File | null
  evaluation:       AiEvaluation | null
  isEvaluating:     boolean
  error:            string | null
}
```

### Auto-Save-Mechanismus

Jede Änderung an einer Antwort löst `debouncedSave()` aus, das nach 800 ms `persistAnswer(index)` aufruft. So wird der Backend-Speicher kontinuierlich aktualisiert, ohne bei jedem Tastendruck eine Anfrage abzusetzen.

```
User tippt → debouncedSave() → [800ms Pause] → persistAnswer() → PUT /api/sessions/:id/answers/:taskId
```

### Unterstützte Aufgabentypen

| `taskType` | Eingabe-UI | Besonderheit |
|---|---|---|
| `freitext` | `<ion-textarea>` | Auto-grow, Spellcheck aktiv |
| `pseudocode` | `<ion-textarea>` | Monospace-Font, dunkles Theme, Spellcheck deaktiviert |
| `mc` | Custom Radio-Liste | Lokale Auswertung ohne KI-Aufruf |
| `plantuml` | Split-View: Code-Editor + Live-Preview | Preview via `plantuml.com/plantuml/svg/` |
| `diagram_upload` | Drag-&-Drop + Click Upload-Zone | Bild-Vorschau nach Auswahl |

### PlantUML Live-Preview

Der PlantUML-Code wird clientseitig base64-kodiert und als URL an den öffentlichen PlantUML-Render-Service übergeben:

```typescript
const encoded = btoa(unescape(encodeURIComponent(code)))
plantUmlPreviewUrl.value = `https://www.plantuml.com/plantuml/svg/~1${encoded}`
```

Kein eigener Render-Server nötig — der öffentliche Service ist kostenlos.

### Timer

Der Timer läuft als `setInterval` in der Komponente. Bei Ablauf wird `handleSubmit()` automatisch aufgerufen. Die verbleibende Zeit ändert die visuellen Zustände des Timer-Chips:

```
> 5 Min  → neutral (grau)
1–5 Min  → Warnung (gelb)
< 1 Min  → Kritisch (rot, pulsierend)
```

---

## EvaluationPanel.vue

Zeigt das Ergebnis einer KI-Bewertung an. Wird dynamisch in `ExamView` eingeblendet, sobald `answer.evaluation` gesetzt ist.

### Props

| Prop | Typ | Beschreibung |
|---|---|---|
| `evaluation` | `AiEvaluation` | Das vollständige Bewertungsobjekt |
| `maxPoints` | `number` | Maximalpunkte der Aufgabe |

### Dargestellte Informationen

1. **Note-Header** — IHK-Note (z.B. "Gut (2)") + erreichte Punkte
2. **Farbiger Fortschrittsbalken** — Farbe entspricht der Note
3. **Feedback-Text** — konstruktive Zusammenfassung (2–4 Sätze)
4. **Kriterienübersicht** — pro Kriterium: Name, Punkte, Mini-Balken, 1-Satz-Kommentar
5. **Diagramm-Analyse** (nur bei `plantuml`/`diagram_upload`):
   - Erkannte Elemente (grüne Tags)
   - Fehlende Elemente (rote Tags)
   - Notationsfehler (gelbe Tags)
6. **Fehler & Verbesserungshinweise** — zweispaltig
7. **Modell-Info** — welches KI-Modell die Bewertung erstellt hat

### CSS-Varianten

Die Rahmenfarbe des Panels passt sich automatisch der Note an:

```css
.eval-panel--sehr_gut     { border-color: var(--ion-color-success); }
.eval-panel--gut          { border-color: var(--ion-color-primary); }
.eval-panel--befriedigend { border-color: var(--ion-color-secondary); }
.eval-panel--ausreichend  { border-color: var(--ion-color-warning); }
.eval-panel--mangelhaft,
.eval-panel--ungenuegend  { border-color: var(--ion-color-danger); }
```

---

## HomeView.vue

Lädt beim Mounten alle Prüfungsvorlagen vom Backend und zeigt sie als Card-Grid an. Ein `IonSegment` filtert nach Prüfungsteil.

## ExamStartView.vue

Zeigt Detailinfos zur gewählten Prüfung (Dauer, Punkte, Aufgabenanzahl) und startet mit einem Klick eine neue Session (`POST /api/exams/:id/sessions`).

## SessionView.vue

Lädt die Session-Daten (`GET /api/sessions/:sessionId`) und übergibt sie an `ExamView`. Leitet nach der Abgabe auf `ResultsView` weiter.

## ResultsView.vue

Empfängt das Gesamtergebnis als Query-Parameter und zeigt es mit dem IHK-Notenspiegel an.
