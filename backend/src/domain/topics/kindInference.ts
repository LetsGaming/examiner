/**
 * domain/topics/kindInference.ts — Topic → TaskKind-Mapping.
 *
 * Klassifiziert Topics anhand von Regex-Patterns. Wird vom Pool-Refill
 * (routeHelpers.refillPoolInBackground) genutzt, um gezielt Aufgaben eines
 * bestimmten Kinds zu generieren, wenn der Pool unterrepräsentiert ist.
 *
 * Die Regeln folgen den topicKeywords der TaskRecipes in generator/recipes/.
 * Wenn mehrere Kinds auf ein Topic passen, gewinnt die erste zutreffende
 * Regel in dieser Reihenfolge: diagram > calc > sql > code > table > text.
 *
 * WICHTIG: Das Ergebnis ist eine Prognose, nicht garantiert — die tatsächliche
 * Klassifikation der generierten Aufgabe erfolgt später über
 * `classifyTaskFromSubtasks` (in services/taskKind.ts) anhand der echten
 * generierten Subtasks.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export type TopicKind = 'diagram' | 'calc' | 'sql' | 'code' | 'table' | 'text';

interface KindPattern {
  kind: TopicKind;
  pattern: RegExp;
}

/**
 * Patterns in Prioritätsreihenfolge. Erste Treffer-Regel gewinnt.
 * Case-insensitive über /i-Flag.
 */
const KIND_PATTERNS: ReadonlyArray<KindPattern> = [
  // Diagramme (UML, ER, Mockups, Skizzen)
  {
    kind: 'diagram',
    pattern:
      /aktivität|zustandsdiagramm|klassendiagramm|sequenzdiagramm|use-?case|uml|er[\s\-]?modell|er[\s\-]?diagramm|datenmodell|mockup|skizze|ui[\s\-]?design|darstellungsformen|formular[\s\-]?entwurf/i,
  },
  // Berechnungen
  {
    kind: 'calc',
    pattern: /netzplan|kritischer pfad|speicherbedarf|komplexität|o[\s\-]?notation|kosten|aufwand|kostenrechnung/i,
  },
  // SQL
  {
    kind: 'sql',
    pattern: /\bsql\b|join|select|group by|create table|ddl|subquery|aggregation|normalisierung|grant|revoke/i,
  },
  // Code
  {
    kind: 'code',
    pattern:
      /pseudocode|algorithmus|sortier|suchalgor|rekursion|datenstruktur|testfäll|testüberdeckung|generisch/i,
  },
  // Tabellen (Vergleich, Stakeholder, ACID, Testkonzept)
  {
    kind: 'table',
    pattern:
      /stakeholder|acid|teststufen|testkonzept|vergleich|vorgehensmodelle|scrum.*wasserfall|wasserfall.*agil|datentyp/i,
  },
];

/** Inferiert den erwarteten Kind für ein Topic. Default: 'text'. */
export function inferKindForTopic(topic: string): TopicKind {
  for (const { kind, pattern } of KIND_PATTERNS) {
    if (pattern.test(topic)) return kind;
  }
  return 'text';
}
