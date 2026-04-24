/**
 * prompts.ts — Prompt-Bausteine für die Aufgabengenerierung.
 *
 * Extrahiert aus examGenerator.ts `buildSystemPrompt` + `buildTopicContextHint`.
 * Trennung Domain ↔ Code: Die Regeln, was eine gute AP2-Aufgabe enthalten muss,
 * stammen aus MD §5 (Aufgabenanalyse) + §6 (Linguistik). Dieses Modul macht
 * daraus reine String-Funktionen ohne IO-Abhängigkeiten.
 *
 * MD-Belege:
 *  - §5.1 W22/23 T1c  : CI/CD-Pipeline — SQL-Aufgaben brauchen Tabellen mit Daten
 *  - §5.2 W21/22 T4    : "CREATE TABLE Hersteller; Rezeptpflicht prüfen" — DDL+DML-Mix
 *  - §5.2 S2023 A2     : countVisitors(entry: ComeLeave) — Klassenkopf + Funktionssig
 *  - §5.1 S25 T1 A3    : Aktivitätsdiagramm mit Bullet-Prozess + Swimlanes
 *  - §5.1 S25 T1 A2    : ER-Diagramm vervollständigen mit Bullet-Anforderungen
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { DiagramType } from '../types/index.js';

export interface TaskTypeFlags {
  hasSql: boolean;
  hasPseudo: boolean;
  hasSequenz: boolean;
  hasAkt: boolean;
  hasEr: boolean;
}

export function taskTypeFlags(
  subtasks: { taskType: string; diagramType?: DiagramType }[],
): TaskTypeFlags {
  return {
    hasSql: subtasks.some((s) => s.taskType === 'sql'),
    hasPseudo: subtasks.some((s) => s.taskType === 'pseudocode'),
    hasSequenz: subtasks.some(
      (s) => s.taskType === 'plantuml' && s.diagramType === 'uml_sequence',
    ),
    hasAkt: subtasks.some(
      (s) => s.taskType === 'plantuml' && s.diagramType === 'uml_activity',
    ),
    hasEr: subtasks.some((s) => s.taskType === 'plantuml' && s.diagramType === 'er'),
  };
}

// ─── Type-spezifische Regeln ─────────────────────────────────────────────────
// Jede Funktion liefert GENAU EINEN Regelblock. Aufrufer schaltet per Flag zu.

export const TYPE_RULE_SQL =
  'SQL: questionText MUSS vollständige Tabellen + mind. 5 Beispieldatenzeilen enthalten (Format: "Spalte1 | Spalte2 | ...\\nWert1 | Wert2"). Bei GROUP BY/Subquery: Ergebnisbeispiel zeigen. DML-Varianten erlaubt: INSERT, GRANT/REVOKE, UPDATE+ALTER. solutionSql: exakte Musterlösung mit echten Tabellen-/Spaltennamen. keyElements: Pflichtbausteine.';

// MD §6.3 "Pseudocode-Zuweisung: Doppelpunkt-Gleich (:=)". MD §5.2-Beispiele
// nutzen IHK-Schlüsselwörter (solange/ende solange, für/ende für, wenn/sonst/ende wenn, return).
// Klassen PascalCase, Methoden camelCase.
// Asymmetrie beachten: Generator produziert STRIKT in IHK-Syntax; der Freitext-Grader
// akzeptiert syntaktische Varianten (gradingSystem.ts Regel 7). Prüflings-Antwort in
// Python/while-Schleifen ist ok, solange die Logik passt.
export const TYPE_RULE_PSEUDOCODE =
  'PSEUDOCODE: questionText MUSS enthalten: (1) Klassen mit Attributen + get-Methoden im Format "Klasse\\n- attr : Typ\\n+ getAttr(): Typ", (2) konkreten Funktionskopf "name(param: Typ, ...): Rückgabe", (3) optional Beispiel-Array 2–3 Objekte, (4) Hinweise zu besonderen Operationen. keyPoints: vollständige Pseudocode-Musterlösung. IHK-SYNTAX (verbindlich): Zuweisung mit ":=" (nicht "="), Schlüsselwörter solange/ende solange, für/ende für, wenn/sonst/ende wenn, return. Klassen PascalCase, Methoden camelCase.';

export const TYPE_RULE_SEQUENCE =
  'SEQUENZDIAGRAMM: questionText MUSS enthalten: (1) 3–4 Klassen mit Methodensignaturen, (2) schrittweise Vorgangsbeschreibung als Bullets mit Verzweigungen ("— Wenn X leer → Y"). expectedElements: Lebenslinien + Nachrichten + opt/loop-Blöcke.';

export const TYPE_RULE_ACTIVITY =
  'AKTIVITÄTSDIAGRAMM: questionText MUSS enthalten: Prozess als Bullet-Liste (7–10 Schritte, mind. 1 Verzweigung, mind. 1 Parallelität/Synchronisierung) + beteiligte Rollen für Swimlanes. expectedElements: Aktivitäten + Entscheidungsknoten + Synchronisierungsbalken.';

export const TYPE_RULE_ER =
  'ER-DIAGRAMM: questionText MUSS enthalten: Anforderungen als Bullet-Liste (7–10 Punkte, mind. 1 m:n-Beziehung mit Beziehungsattributen). Optional: "Entität X ist bereits gegeben, vervollständigen Sie das Modell." expectedElements: Entitäten + Beziehungen mit Kardinalitäten.';

// ─── WiSo-Modus ──────────────────────────────────────────────────────────────
// MD §5.3 + §6.5: WiSo hat fundamental anderes Format — 5-Options-MC mit
// Ziffern, keine Freitext-Begründungen.

export const WISO_MODE_RULES = `WISO-MODUS (Teil 3 — Wirtschafts- und Sozialkunde):
MC Single-Choice: GENAU 5 Optionen mit IDs "1"–"5" (NICHT A–D). Formulierung: "Welche Aussage ist zutreffend?"
MC Multi-Choice: GENAU 5 Optionen, IDs "1"–"5", IMMER genau 2 korrekt. Formulierung: "Welche ZWEI Aussagen sind zutreffend?" correctOptions = 2 Strings.
Freitext: NUR Berechnungen (Lohn/SV/Urlaub — konkrete Zahlen + Rechenweg) ODER "Nennen Sie X" (Stichworte, keine Sätze).
NIEMALS: "Begründen Sie Ihre Auswahl", "Erläutern Sie Ihren Ansatz", offene Vergleiche, UML, SQL.
Themen: BBiG, KSchG, JArbSchG, ArbZG, BUrlG, Sozialversicherung, Tarifvertrag, Gesellschaftsformen (GmbH/AG/GbR), AGG, Prokura, EK-Rentabilität.`;

/**
 * Baut die Type-Rules-Sektion für das System-Prompt.
 * Aufrufer setzt `isWiso` wenn das Rezept aus RECIPES_TEIL3 stammt.
 */
export function buildTypeRulesBlock(flags: TaskTypeFlags, isWiso: boolean): string {
  const rules: string[] = [];
  if (isWiso) rules.push(WISO_MODE_RULES);
  if (flags.hasSql) rules.push(TYPE_RULE_SQL);
  if (flags.hasPseudo) rules.push(TYPE_RULE_PSEUDOCODE);
  if (flags.hasSequenz) rules.push(TYPE_RULE_SEQUENCE);
  if (flags.hasAkt) rules.push(TYPE_RULE_ACTIVITY);
  if (flags.hasEr) rules.push(TYPE_RULE_ER);
  return rules.length > 0 ? `\n${rules.join('\n\n')}\n` : '';
}

// ─── Aufgabenkontext-Blöcke ──────────────────────────────────────────────────
// MD §5.1 durchgehend: situativer Einstieg → Kontextmaterial → Arbeitsauftrag.

export const TEIL12_CONTEXT_BLOCK = `AUFGABENTEXT-STRUKTUR (Pflicht):
1. Situativer Einstieg: "{{UNTERNEHMEN}} möchte X entwickeln. Sie arbeiten in diesem Projekt mit."
2. Kontextmaterial (Klassen, Tabellen, Bullets, Code) — je nach Aufgabentyp
3. Arbeitsauftrag mit IHK-Operator, z.B. "Nennen Sie...", "Erläutern Sie...", "Erstellen Sie..."
Nie abstrakt "Erkläre allgemein X" — immer projektbezogen auf {{UNTERNEHMEN}}/{{PRODUKT}}.

PLATZHALTER: {{UNTERNEHMEN}} {{BRANCHE}} {{PRODUKT}} {{MITARBEITER}} nur im questionText setzen.
WICHTIG: Platzhalter NIEMALS selbst ersetzen — sie werden nach der Generierung per Code durch das echte Szenario ersetzt.
In expectedAnswer/explanation/solutionSql: keine Platzhalter — szenario-neutrale Musterlösung.`;

export const WISO_CONTEXT_BLOCK = `AUFGABENKONTEXT: Ausbildungsbetrieb oder Unternehmen aus dem Bereich Fachinformatik/IT.
Verwende "Sachs-IT GmbH" oder ähnliche realistische Namen als Unternehmensrahmen (KEINE Platzhalter in WiSo).
Aufgaben beziehen sich auf konkrete Mitarbeiter, Azubis oder Verträge in diesem Unternehmen.`;

// ─── Generische MC-Schema-Regeln ─────────────────────────────────────────────
// NUR für Teil 1/2 (für WiSo siehe WISO_MODE_RULES).

export const TEIL12_MC_RULES = `MC: 4 Optionen A–D, correctOption variiert (nicht immer A), explanation 1–2 Sätze.
MC-Multi: correctOptions=[2–3 Buchstaben], nie 0 oder 4 korrekte.
Tabellen: columns themenspezifisch, exampleRow vollständig, keyPoints 2–4 Stichpunkte.
Plantuml/ER: expectedElements mind. 4 konkrete Elemente mit Namen.`;

// ─── Topic-spezifische Kontext-Hints ─────────────────────────────────────────
// MD §5.1/§5.2 Aufgaben-Analyse: bestimmte Themen haben wiederkehrende
// Kontextstrukturen, die der Generator explizit fordern sollte.

interface TopicHintRule {
  match: (topicLower: string) => boolean;
  hint: string;
}

const TOPIC_HINTS: TopicHintRule[] = [
  // SQL-spezifisch (MD §5.2 durchgehend)
  {
    match: (t) => t.includes('stakeholder'),
    hint: 'Stakeholder: mind. 1 intern + 1 extern, Erwartungen/Befürchtungen projektbezogen.',
  },
  {
    match: (t) => t.includes('testkonzept') || t.includes('teststufen'),
    hint: 'Test: alle 4 Teststufen mit projektkonkretem Beispiel belegen.',
  },
  {
    match: (t) =>
      t.includes('verschlüsselung') || t.includes('tls') || t.includes('zertifikat'),
    hint: 'Sicherheit: konkreten Fall rahmen (Passwort-Hashing ODER TLS-Absicherung).',
  },
  {
    match: (t) => t.includes('mockup') || (t.includes('ui') && !t.includes('guid')),
    hint: 'Mockup: Überschrift + Eingabefelder + Dropdown + Speichern/Abbrechen-Buttons.',
  },
  {
    match: (t) => t.includes('factory') || t.includes('entwurfsmuster'),
    hint: 'OOP: englischen Muster-Beschreibungstext + teilweises Klassendiagramm vorgeben, das ergänzt werden soll.',
  },
  {
    match: (t) => t.includes('acid') || t.includes('transaktion'),
    hint: 'ACID: konkreten DB-Anwendungsfall als Rahmen (z.B. Banküberweisung); Isolation: Anomalien nennen.',
  },
  {
    match: (t) => t.includes('nosql') || t.includes('json') || t.includes('dokumenten'),
    hint: 'NoSQL/JSON: relationale Ausgangstabellen mit FK + Daten vorgeben, die in JSON überführt werden sollen.',
  },
  {
    match: (t) => t.includes('netzplan') || t.includes('kritischer pfad'),
    hint: 'Netzplan: 5–7 Vorgänge mit Dauern + Vorgängern, mind. 1 paralleler Pfad.',
  },
  {
    match: (t) => t.includes('speicher') || t.includes('datenmenge'),
    hint: 'Speicher: messbaren Anwendungsfall vorgeben (Auflösung, Bit-Tiefe, Anzahl, Zeitraum).',
  },
];

/** SQL-Hints abhängig von der Topic-Formulierung (nur wenn SQL-Subtask im Rezept). */
function sqlTopicHint(topicLower: string): string {
  if (topicLower.includes('join') || topicLower.includes('select'))
    return 'SQL: 2–3 Tabellen mit 5–7 Datenzeilen, SELECT+JOIN mit WHERE/ORDER.';
  if (topicLower.includes('group') || topicLower.includes('aggregat'))
    return 'SQL: 2 Tabellen mit 7–10 Zeilen, GROUP BY+HAVING, Ergebnisbeispiel zeigen.';
  if (topicLower.includes('ddl') || topicLower.includes('create'))
    return 'SQL: Anforderung als 3–4 Bullets → CREATE TABLE mit 5–7 Attributen + PK + FK.';
  return 'SQL: 2 Tabellen mit 5–7 Zeilen, DML-Mix: INSERT + GRANT/REVOKE + UPDATE/ALTER.';
}

function diagramTopicHint(diagType: DiagramType | undefined): string | null {
  if (diagType === 'uml_sequence')
    return 'Sequenz: 3–4 Klassen mit Methoden-Signaturen + Bullet-Ablauf mit Verzweigungen/Schleifen.';
  if (diagType === 'uml_activity')
    return 'Aktivität: Prozess als Bullet-Liste 7–10 Schritte, mind. 1 Verzweigung + 1 Parallelität, Swimlanes benennen.';
  if (diagType === 'er')
    return 'ER: Anforderungen als Bullet-Liste 7–10 Punkte, mind. 1 m:n mit Beziehungsattributen; optional eine Entität vorgeben.';
  return null;
}

/**
 * Liefert topic-spezifische Kontext-Hinweise für das User-Prompt.
 * Aufrufer übergibt das Topic + Rezept-Flags.
 */
export function buildTopicContextHint(
  topic: string,
  flags: TaskTypeFlags,
  primaryDiagramType: DiagramType | undefined,
): string {
  const topicLower = topic.toLowerCase();
  const hints: string[] = [];

  if (flags.hasSql) hints.push(sqlTopicHint(topicLower));
  if (flags.hasPseudo)
    hints.push(
      'Pseudocode: Klasse(n) mit Attributen + get-Methoden + fertigen Funktionskopf vorgeben; optional Beispiel-Array 2–3 Objekte.',
    );
  const dh = diagramTopicHint(primaryDiagramType);
  if (dh) hints.push(dh);

  for (const rule of TOPIC_HINTS) {
    if (rule.match(topicLower)) hints.push(rule.hint);
  }

  return hints.length > 0 ? `\nHinweise: ${hints.join(' | ')}\n` : '\n';
}
