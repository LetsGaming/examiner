/**
 * prompts/freitextPrompt.ts — User-Prompt für Freitext-Bewertung.
 *
 * Wird von freitextGrader verwendet. Übergibt:
 *  - Aufgabenstellung (questionText ohne Platzhalter)
 *  - Maximalpunkte
 *  - Operator-Dimension (falls im Rezept gesetzt — bestimmt Erwartungsniveau)
 *  - Spezifischer Bewertungshinweis (rezept-granular, MD §5.1 "je Entität 1P")
 *  - Erwartungshorizont (vertrauliche Musterlösung)
 *  - Antwort des Prüflings
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { OPERATOR_GUIDANCE, stripPlaceholders, type Operator } from '../../domain/taxonomy.js';
import type { AssessAnswerParams } from '../types.js';

export function buildFreitextUserPrompt(params: AssessAnswerParams): string {
  const questionText = stripPlaceholders(params.questionText);
  const expectedAnswerJson = stripPlaceholders(JSON.stringify(params.expectedAnswer, null, 2));

  const operatorLine = buildOperatorLine(params.expectedAnswer);
  const gradingHintLine = buildGradingHintLine(params.expectedAnswer);
  const jsonTemplate = buildJsonResponseTemplate(params.maxPoints);

  return `AUFGABENSTELLUNG:
${questionText}

MAXIMALPUNKTE: ${params.maxPoints}
${operatorLine}${gradingHintLine}
ERWARTUNGSHORIZONT (vertraulich — EINE mögliche Musterlösung, nicht die einzig richtige):
${expectedAnswerJson}

ANTWORT DES PRÜFLINGS:
"""
${params.studentAnswer}
"""

BEWERTUNGSANSATZ:
- Richte dich nach der Operator-Dimension: "nennen"-Antworten dürfen kurz sein; "erläutern"-Antworten brauchen Begründung.
- Folge dem spezifischen Bewertungshinweis, falls vorhanden — er zeigt dir die Punktverteilung für diese konkrete Aufgabe (z.B. "je Entitätstyp 1P").
- Punkte proportional zur Qualität und Vollständigkeit der Antwort. Kein pauschaler Mindestwert — Teilpunkte entsprechen dem tatsächlichen Anteil korrekter Kernaussagen.
- Der Erwartungshorizont ist EINE Musterlösung. Andere sachlich korrekte Antworten sind gleichwertig und bekommen volle Punkte.
- Bei Aufzählungen (z.B. "Nennen Sie 3 Punkte"): jeder korrekt genannte Punkt zählt anteilig. 2 von 3 = ⅔ der Punkte. Werden mehr genannt als gefordert, zählen die besten.
- Im Zweifel für den Prüfling: bei plausiblen, aber abweichend formulierten Antworten eher Punkte geben als abziehen.
- improvementHints MÜSSEN konkrete fachliche Lösungsvorschläge enthalten — was genau hätte in der Antwort stehen sollen (Fachbegriff nennen, Rechenschritt zeigen, fehlenden Aspekt benennen).
- Kriteriennamen MÜSSEN aussagekräftig sein: "Inhaltliche Korrektheit", "Vollständigkeit", "Begründung", "Fachbegriffe" etc. NIEMALS "Kriterium 1/2".

Bewerte die Antwort und gib ausschließlich dieses JSON zurück:
${jsonTemplate}`;
}

function buildOperatorLine(expected: Record<string, unknown>): string {
  const op = typeof expected.operator === 'string' ? (expected.operator as Operator) : null;
  if (!op || !OPERATOR_GUIDANCE[op]) return '';
  return `\nOPERATOR-DIMENSION: ${OPERATOR_GUIDANCE[op]}\n`;
}

function buildGradingHintLine(expected: Record<string, unknown>): string {
  const hint = typeof expected.gradingHint === 'string' ? expected.gradingHint : '';
  return hint ? `\nSPEZIFISCHER BEWERTUNGSHINWEIS: ${hint}\n` : '';
}

function buildJsonResponseTemplate(maxPoints: number): string {
  return `{
  "awardedPoints": <integer 0–${maxPoints}>,
  "percentageScore": <integer 0–100>,
  "ihkGrade": <"sehr_gut"|"gut"|"befriedigend"|"ausreichend"|"mangelhaft"|"ungenuegend">,
  "feedbackText": "<2–4 konstruktive Sätze auf Deutsch>",
  "criterionScores": [
    { "criterion": "<aussagekräftiger Name>", "awarded": <n>, "max": <n>, "comment": "<1 Satz>" }
  ],
  "keyMistakes": ["<Fehler 1>"],
  "improvementHints": ["<konkreter Lösungsvorschlag 1>"]
}`;
}
