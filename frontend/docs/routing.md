# Routing

Das Frontend nutzt **`@ionic/vue-router`**, den Ionic-Wrapper um Vue Router 4. Er stellt sicher, dass Seitenübergänge die native Ionic-Animationslogik verwenden (Stack-basierte Navigation auf Mobile).

## Routen-Übersicht

```
/                   → Redirect nach /home
/home               → HomeView         (Prüfungsauswahl)
/exam/:examId       → ExamStartView    (Prüfungsdetails + Start)
/session/:sessionId → SessionView      (Aktive Prüfung)
/results/:sessionId → ResultsView      (Ergebnis nach Abgabe)
```

## Navigationsfluss

```
HomeView
  │  Klick auf Prüfungskarte
  ▼
ExamStartView
  │  Klick auf "Prüfung starten"
  │  → POST /api/exams/:id/sessions
  ▼
SessionView
  │  Lädt Session, rendert ExamView
  │  ExamView emittiert 'submitted'
  ▼
ResultsView
  (Ergebnis als Query-Parameter übergeben)
```

## Query-Parameter auf ResultsView

Da `ResultsView` keine eigene API-Abfrage macht, werden Ergebnisdaten direkt als Query-Parameter übergeben:

```typescript
// In SessionView nach Abgabe:
router.push({
  name: 'Results',
  params: { sessionId },
  query: {
    totalScore:      result.totalScore,
    maxPoints:       result.maxPoints,
    percentageScore: result.percentageScore,
    ihkGrade:        result.ihkGrade,
    examId:          session.value?.examTemplateId,
  }
})
```

## Lazy Loading

Alle Views sind lazy-loaded (`() => import(...)`), sodass der initiale Bundle klein bleibt:

```typescript
component: () => import('../views/HomeView.vue')
```

## Zurück-Navigation

`ExamStartView` nutzt `<ion-back-button default-href="/home">`, das sowohl Browser-History als auch Ionic's Stack-Navigation berücksichtigt.

In `ExamView` öffnet der Schließen-Button einen Bestätigungsdialog (`IonAlert`), bevor der Nutzer navigiert — um versehentliches Verlassen zu verhindern.
