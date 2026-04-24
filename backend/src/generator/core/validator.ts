/**
 * core/validator.ts — Nachvalidierung der LLM-generierten Subtasks.
 *
 * Stellt sicher, dass:
 *  - Tabellen die vom Rezept vorgegebene Spalten-/Zeilenstruktur haben
 *  - MC-Options dem Kontext entsprechen (WiSo: Ziffern 1–5 gemäß MD §5.3;
 *    Teil 1/2: Buchstaben A–D)
 *  - correctOption / correctOptions im gültigen ID-Set liegen
 *  - SQL-Antworten Pflichtfelder haben
 *  - Unaufgelöste {{PLACEHOLDER}}-Tokens aus expectedAnswer-Explanations entfernt werden
 *
 * Validierungen sind nicht-destruktiv: fehlerhafte Werte werden auf sichere
 * Defaults zurückgesetzt, nicht gelöscht. Warnungen landen in `console.warn`
 * damit Pool-Befüllungs-Probleme sichtbar bleiben (siehe insertTasksIntoDB).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { mcOptionIds, PLACEHOLDER_TOKEN_REGEX, type McContext } from '../../domain/taxonomy.js';
import type { GeneratedSubTask, SubtaskSpec } from '../types.js';

// ─── Entry-Point: validiert einen Subtask anhand seines Rezept-Specs ────────

export function validateSubtask(
  st: GeneratedSubTask,
  spec: SubtaskSpec,
  topic: string,
  mcContext: McContext,
): void {
  switch (spec.taskType) {
    case 'table':
      validateTableSubtask(st, spec);
      break;
    case 'plantuml':
    case 'diagram_upload':
      st.diagramType = spec.diagramType ?? st.diagramType ?? 'uml_activity';
      break;
    case 'mc':
      validateMcSubtask(st, topic, mcContext);
      break;
    case 'mc_multi':
      validateMcMultiSubtask(st, topic, mcContext);
      break;
    case 'sql':
      validateSqlSubtask(st);
      break;
    default:
      // freitext, pseudocode: keine spezifische Validierung nötig
      break;
  }

  stripPlaceholdersFromExplanation(st);
}

function stripPlaceholdersFromExplanation(st: GeneratedSubTask): void {
  const explanation = st.expectedAnswer?.explanation;
  if (typeof explanation === 'string') {
    st.expectedAnswer.explanation = explanation.replace(PLACEHOLDER_TOKEN_REGEX, '');
  }
}

// ─── Table-Validator ─────────────────────────────────────────────────────────

interface ProposedTable {
  columns?: unknown;
  exampleRow?: unknown;
  firstColumnValues?: unknown;
}

function validateTableSubtask(st: GeneratedSubTask, spec: SubtaskSpec): void {
  const rowCount = spec.tableRowCount ?? 3;
  const proposed = (st as unknown as Record<string, unknown>).tableConfigProposed as
    | ProposedTable
    | undefined;

  const columns = resolveColumns(spec, proposed);
  const exampleRow = resolveExampleRow(proposed, columns.length);
  const firstColumnValues = resolveFirstColumnValues(spec, proposed, rowCount);

  const rows = buildTableRows(rowCount, columns, spec.fixedFirstColumn, firstColumnValues);

  st.tableConfig = {
    columns,
    rows,
    rowCount,
    fixedFirstColumn: spec.fixedFirstColumn ?? false,
    fixedFirstColumnValues: firstColumnValues,
    exampleRow,
  };

  if (!st.expectedAnswer) st.expectedAnswer = {};
  st.expectedAnswer.columns = columns;
  if (exampleRow) st.expectedAnswer.exampleRow = exampleRow;
  if (!st.expectedAnswer.gradingHint && spec.gradingHint) {
    st.expectedAnswer.gradingHint = spec.gradingHint;
  }

  delete (st as unknown as Record<string, unknown>).tableConfigProposed;
}

function resolveColumns(spec: SubtaskSpec, proposed: ProposedTable | undefined): string[] {
  const specCols = (spec.tableColumns ?? []).slice();
  const kind = spec.tableKind ?? 'guided';
  if (kind === 'fixed' || !proposed) return specCols;

  const proposedCols = proposed.columns;
  const valid =
    Array.isArray(proposedCols) &&
    proposedCols.length === specCols.length &&
    proposedCols.every((c) => typeof c === 'string' && c.trim().length > 0);
  return valid ? (proposedCols as string[]).map((c) => c.trim()) : specCols;
}

function resolveExampleRow(
  proposed: ProposedTable | undefined,
  expectedLength: number,
): string[] | undefined {
  if (!proposed) return undefined;
  const proposedExample = proposed.exampleRow;
  const valid =
    Array.isArray(proposedExample) &&
    proposedExample.length === expectedLength &&
    proposedExample.every((c) => typeof c === 'string' && c.trim().length > 0);
  return valid ? (proposedExample as string[]).map((c) => c.trim()) : undefined;
}

function resolveFirstColumnValues(
  spec: SubtaskSpec,
  proposed: ProposedTable | undefined,
  rowCount: number,
): string[] | undefined {
  const fromSpec = spec.fixedFirstColumnValues?.slice();
  const kind = spec.tableKind ?? 'guided';
  if (kind === 'fixed' || !spec.fixedFirstColumn || !proposed) return fromSpec;

  const proposedFirst = proposed.firstColumnValues;
  const valid =
    Array.isArray(proposedFirst) &&
    proposedFirst.length === rowCount &&
    proposedFirst.every((v) => typeof v === 'string' && v.trim().length > 0);
  return valid ? (proposedFirst as string[]).map((v) => v.trim()) : fromSpec;
}

function buildTableRows(
  rowCount: number,
  columns: string[],
  fixedFirstColumn: boolean | undefined,
  firstColumnValues: string[] | undefined,
): string[][] {
  return Array.from({ length: rowCount }, (_unused, ri) =>
    columns.map((_c, ci) => {
      if (ci === 0 && fixedFirstColumn && firstColumnValues && firstColumnValues[ri]) {
        return firstColumnValues[ri];
      }
      return '';
    }),
  );
}

// ─── MC-Validator (kontextabhängig, MD §5.3) ─────────────────────────────────

function normalizeMcId(raw: string, context: McContext): string {
  return context === 'wiso' ? raw.trim() : raw.toUpperCase().trim();
}

function ensureMcOptions(
  st: GeneratedSubTask,
  context: McContext,
  textPrefix: string,
  topic: string,
  kind: 'single' | 'multi',
): void {
  const expectedIds = mcOptionIds(context);
  if (!st.mcOptions || st.mcOptions.length < expectedIds.length) {
    st.mcOptions = expectedIds.map((id, i) => ({
      id,
      text: st.mcOptions?.[i]?.text ?? `${textPrefix} ${id}`,
    }));
    return;
  }

  // WiSo: wenn LLM A-D statt 1-5 geliefert hat → remappen (MD §5.3 strikt)
  if (context === 'wiso') {
    const hasWrongIds = st.mcOptions.some((o) => !expectedIds.includes(o.id));
    if (hasWrongIds) {
      console.warn(
        `[generator] WiSo-MC${kind === 'multi' ? '-Multi' : ''} für "${topic}": LLM lieferte falsche IDs — remappe auf 1–5`,
      );
      st.mcOptions = expectedIds.map((id, i) => ({
        id,
        text: st.mcOptions?.[i]?.text ?? `${textPrefix} ${id}`,
      }));
    }
  }
}

function validateMcSubtask(st: GeneratedSubTask, topic: string, context: McContext): void {
  ensureMcOptions(st, context, 'Antwort', topic, 'single');

  const validIds = new Set(st.mcOptions!.map((o) => normalizeMcId(o.id, context)));
  const raw = normalizeMcId(String(st.expectedAnswer?.correctOption ?? ''), context);

  if (!validIds.has(raw)) {
    const fallback = mcOptionIds(context)[0];
    console.warn(
      `[generator] correctOption "${raw}" ungültig für "${topic}" — Fallback "${fallback}"`,
    );
    st.expectedAnswer = { ...st.expectedAnswer, correctOption: fallback };
  } else {
    st.expectedAnswer = { ...st.expectedAnswer, correctOption: raw };
  }
}

function validateMcMultiSubtask(st: GeneratedSubTask, topic: string, context: McContext): void {
  ensureMcOptions(st, context, 'Aussage', topic, 'multi');

  const validIds = new Set(st.mcOptions!.map((o) => normalizeMcId(o.id, context)));
  const rawList = Array.isArray(st.expectedAnswer?.correctOptions)
    ? (st.expectedAnswer.correctOptions as unknown[])
    : [];

  const normalized = rawList
    .map((v) => normalizeMcId(String(v), context))
    .filter((v) => validIds.has(v));
  const unique = Array.from(new Set(normalized));

  // MD §5.3: WiSo-Multi IMMER genau 2 korrekt. Teil 1/2: 2–3 (also bis total-1).
  const minCorrect = 2;
  const maxCorrect = context === 'wiso' ? 2 : st.mcOptions!.length - 1;

  let finalList = unique;
  if (finalList.length < minCorrect || finalList.length > maxCorrect) {
    const ids = mcOptionIds(context);
    const fallback = [ids[0], ids[2]];
    console.warn(
      `[generator] correctOptions ungültig für "${topic}" (Anzahl ${finalList.length}) — Fallback [${fallback.map((f) => `"${f}"`).join(',')}]`,
    );
    finalList = fallback;
  }
  st.expectedAnswer = { ...st.expectedAnswer, correctOptions: finalList };
}

// ─── SQL-Validator ───────────────────────────────────────────────────────────

function validateSqlSubtask(st: GeneratedSubTask): void {
  if (!st.expectedAnswer) st.expectedAnswer = {};
  const exp = st.expectedAnswer;

  if (typeof exp.solutionSql !== 'string' || !(exp.solutionSql as string).trim()) {
    exp.solutionSql = '-- Musterlösung nicht verfügbar';
  }
  if (!Array.isArray(exp.keyElements)) {
    exp.keyElements = [];
  }
  if (typeof exp.gradingHint !== 'string') {
    exp.gradingHint =
      'Bewertung nach SQL-Syntax, korrekten Tabellen-/Spaltenbezügen und Ergebnismenge.';
  }
}
