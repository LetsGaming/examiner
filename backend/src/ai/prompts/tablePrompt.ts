/**
 * prompts/tablePrompt.ts — User-Prompt-Baustein für Tabellen-Bewertung.
 *
 * Tabellen werden im Rezept als `tableConfig` definiert (MD §5.1 Stakeholder-/
 * Risiko-/ACID-Tabellen). Der Prüfling füllt Zeilen aus; der Prüfer vergleicht
 * mit `expectedAnswer.rows` (falls vorgegeben) oder bewertet nach Plausibilität.
 *
 * Gewichtung: Inhalt 70 % / Vollständigkeit 20 % / Fachliche Präzision Rest
 * — Inhalt überwiegt, weil bei Tabellen die eigentliche Leistung die Befüllung
 * ist (Format ist vorgegeben).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AssessAnswerParams } from '../types.js';

const DEFAULT_HINT =
  'Sinngemäß korrekte Antworten akzeptieren. Verschiedene korrekte Ansätze sind gleichwertig.';

interface TableCriteriaPoints {
  content: number;
  completeness: number;
  precision: number;
}

function splitTablePoints(maxPoints: number): TableCriteriaPoints {
  const content = Math.max(1, Math.round(maxPoints * 0.7));
  const completeness = Math.max(1, Math.round(maxPoints * 0.2));
  const precision = Math.max(0, maxPoints - content - completeness);
  return { content, completeness, precision };
}

/** Zerlegt die `studentAnswer` (JSON-stringified string[][]) in nicht-leere Zeilen. */
export function extractFilledRows(studentAnswer: string): string[][] {
  try {
    const parsed: unknown = JSON.parse(studentAnswer);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(
      (r): r is string[] =>
        Array.isArray(r) && r.some((c) => typeof c === 'string' && c.trim().length > 0),
    );
  } catch {
    return [];
  }
}

function formatMarkdownTable(columns: string[], rows: string[][]): string {
  const header = columns.join(' | ');
  const separator = columns.map(() => '---').join(' | ');
  const body = rows.map((r) => r.join(' | ')).join('\n');
  return `${header}\n${separator}\n${body}`;
}

/**
 * Baut den User-Prompt-Teil für die Tabellen-Bewertung (OHNE System-Prompt).
 * Der Caller (tableGrader) stellt das System-Prompt aus `gradingSystem.ts` davor.
 */
export function buildTableUserPrompt(params: AssessAnswerParams): string {
  const expected = params.expectedAnswer;
  const expectedRows = (expected.rows as string[][]) ?? [];
  const columns = (expected.columns as string[]) ?? [];
  const exampleRow = (expected.exampleRow as string[]) ?? [];
  const filledStudentRows = extractFilledRows(params.studentAnswer);

  const studentTable =
    filledStudentRows.length > 0 ? formatMarkdownTable(columns, filledStudentRows) : '(keine Angabe)';
  const expectedTable =
    expectedRows.length > 0
      ? formatMarkdownTable(columns, expectedRows)
      : '(kein fester Erwartungshorizont — Bewertung nach Plausibilität)';

  const exampleRowBlock =
    exampleRow.length > 0
      ? `\nBEISPIELZEILE (wurde dem Prüfling zur Orientierung vorgegeben — NICHT als fehlend werten wenn nicht wiederholt):\n${formatMarkdownTable(columns, [exampleRow])}\n`
      : '';

  const hint = typeof expected.gradingHint === 'string' ? expected.gradingHint : DEFAULT_HINT;

  const pts = splitTablePoints(params.maxPoints);

  return `AUFGABENSTELLUNG:
${params.questionText}

MAXIMALPUNKTE: ${params.maxPoints}

ERWARTUNGSHORIZONT (vertraulich, EINE mögliche Musterlösung):
${expectedTable}
${exampleRowBlock}
Hinweis: ${hint}

ANTWORT DES PRÜFLINGS (Tabelle, nur ausgefüllte Zeilen):
${studentTable}

BEWERTUNG (fair und wohlwollend, Teilpunkte großzügig):
- Inhaltliche Korrektheit (${pts.content}P): Sind die Einträge sachlich richtig? Abweichende aber plausible Formulierungen sind gleichwertig zur Musterlösung.
- Vollständigkeit (${pts.completeness}P): Sind die geforderten Zeilen befüllt? (Die Beispielzeile muss NICHT wiederholt werden.)
- Fachliche Präzision (${pts.precision}P): Werden Fachbegriffe korrekt verwendet? Alltagssprache mit korrektem Inhalt zählt voll.

WICHTIG:
- Nenne Kriterien im Ergebnis aussagekräftig: "Inhaltliche Korrektheit", "Vollständigkeit", "Fachliche Präzision" — NIEMALS "Kriterium 1/2/3".
- Wenn die Tabelle leer oder fast leer ist (0-1 Einträge): geringe Punktzahl, aber kein automatisches 0.
- Wenn 80% der Einträge sinngemäß richtig sind: mindestens 80% der Punkte.

Gib ausschließlich dieses JSON zurück:
{
  "awardedPoints": <integer 0-${params.maxPoints}>,
  "percentageScore": <integer 0-100>,
  "ihkGrade": <"sehr_gut"|"gut"|"befriedigend"|"ausreichend"|"mangelhaft"|"ungenuegend">,
  "feedbackText": "<2-4 konstruktive Sätze auf Deutsch>",
  "criterionScores": [
    { "criterion": "Inhaltliche Korrektheit", "awarded": <n>, "max": ${pts.content}, "comment": "<1 Satz>" },
    { "criterion": "Vollständigkeit", "awarded": <n>, "max": ${pts.completeness}, "comment": "<1 Satz>" },
    { "criterion": "Fachliche Präzision", "awarded": <n>, "max": ${pts.precision}, "comment": "<1 Satz>" }
  ],
  "keyMistakes": ["<Fehler>"],
  "improvementHints": ["<Tipp>"]
}`;
}
