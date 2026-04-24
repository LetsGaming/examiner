/**
 * prompts/diagramPrompt.ts — User-Prompt für Diagramm-Bewertung (UML, ER).
 *
 * Bewertet sowohl Bild-Uploads (Vision) als auch PlantUML-Code. Das System-
 * Prompt für die Rolle kommt nicht aus gradingSystem.ts — Diagramm-Bewertung
 * ist strukturell anders (Elemente zählen statt Text bewerten) und nutzt
 * eigene Kriterien: Notation, Vollständigkeit, Semantik, Lesbarkeit.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { DIAGRAM_TYPE_LABELS, stripPlaceholders } from '../../domain/taxonomy.js';
import type { AnalyzeDiagramParams } from '../types.js';

export function buildDiagramUserPrompt(params: AnalyzeDiagramParams): string {
  const scenarioLine = params.scenarioContext ? `\nKONTEXT: ${params.scenarioContext}\n` : '';
  const taskDescription = stripPlaceholders(params.taskDescription);
  const label = DIAGRAM_TYPE_LABELS[params.diagramType];

  const notation = Math.round(params.maxPoints * 0.25);
  const completeness = Math.round(params.maxPoints * 0.35);
  const semantics = Math.round(params.maxPoints * 0.25);
  const readability = Math.round(params.maxPoints * 0.15);

  const expectedList = params.expectedElements.map((e, i) => `${i + 1}. ${e}`).join('\n');
  const diagramBody = params.plantUmlCode
    ? `PLANTUML-CODE DES PRÜFLINGS:\n\`\`\`plantuml\n${params.plantUmlCode}\n\`\`\``
    : 'Das Diagramm ist als Bild beigefügt. Erkenne und bewerte alle sichtbaren Elemente.';

  return `Du analysierst ein ${label} im Rahmen einer FIAE AP2-Prüfung.
${scenarioLine}
AUFGABENSTELLUNG:
${taskDescription}

MAXIMALPUNKTE: ${params.maxPoints}

ERWARTETE ELEMENTE:
${expectedList}

${diagramBody}

Bewertungskriterien (proportionale Teilpunkte je Kriterium):
1. Syntaktische Korrektheit der UML/ER-Notation (${notation}P)
2. Vollständigkeit aller geforderten Elemente (${completeness}P) — jedes fehlende Element kostet anteilig Punkte.
3. Semantische Korrektheit der Beziehungen/Multiplizitäten (${semantics}P)
4. Lesbarkeit und sinnvolle Benennung (${readability}P)

FAIRE GRUNDHALTUNG: Im Zweifel für den Prüfling — wenn ein Element sinngemäß richtig modelliert ist, auch wenn Notation leicht abweicht, volle Punkte. Falsche Multiplizitäten oder fehlende Elemente werden aber konsequent als Abzug gewertet.

improvementHints MÜSSEN konkret sein: benenne welches Element fehlt oder welche Beziehung falsch ist (z.B. "Die Beziehung zwischen Kunde und Bestellung sollte 1:n sein, nicht n:m" statt "achte auf Multiplizitäten").

Antworte AUSSCHLIESSLICH mit diesem JSON:
{
  "awardedPoints": <integer 0–${params.maxPoints}>,
  "percentageScore": <integer 0–100>,
  "ihkGrade": <"sehr_gut"|"gut"|"befriedigend"|"ausreichend"|"mangelhaft"|"ungenuegend">,
  "feedbackText": "<2–4 Sätze>",
  "criterionScores": [
    { "criterion": "<n>", "awarded": <n>, "max": <n>, "comment": "<1 Satz>" }
  ],
  "detectedElements": ["<erkanntes Element>"],
  "missingElements": ["<fehlendes Element>"],
  "notationErrors": ["<Fehler>"],
  "keyMistakes": [],
  "improvementHints": []
}`;
}
