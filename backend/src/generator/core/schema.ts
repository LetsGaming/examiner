/**
 * core/schema.ts — JSON-Schema-Fragmente, die dem LLM in jedem Generator-Prompt
 * als erwartete Ausgabeform dienen.
 *
 * Ein einzelnes Fragment beschreibt, wie eine Subtask im Response-JSON aussehen
 * muss. Der Builder variiert das Format abhängig vom Taskype und vom MC-Kontext
 * (WiSo: Ziffern 1–5, Teil 1/2: Buchstaben A–D — MD §5.3).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { mcOptionIds, type McContext } from '../../domain/taxonomy.js';
import type { SubtaskSpec, TableKind } from '../types.js';

// ─── MC-Options-Fragmente ────────────────────────────────────────────────────

/**
 * Baut das `mcOptions`-Array-Fragment für das JSON-Schema.
 * MD §5.3: WiSo = 5 Ziffern (1–5), Teil 1/2 = 4 Buchstaben (A–D).
 */
function buildMcOptionsFragment(context: McContext, kind: 'mc' | 'mc_multi'): string {
  const ids = mcOptionIds(context);
  const textPrefix = kind === 'mc' ? 'Antwort' : 'Aussage';
  return ids.map((id) => `{"id":"${id}","text":"${textPrefix} ${id}"}`).join(',');
}

/**
 * Liefert zwei Fallback-IDs für das mc_multi-Schema-Beispiel.
 * MD §5.3 verlangt für WiSo IMMER genau 2 korrekte Optionen — entsprechend
 * enthält das Schema-Beispiel immer exakt 2 IDs.
 */
function buildMcMultiExampleCorrect(context: McContext): string {
  const ids = mcOptionIds(context);
  return `["${ids[0]}","${ids[2]}"]`;
}

// ─── Subtask-Schema pro Typ ──────────────────────────────────────────────────

export function buildSubtaskSchema(
  spec: SubtaskSpec,
  label: string,
  points: number,
  mcContext: McContext,
): string {
  switch (spec.taskType) {
    case 'mc':
      return mcSchema(label, points, mcContext);
    case 'mc_multi':
      return mcMultiSchema(label, points, mcContext);
    case 'sql':
      return sqlSchema(label, points, spec.gradingHint);
    case 'table':
      return tableSchema(label, points, spec);
    case 'plantuml':
      return plantumlSchema(label, points, spec.diagramType);
    case 'pseudocode':
      return pseudocodeSchema(label, points);
    case 'diagram_upload':
      return diagramUploadSchema(label, points, spec.diagramType);
    case 'freitext':
    default:
      return freitextSchema(label, points);
  }
}

function mcSchema(label: string, points: number, mcContext: McContext): string {
  return `{"label":"${label}","taskType":"mc","questionText":"FRAGE?","points":${points},"mcOptions":[${buildMcOptionsFragment(mcContext, 'mc')}],"expectedAnswer":{"correctOption":"X","explanation":"Begründung"}}`;
}

function mcMultiSchema(label: string, points: number, mcContext: McContext): string {
  return `{"label":"${label}","taskType":"mc_multi","questionText":"FRAGE?","points":${points},"mcOptions":[${buildMcOptionsFragment(mcContext, 'mc_multi')}],"expectedAnswer":{"correctOptions":${buildMcMultiExampleCorrect(mcContext)},"explanation":"Begründung"}}`;
}

function sqlSchema(label: string, points: number, gradingHint?: string): string {
  const escapedHint = (gradingHint ?? '').replace(/"/g, "'");
  return `{"label":"${label}","taskType":"sql","questionText":"FRAGE mit Tabellenstruktur(en) im Text","points":${points},"expectedAnswer":{"solutionSql":"SELECT ...;","keyElements":["SELECT","JOIN"],"gradingHint":"${escapedHint}"}}`;
}

function tableSchema(label: string, points: number, spec: SubtaskSpec): string {
  const ffc =
    spec.fixedFirstColumn && spec.fixedFirstColumnValues
      ? `,"firstColumnValues":${JSON.stringify(spec.fixedFirstColumnValues)}`
      : '';
  return `{"label":"${label}","taskType":"table","questionText":"FRAGE","points":${points},"tableConfigProposed":{"columns":["Spalte1","Spalte2","Spalte3"],"exampleRow":["Beispiel 1","Beispiel 2","Beispiel 3"]${ffc}},"expectedAnswer":{"keyPoints":["Musterinhalt 1","Musterinhalt 2"]}}`;
}

function plantumlSchema(label: string, points: number, diagramType?: string): string {
  const dt = diagramType ?? 'uml_activity';
  return `{"label":"${label}","taskType":"plantuml","questionText":"FRAGE","points":${points},"diagramType":"${dt}","expectedElements":["Element1","Element2","Element3"],"expectedAnswer":{"keyPoints":[]}}`;
}

function pseudocodeSchema(label: string, points: number): string {
  return `{"label":"${label}","taskType":"pseudocode","questionText":"FRAGE","points":${points},"expectedAnswer":{"keyPoints":["Schritt 1","Schritt 2"]}}`;
}

function diagramUploadSchema(label: string, points: number, diagramType?: string): string {
  const dt = diagramType ?? 'uml_activity';
  return `{"label":"${label}","taskType":"diagram_upload","questionText":"FRAGE","points":${points},"diagramType":"${dt}","expectedElements":["Element1"],"expectedAnswer":{"keyPoints":[]}}`;
}

function freitextSchema(label: string, points: number): string {
  return `{"label":"${label}","taskType":"freitext","questionText":"FRAGE","points":${points},"expectedAnswer":{"keyPoints":["Punkt 1","Punkt 2"]}}`;
}

// ─── Table-Schema-Hint für den User-Prompt-Anhang ────────────────────────────

/**
 * Liefert einen zusätzlichen Hint-Block für Tabellen-Subtasks, den der User-Prompt
 * an die Subtask-Anweisungen anhängt. Unterscheidet zwischen 'fixed' (erste Spalte
 * bindend vorgegeben), 'guided' (Spalten als Vorschlag) und 'flexible' (abstrakte
 * Spaltenplatzhalter werden vom LLM mit konkreten Bezeichnern ersetzt).
 */
export function buildTableSchemaHint(spec: SubtaskSpec): string {
  const cols = spec.tableColumns ?? [];
  const rowCount = spec.tableRowCount ?? 3;
  const kind: TableKind = spec.tableKind ?? 'guided';
  const descr = spec.tableDescription ? `  Semantik: ${spec.tableDescription}\n` : '';

  if (kind === 'fixed') return fixedTableHint(cols, rowCount, spec.fixedFirstColumnValues, descr);
  if (kind === 'guided') return guidedTableHint(cols, rowCount, descr);
  return flexibleTableHint(cols, rowCount, descr);
}

function fixedTableHint(
  cols: string[],
  rowCount: number,
  firstColumnValues: string[] | undefined,
  descr: string,
): string {
  const fixedVals = firstColumnValues
    ? `  "firstColumnValues": ${JSON.stringify(firstColumnValues)} (BINDEND, genau so übernehmen)\n`
    : '';
  return `  Tabellenspalten (BINDEND): ${JSON.stringify(cols)}
  Zeilenzahl: ${rowCount}
${fixedVals}${descr}  "exampleRow": liefere EINE vollständig ausgefüllte Beispielzeile (${cols.length} Einträge, konkret auf das Szenario bezogen).`;
}

function guidedTableHint(cols: string[], rowCount: number, descr: string): string {
  return `  Spalten-Vorschlag: ${JSON.stringify(cols)} — darf an das konkrete Thema angepasst werden, Anzahl (${cols.length}) bleibt.
  Zeilenzahl: ${rowCount}
${descr}  "exampleRow": ${cols.length} Einträge, konkret auf das Szenario bezogen.`;
}

function flexibleTableHint(cols: string[], rowCount: number, descr: string): string {
  return `  Spalten-Richtung: ${JSON.stringify(cols)} — ERSETZE abstrakte Platzhalter durch konkrete themenspezifische Bezeichnungen. Anzahl (${cols.length}) bleibt.
  Zeilenzahl: ${rowCount}
${descr}  "exampleRow": ${cols.length} Einträge, konkret.`;
}
