# KI-Integration & Prompt-Design

## Übersicht

Die KI-Integration befindet sich vollständig in `src/services/aiService.ts`. Als Modell wird **Google Gemini 2.0 Flash** verwendet — das einzige Modell, das alle vier Anwendungsfälle (Text, Pseudocode, PlantUML-Analyse, Vision) im kostenlosen Tier abdeckt.

---

## Warum Gemini 2.0 Flash?

| Kriterium | Gemini 2.0 Flash | Alternative |
|---|---|---|
| Kostenloses Tier | 1.500 Req/Tag, 1M Tokens/Min | GPT-4o: nur 3 Req/Min kostenlos |
| JSON-Output nativ | `responseMimeType: 'application/json'` | Andere: Markdown-Parsing nötig |
| Vision (Bilder) | Enthalten im kostenlosen Modell | GPT-4o Vision: kostenpflichtig |
| Präzision bei strukturierten Aufgaben | Sehr gut bei `temperature: 0.1` | Vergleichbar |

---

## Konfiguration des API-Calls

```typescript
const body = {
  contents: [{ role: 'user', parts }],
  generationConfig: {
    temperature: 0.1,           // Fast deterministisch — wichtig für reproduzierbare Bewertungen
    topP: 0.8,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',  // Gemini gibt direkt JSON zurück
  },
}
```

**`temperature: 0.1`** ist der kritischste Parameter. Bei höheren Werten variieren Punktvergabe und Formulierungen — für eine Prüfungsbewertung ist Konsistenz wichtiger als Kreativität.

**`responseMimeType: 'application/json'`** zwingt Gemini, valides JSON ohne Markdown-Backticks zurückzugeben. Das eliminiert die häufigste Fehlerquelle bei LLM-JSON-Parsing.

---

## Bewertungsstrategien

### 1. Multiple Choice — Lokale Auswertung

MC-Aufgaben werden **ohne KI-Aufruf** ausgewertet. Die korrekte Option ist im `expectedAnswer`-Feld gespeichert:

```typescript
function gradeMcAnswer(selectedOptionId, expectedAnswer, maxPoints) {
  const isCorrect = selectedOptionId === expectedAnswer.correctOptionId
  const awarded = isCorrect ? maxPoints : 0
  // ...
}
```

**Vorteile:** Sofortiges Feedback, keine API-Kosten, 100% zuverlässig.

### 2. Freitext / Pseudocode — Semantische Analyse

Der System-Prompt legt die Prüferrolle und die IHK-Regeln fest. Der User-Prompt enthält Aufgabe, Erwartungshorizont und Schülerantwort.

**System-Prompt (gekürzt):**
```
Du bist ein erfahrener, strenger und fairer IHK-Prüfer für FIAE.
Aktueller Prüfungsbereich: [Teil-Beschreibung]

IHK-NOTENSCHEMA (Pflichtanwendung):
- 92–100 % → sehr_gut
...

BEWERTUNGSREGELN:
1. Anteilige Punktvergabe je Kriterium — kein binäres Alles-oder-Nichts
2. Sinngemäß korrekte Antworten werden akzeptiert; Fachbegriffe müssen korrekt sein
3. Pseudocode: Bewertest du Logik und algorithmische Korrektheit, nicht Syntax
4. Falsche Kernaussagen reduzieren Punkte auch wenn mit korrektem vermischt
5. Sei konstruktiv — Feedback soll dem Lernenden helfen

AUSGABE: Ausschließlich valides JSON-Objekt, keine Backticks.
```

**User-Prompt Struktur:**
```
AUFGABENSTELLUNG: [questionText]
MAXIMALPUNKTE: [maxPoints]
ERWARTUNGSHORIZONT (vertraulich): [expectedAnswer als JSON]
ANTWORT DES PRÜFLINGS: """[studentAnswer]"""

Gib folgendes JSON zurück: { awardedPoints, percentageScore, ihkGrade, feedbackText, criterionScores, keyMistakes, improvementHints }
```

#### Warum der Erwartungshorizont im Prompt?

Der Erwartungshorizont enthält `keyPoints` — konkrete Schlüsselaussagen, die in einer korrekten Antwort erwartet werden. Durch deren Übergabe an das Modell wird die Bewertung **aufgabenspezifisch und reproduzierbar**, statt allgemein und halluzinationsanfällig.

Beispiel für `keyPoints` bei einer SQL-Aufgabe:
```json
[
  "Kunden mit mehr als 3 Bestellungen seit 2024-01-01",
  "LEFT JOIN aber WHERE auf b.datum filtert NULL heraus → effektiv INNER JOIN",
  "Kunden ohne Bestellungen werden nicht angezeigt"
]
```

Das Modell muss prüfen, ob diese Punkte in der Antwort semantisch enthalten sind — nicht ob die exakten Wörter übereinstimmen.

### 3. PlantUML — Code-Analyse

Der Prompt für PlantUML-Code ist identisch aufgebaut, enthält aber zusätzlich die `expectedElements`-Liste und explizite Gewichtungen der vier Bewertungskriterien:

```
Bewertungskriterien:
1. Syntaktische Korrektheit (25%)
2. Vollständigkeit aller geforderten Elemente (35%)
3. Semantische Korrektheit der Beziehungen (25%)
4. Lesbarkeit und sinnvolle Benennung (15%)
```

Die Prozentwerte werden dynamisch aus `maxPoints` berechnet, sodass das Modell konkrete Punktzahlen als Zielwerte erhält.

Der PlantUML-Code selbst wird als Codeblock im Prompt übergeben:
```
## PLANTUML-CODE DES PRÜFLINGS:
\`\`\`plantuml
@startuml
class Buch { ... }
@enduml
\`\`\`
```

### 4. Diagramm-Vision — Handschriftliche Eingabe

Für hochgeladene Bilder wird das Bild als Base64-String dem `parts`-Array vorangestellt:

```typescript
const parts = [
  {
    inlineData: {
      data: imageBase64,        // Base64-kodiertes Bild
      mimeType: 'image/png',
    }
  },
  { text: prompt }             // Prompt kommt nach dem Bild
]
```

Gemini 2.0 Flash kann handschriftliche UML-Skizzen erkennen und bewertet die erkannten Elemente gegen die `expectedElements`-Liste.

Das Antwort-JSON enthält zusätzlich:
- `detectedElements` — was das Modell im Bild erkannt hat
- `missingElements` — erwartete Elemente, die fehlen
- `notationErrors` — erkannte Fehler in der UML-Notation

---

## Fehlerbehandlung & Parsing

Das Modell kann trotz `responseMimeType: 'application/json'` gelegentlich Markdown-Backticks voranstellen. `parseGeminiJson()` bereinigt das:

```typescript
function parseGeminiJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned)
}
```

Außerdem wird `awardedPoints` immer geclampt:
```typescript
const awarded = Math.min(Math.max(Math.round(Number(parsed.awardedPoints) || 0), 0), maxPoints)
```

Das verhindert, dass das Modell versehentlich Punkte über dem Maximum oder negative Werte zurückgibt.

---

## IHK-Note aus Prozentwert

Die Notenzuordnung erfolgt deterministisch im Backend — das Modell schlägt eine Note vor, aber die finale Note wird aus `awardedPoints / maxPoints` im Backend berechnet:

```typescript
function deriveIhkGrade(percent: number): IhkGrade {
  if (percent >= 92) return 'sehr_gut'
  if (percent >= 81) return 'gut'
  if (percent >= 67) return 'befriedigend'
  if (percent >= 50) return 'ausreichend'
  if (percent >= 30) return 'mangelhaft'
  return 'ungenuegend'
}
```

Das Model-Feld `ihkGrade` im Prompt-JSON dient nur als Plausibilitätscheck — der tatsächlich gespeicherte Wert kommt immer aus `deriveIhkGrade()`.

---

## Prompt-Optimierung

Folgende Maßnahmen verbessern die Bewertungsqualität:

1. **Expliziter Erwartungshorizont** — statt allgemeinem Fachwissen prüft das Modell gegen konkrete Punkte
2. **`temperature: 0.1`** — minimiert Varianz bei gleichen Eingaben
3. **JSON-Schema im Prompt** — das erwartete Output-Format wird exakt beschrieben, mit Typ-Annotationen
4. **Regel gegen "Alles-oder-Nichts"** — verhindert, dass das Modell bei kleinen Fehlern alle Punkte abzieht
5. **Fachbegriff-Regel** — stellt sicher, dass technische Korrektheit gewichtet wird
6. **Maximalpunkte explizit nennen** — das Modell kennt den Rahmen und vergibt keine übersteigenden Werte

---

## Rate Limiting & Kostenübersicht

Bei intensiver Nutzung (Schulklasse, viele Sessions gleichzeitig) kann das kostenlose Tier an Grenzen stoßen. Empfohlene Maßnahme: KI-Bewertungen werden nur auf expliziten Nutzer-Klick ausgelöst, nicht automatisch nach jeder Eingabe.

| Aufgabentyp | KI-Aufruf | Tokens (ca.) | Kosten |
|---|---|---|---|
| Multiple Choice | Nein | 0 | 0 |
| Freitext (kurz) | Ja | ~800 | Kostenlos |
| Freitext (lang) | Ja | ~1.500 | Kostenlos |
| Pseudocode | Ja | ~1.200 | Kostenlos |
| PlantUML | Ja | ~1.000 | Kostenlos |
| Diagramm-Bild | Ja | ~1.500 + Bild | Kostenlos |

Selbst bei 10 Bewertungen pro Prüfung und 50 Nutzer-Sessions am Tag: ~500 Anfragen — weit unter dem Tageslimit von 1.500.
