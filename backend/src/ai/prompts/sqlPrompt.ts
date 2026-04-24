/**
 * prompts/sqlPrompt.ts — User-Prompt für SQL-Bewertung.
 *
 * Unterscheidet explizit 4 Kriterien mit proportionalen Gewichten:
 *  - Syntaktische Korrektheit (20 %)
 *  - Korrekte Tabellen- und Spaltenbezüge (30 %)
 *  - Logische Korrektheit (35 %)
 *  - Erwartete Ergebnismenge (Rest)
 *
 * Sinngemäß äquivalente Lösungen werden akzeptiert (INNER JOIN vs.
 * impliziter Join, Aliase, Case-Insensitivity). Fehlende WHERE bei
 * UPDATE/DELETE zählt als kritischer Fehler.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { stripPlaceholders } from '../../domain/taxonomy.js';
import type { AssessAnswerParams } from '../types.js';

interface SqlCriteriaPoints {
  syntax: number;
  schema: number;
  logic: number;
  result: number;
}

function splitSqlPoints(maxPoints: number): SqlCriteriaPoints {
  const syntax = Math.max(1, Math.round(maxPoints * 0.2));
  const schema = Math.max(1, Math.round(maxPoints * 0.3));
  const logic = Math.max(1, Math.round(maxPoints * 0.35));
  const result = Math.max(1, maxPoints - syntax - schema - logic);
  return { syntax, schema, logic, result };
}

export function buildSqlUserPrompt(params: AssessAnswerParams): string {
  const questionText = stripPlaceholders(params.questionText);
  const expected = params.expectedAnswer;

  const solutionSql = stripPlaceholders(String(expected.solutionSql ?? ''));
  const keyElements = Array.isArray(expected.keyElements)
    ? (expected.keyElements as string[]).map(stripPlaceholders).join(', ')
    : '';
  const gradingHint = stripPlaceholders(String(expected.gradingHint ?? ''));

  const pts = splitSqlPoints(params.maxPoints);

  return `Du bewertest eine SQL-Aufgabe.

AUFGABENSTELLUNG:
${questionText}

MAXIMALPUNKTE: ${params.maxPoints}

MUSTERLÖSUNG (SQL, vertraulich):
\`\`\`sql
${solutionSql || '-- nicht angegeben'}
\`\`\`

PFLICHT-BAUSTEINE: ${keyElements || '(keine spezifischen Bausteine vorgegeben)'}
BEWERTUNGSHINWEIS: ${gradingHint || 'Standard-SQL-Bewertung'}

ANTWORT DES PRÜFLINGS (SQL):
\`\`\`sql
${params.studentAnswer}
\`\`\`

BEWERTUNGSKRITERIEN (proportionale Teilpunkte je Kriterium):
1. Syntaktische Korrektheit (${pts.syntax}P) — gültiges SQL, keine fehlenden Keywords. Kleine Syntaxfehler, die das Statement noch ausführbar machen: Teilpunkte geben.
2. Korrekte Tabellen- und Spaltenbezüge (${pts.schema}P) — verwendet die richtigen Tabellen aus der Aufgabe, korrekte Spaltennamen. Typos, die offensichtlich den richtigen Bezug meinen: Teilpunkte geben.
3. Logische Korrektheit (${pts.logic}P) — richtige JOIN-Bedingungen, WHERE-Prädikate, GROUP BY/HAVING, korrekte Aggregatfunktionen, Subqueries wenn nötig.
4. Erwartete Ergebnismenge (${pts.result}P) — das Statement liefert die angeforderten Daten. Abweichende Sortierung oder zusätzliche Spalten: nicht abziehen, wenn nicht explizit gefordert.

AKZEPTIERE:
- Sinngemäß äquivalente Formulierungen (INNER JOIN vs. impliziter Join, Aliase, case-insensitive Keywords, Zeilenumbrüche).
- Verschiedene korrekte Lösungswege mit identischem Ergebnis.
- Kleine Abweichungen in Spaltennamen, wenn der Bezug eindeutig ist.
- Fehlende Semikolons oder Formatierungsunterschiede.

PUNKTE DEUTLICH ABZIEHEN BEI:
- Fehlende JOIN-Bedingung (führt zu kartesischem Produkt) — echter Fehler.
- Fehlende WHERE-Klausel bei UPDATE/DELETE (kritischer Fehler).
- Völlig falsche Logik, die nicht das geforderte Ergebnis liefert.
- Aggregatfunktion ohne GROUP BY bei gleichzeitiger Auswahl nicht-aggregierter Spalten.
- Fehlende Pflicht-Bausteine aus der Aufgabenstellung (jeder fehlende Baustein kostet anteilig Punkte).

improvementHints MÜSSEN konkret sein: zeige, wie das Statement richtig aussehen würde oder welche Klausel fehlte — nicht "achte auf WHERE", sondern z.B. "Ergänze WHERE abteilung_id = 3 damit nur IT-Mitarbeiter zurückkommen".

Gib AUSSCHLIESSLICH dieses JSON zurück:
{
  "awardedPoints": <integer 0–${params.maxPoints}>,
  "percentageScore": <integer 0–100>,
  "ihkGrade": <"sehr_gut"|"gut"|"befriedigend"|"ausreichend"|"mangelhaft"|"ungenuegend">,
  "feedbackText": "<2–4 konstruktive Sätze auf Deutsch>",
  "criterionScores": [
    { "criterion": "Syntax", "awarded": <n>, "max": ${pts.syntax}, "comment": "<1 Satz>" },
    { "criterion": "Tabellen/Spalten", "awarded": <n>, "max": ${pts.schema}, "comment": "<1 Satz>" },
    { "criterion": "Logik (JOINs/WHERE/GROUP BY)", "awarded": <n>, "max": ${pts.logic}, "comment": "<1 Satz>" },
    { "criterion": "Ergebnismenge", "awarded": <n>, "max": ${pts.result}, "comment": "<1 Satz>" }
  ],
  "keyMistakes": ["<Fehler 1>"],
  "improvementHints": ["<Tipp 1>"]
}`;
}
