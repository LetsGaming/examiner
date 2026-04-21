# Typsystem (`types/index.ts`)

Alle gemeinsam genutzten TypeScript-Typen sind in `src/types/index.ts` zentralisiert. Dieselbe Datei wird vom Frontend referenziert; das Backend definiert seine eigenen kompatiblen Typen inline, um keine direkte Abhängigkeit zu erzwingen.

---

## Primitive Typen (String-Unions)

```typescript
type ExamPart  = 'teil_1' | 'teil_2' | 'teil_3'
type TaskType  = 'freitext' | 'pseudocode' | 'mc' | 'plantuml' | 'diagram_upload'
type DiagramType = 'uml_class' | 'uml_sequence' | 'uml_use_case' | 'uml_activity' | 'er'
type SessionStatus = 'in_progress' | 'submitted' | 'graded'
type IhkGrade  = 'sehr_gut' | 'gut' | 'befriedigend' | 'ausreichend' | 'mangelhaft' | 'ungenuegend'
```

---

## Datenmodell-Interfaces

### `Task`

Repräsentiert eine einzelne Prüfungsaufgabe.

```typescript
interface Task {
  id:               string
  examTemplateId:   string
  position:         number            // Reihenfolge innerhalb der Prüfung
  taskType:         TaskType
  questionText:     string
  expectedAnswer:   Record<string, unknown>  // Strukturiert nach taskType
  maxPoints:        number
  topicArea?:       string            // z.B. "Algorithmen & Komplexität"
  diagramType?:     DiagramType       // Nur bei plantuml / diagram_upload
  expectedElements?: string[]         // Erwartete Diagramm-Elemente
  mcOptions?:       McOption[]        // Nur bei mc
}
```

Das Feld `expectedAnswer` ist absichtlich als `Record<string, unknown>` typisiert, da die interne Struktur je nach `taskType` variiert:

| taskType | expectedAnswer-Struktur |
|---|---|
| `freitext` / `pseudocode` | `{ keyPoints: string[], minKeyPointsRequired: number }` |
| `mc` | `{ correctOptionId: string, explanation: string }` |
| `plantuml` / `diagram_upload` | `{ requiredClasses: string[], requiredRelations: string[], ... }` |

### `ExamTemplate`

```typescript
interface ExamTemplate {
  id:              string
  title:           string
  year:            number
  part:            ExamPart
  maxPoints:       number
  durationMinutes: number
  tasks:           Task[]
}
```

### `AiEvaluation`

Das vollständige Ergebnis einer KI-Bewertung.

```typescript
interface AiEvaluation {
  id?:               string
  answerId:          string
  awardedPoints:     number
  maxPoints:         number
  percentageScore:   number          // 0–100, ganzzahlig
  ihkGrade:          IhkGrade
  feedbackText:      string          // 2–4 konstruktive Sätze
  criterionScores:   CriterionScore[]
  keyMistakes:       string[]
  improvementHints:  string[]
  // Nur bei Diagramm-Aufgaben:
  detectedElements?: string[]
  missingElements?:  string[]
  notationErrors?:   string[]
  modelUsed:         string
  createdAt?:        string
}
```

### `CriterionScore`

```typescript
interface CriterionScore {
  criterion: string    // Name des Bewertungskriteriums
  awarded:   number    // Erreichte Punkte
  max:       number    // Maximalpunkte dieses Kriteriums
  comment:   string    // 1-Satz-Erläuterung
}
```

### `Answer`

```typescript
interface Answer {
  id:                string
  sessionId:         string
  taskId:            string
  textValue:         string
  selectedMcOption:  string | null
  diagramImagePath?: string
  answeredAt?:       string
  evaluation?:       AiEvaluation   // Optional — nur wenn bereits bewertet
}
```

### `ExamSession`

```typescript
interface ExamSession {
  id:               string
  userId:           string
  examTemplateId:   string
  examTemplate?:    ExamTemplate    // Mitgeladen via JOIN
  startedAt:        string
  submittedAt?:     string
  status:           SessionStatus
  totalScore?:      number
  ihkGrade?:        IhkGrade
  answers:          Answer[]
}
```

---

## Hilfskonstanten

```typescript
// Für die Darstellung im UI
const IHK_GRADE_LABELS: Record<IhkGrade, string> = {
  sehr_gut:      'Sehr gut (1)',
  gut:           'Gut (2)',
  befriedigend:  'Befriedigend (3)',
  ausreichend:   'Ausreichend (4)',
  mangelhaft:    'Mangelhaft (5)',
  ungenuegend:   'Ungenügend (6)',
}

// Für farbliche Kodierung mit Ionic-Farbsystem
const IHK_GRADE_COLORS: Record<IhkGrade, string> = {
  sehr_gut:      'success',
  gut:           'primary',
  befriedigend:  'secondary',
  ausreichend:   'warning',
  mangelhaft:    'danger',
  ungenuegend:   'danger',
}
```

---

## Erweiterung des Typsystems

Neue Aufgabentypen können durch folgende Schritte ergänzt werden:

1. `TaskType` Union in `types/index.ts` um den neuen Wert erweitern.
2. In `ExamView.vue` im Template-Block einen neuen `<template v-else-if>` Zweig ergänzen.
3. Im Backend `aiService.ts` die Bewertungslogik für den neuen Typ implementieren.
4. In `examRoutes.ts` den `isDiagram`-Check ggf. anpassen.
