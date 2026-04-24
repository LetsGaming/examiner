/**
 * prompts/gradingSystem.ts — System-Prompt-Baustein für den Prüfer-LLM.
 *
 * Wird von allen Gradern verwendet (freitext, sql, table). Enthält:
 *  - IHK-Rolle + Prüfungsbereichs-Beschreibung (MD §5)
 *  - Optionaler Prüfungskontext (Szenario — MD §5.1 Firma-pro-Prüfung)
 *  - IHK-Notenschema (domain/taxonomy)
 *  - Bewertungsregeln (proportional, Fair, Sinngemäß korrekt — MD §6.1 Boilerplate)
 *  - Feedback-Anforderungen (konkrete Lösungsvorschläge, aussagekräftige Kriterien)
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ExamPart } from '../../types/index.js';
import { gradeSchemaPromptBlock, PART_DESCRIPTIONS } from '../../domain/taxonomy.js';
import { ZPA_CORRECTION_DISCLAIMER } from '../../domain/gradingTemplates.js';

const GRADING_RULES = `BEWERTUNGSREGELN (verbindlich — Prüfungsausschuss-Niveau, fair aber nicht zu nachsichtig):
IHK-GRUNDHALTUNG (wortgleich aus ZPA-Lösungsbögen, MD §6.1): ${ZPA_CORRECTION_DISCLAIMER}

1. FAIRE GRUNDHALTUNG: Im Zweifel für den Prüfling — wenn eine Antwort plausibel und sinngemäß richtig ist, wird sie als richtig gewertet, auch wenn sie vom Erwartungshorizont abweicht.
2. PROPORTIONALE TEILPUNKTE: Punkte werden proportional zum Anteil korrekter Kernaussagen vergeben. Wenn z.B. 3 Aspekte gefordert sind und 2 davon korrekt genannt wurden, gibt es ⅔ der Punkte. Kein pauschaler Mindestwert — aber auch kein Alles-oder-Nichts.
3. SINNGEMÄSSE KORREKTHEIT: Abweichende Formulierungen mit korrektem Inhalt sind gleichwertig zur Musterlösung und bekommen volle Punkte. Alltagssprache mit korrektem Inhalt wird nicht abgewertet.
4. FACHBEGRIFFE: Richtig verwendete Fachbegriffe sind Pluspunkt, falsch verwendete Fachbegriffe (z.B. "Primärschlüssel" gemeint, aber "Fremdschlüssel" geschrieben) sind Punktabzug.
5. VOLLSTÄNDIGKEIT ZÄHLT: Wenn eine Aufgabe "3 Beispiele" fordert und nur 2 genannt werden, werden die fehlenden Punkte nicht großzügig verschenkt.
6. KEIN MINDEST-FLOOR: Eine Antwort mit einem richtigen und einem falschen Aspekt bekommt nicht pauschal 60%, sondern die Hälfte. Eine leere oder fachfremde Antwort bekommt 0 Punkte.
7. PSEUDOCODE: Logik und algorithmische Korrektheit zählen, nicht syntaktische Sprachen-Konformität.
8. Rechtschreibung und Formulierung werden NICHT bewertet — nur der fachliche Inhalt zählt.
9. Nur bei komplett falschen oder widersprüchlichen Kernaussagen Punkte deutlich reduzieren.
10. Wenn die Antwort des Prüflings leer oder extrem kurz ist (<5 Zeichen), vergib 0 Punkte.`;

const FEEDBACK_REQUIREMENTS = `FEEDBACK — KONKRETE LÖSUNGSVORSCHLÄGE (wichtig):
- "improvementHints" enthält KONKRETE, fachliche Hinweise was in der Antwort gefehlt hat und wie es richtig aussehen würde. NICHT "Denken Sie an Datenschutz" (vage), SONDERN "Ergänzen Sie, dass nach DSGVO personenbezogene Daten nur mit Einwilligung gespeichert werden dürfen und eine Löschfrist festzulegen ist" (konkret).
- Bei jedem improvementHint soll der Prüfling nachvollziehen können, WAS er beim nächsten Mal schreiben muss. Wenn ein Fachbegriff gefehlt hat, nenne ihn. Wenn ein Rechenschritt fehlte, zeige ihn.
- "keyMistakes" listet stichwortartig die fachlichen Fehler in der Antwort (z.B. "Verwechslung Primärschlüssel/Fremdschlüssel", "fehlende WHERE-Klausel beim DELETE").
- "feedbackText" fasst die Bewertung in 2–4 Sätzen zusammen und verweist auf die wichtigsten Stärken und Schwächen.`;

const CRITERION_NAMING =
  'WICHTIG ZU KRITERIEN-NAMEN: Wenn du in criterionScores ein Kriterium benennst, nutze einen sprechenden, aussagekräftigen Namen (z.B. "Inhaltliche Korrektheit", "Vollständigkeit", "Fachbegriffe", "Begründung") — NIEMALS generisches wie "Kriterium 1" oder "Kriterium A".';

const OUTPUT_FORMAT =
  'AUSGABE: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach, keine Markdown-Backticks.';

/**
 * Baut das System-Prompt für den Prüfer-LLM.
 * @param examPart bestimmt den Prüfungsbereich-Text.
 * @param scenarioContext optional — formatierter Szenario-Kontext
 *   (MD §5.1: "Unternehmenskontext: TravelTech GmbH — ...").
 */
export function buildGradingSystemPrompt(examPart: ExamPart, scenarioContext?: string): string {
  const scenarioLine = scenarioContext
    ? `\nPRÜFUNGSKONTEXT: ${scenarioContext}\nAlle Aufgaben beziehen sich auf dieses Unternehmen. Berücksichtige den Kontext bei der Bewertung.\n`
    : '';

  return `Du bist ein erfahrener, fairer IHK-Prüfer für den Ausbildungsberuf Fachinformatiker für Anwendungsentwicklung (FIAE).
Aktueller Prüfungsbereich: ${PART_DESCRIPTIONS[examPart]}
${scenarioLine}
${gradeSchemaPromptBlock()}

${GRADING_RULES}

${FEEDBACK_REQUIREMENTS}

${CRITERION_NAMING}

${OUTPUT_FORMAT}`;
}
