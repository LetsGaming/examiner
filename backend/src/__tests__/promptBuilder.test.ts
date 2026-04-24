/**
 * promptBuilder.test.ts — Tests für generator/core/promptBuilder.ts.
 *
 * Schwerpunkte:
 *   - buildSystemPrompt schaltet Type-Rules flag-basiert zu
 *   - WiSo-Rezepte (id 't3_*') aktivieren WISO_MODE_RULES + WISO_CONTEXT_BLOCK
 *   - Teil-1/2-Rezepte aktivieren TEIL12_CONTEXT_BLOCK + TEIL12_MC_RULES
 *   - OPERATOR_CHEATSHEET ist nicht mehr enthalten (Gap-4-Fix)
 *   - buildSubtaskInstructions hängt Operator-Label + Bewertungshinweis an
 *   - buildUserPrompt enthält das Thema + topic-spezifische Hints
 */
import { describe, it, expect } from 'vitest';
import {
  buildSubtaskInstructions,
  buildSystemPrompt,
  buildUserPrompt,
} from '../generator/core/promptBuilder.js';
import type { SubtaskSpec, TaskRecipe } from '../generator/types.js';

// ─── Hilfs-Fabriken ──────────────────────────────────────────────────────────

function makeSubtask(overrides: Partial<SubtaskSpec>): SubtaskSpec {
  return {
    taskType: 'freitext',
    prompt: 'Beschreiben Sie X.',
    points: 5,
    ...overrides,
  };
}

function makeRecipe(id: string, subtasks: SubtaskSpec[]): TaskRecipe {
  return { id, weight: 1, subtasks };
}

// ─── buildSystemPrompt ───────────────────────────────────────────────────────

describe('buildSystemPrompt — Teil 1/2', () => {
  it('enthält den Teil-1/2-Kontextblock', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({})]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toContain('AUFGABENTEXT-STRUKTUR');
    expect(prompt).toContain('{{UNTERNEHMEN}}');
  });

  it('enthält die Teil-1/2-MC-Regeln (A–D)', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({})]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toContain('4 Optionen A–D');
  });

  it('enthält NICHT die WiSo-Regeln', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({})]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).not.toContain('WISO-MODUS');
  });

  it('schaltet TYPE_RULE_SQL zu, wenn ein SQL-Subtask im Rezept ist', () => {
    const recipe = makeRecipe('t2_test', [makeSubtask({ taskType: 'sql' })]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toContain('SQL:');
    expect(prompt).toContain('mind. 5 Beispieldatenzeilen');
  });

  it('schaltet TYPE_RULE_SQL NICHT zu, wenn kein SQL-Subtask existiert', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({ taskType: 'freitext' })]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).not.toContain('SQL: questionText MUSS');
  });

  it('schaltet TYPE_RULE_PSEUDOCODE zu mit IHK-Syntax (:=, solange/ende solange)', () => {
    const recipe = makeRecipe('t2_test', [makeSubtask({ taskType: 'pseudocode' })]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toContain('PSEUDOCODE:');
    // Gap-2-Fix: IHK-Syntax jetzt in der Type-Rule
    expect(prompt).toContain(':=');
    expect(prompt).toContain('solange/ende solange');
  });

  it('schaltet TYPE_RULE_SEQUENCE zu für plantuml + uml_sequence', () => {
    const recipe = makeRecipe('t2_test', [
      makeSubtask({ taskType: 'plantuml', diagramType: 'uml_sequence' }),
    ]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toContain('SEQUENZDIAGRAMM');
  });

  it('schaltet TYPE_RULE_ACTIVITY zu für plantuml + uml_activity', () => {
    const recipe = makeRecipe('t1_test', [
      makeSubtask({ taskType: 'plantuml', diagramType: 'uml_activity' }),
    ]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toContain('AKTIVITÄTSDIAGRAMM');
  });

  it('schaltet TYPE_RULE_ER zu für plantuml + er', () => {
    const recipe = makeRecipe('t1_test', [
      makeSubtask({ taskType: 'plantuml', diagramType: 'er' }),
    ]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toContain('ER-DIAGRAMM');
  });

  it('nennt FIAE für specialty=fiae', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({})]);
    expect(buildSystemPrompt('fiae', recipe)).toContain('FIAE');
  });

  it('nennt FISI für specialty=fisi', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({})]);
    expect(buildSystemPrompt('fisi', recipe)).toContain('FISI');
  });
});

describe('buildSystemPrompt — WiSo (t3_*)', () => {
  it('aktiviert WISO-Modus für id startet mit "t3_"', () => {
    const recipe = makeRecipe('t3_test', [makeSubtask({})]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toContain('WISO-MODUS');
  });

  it('fordert 5 Optionen mit IDs 1–5 (MD §5.3)', () => {
    const recipe = makeRecipe('t3_mc', [makeSubtask({ taskType: 'mc' })]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toContain('5 Optionen');
    expect(prompt).toMatch(/IDs "1"–"5"/);
  });

  it('fordert bei Multi-Choice genau 2 korrekte (MD §5.3 + §6.1 Lösungsbeispiele)', () => {
    const recipe = makeRecipe('t3_mc_multi', [makeSubtask({ taskType: 'mc_multi' })]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).toMatch(/IMMER genau 2 korrekt/);
  });

  it('enthält NICHT den Teil-1/2-Kontextblock', () => {
    const recipe = makeRecipe('t3_test', [makeSubtask({})]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).not.toContain('AUFGABENTEXT-STRUKTUR');
  });

  it('enthält NICHT die Teil-1/2-MC-Regeln (keine A–D-Form)', () => {
    const recipe = makeRecipe('t3_mc', [makeSubtask({ taskType: 'mc' })]);
    const prompt = buildSystemPrompt('fiae', recipe);
    expect(prompt).not.toContain('4 Optionen A–D');
  });
});

describe('buildSystemPrompt — Gap-4-Fix: kein OPERATOR_CHEATSHEET mehr', () => {
  it('enthält NICHT die alte Cheatsheet-Formel "Operatoren: nennen=..."', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({ operator: 'erlaeutern' })]);
    const prompt = buildSystemPrompt('fiae', recipe);
    // Die alte Cheatsheet-Zeile fing mit "Operatoren: nennen=" an.
    expect(prompt).not.toContain('Operatoren: nennen=');
    expect(prompt).not.toContain('nennen=Stichworte');
  });
});

// ─── buildSubtaskInstructions ────────────────────────────────────────────────

describe('buildSubtaskInstructions', () => {
  it('hängt das Operator-Label an, wenn operator gesetzt ist', () => {
    const recipe = makeRecipe('t1_test', [
      makeSubtask({ operator: 'erlaeutern', prompt: 'Erläutern Sie ACID.' }),
    ]);
    const out = buildSubtaskInstructions(recipe, ['a'], [5]);
    expect(out).toContain('[Operator: erlaeutern]');
  });

  it('lässt das Operator-Label weg, wenn operator undefined ist', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({ prompt: 'Do X.' })]);
    const out = buildSubtaskInstructions(recipe, ['a'], [5]);
    expect(out).not.toContain('[Operator:');
  });

  it('zeigt das Label und die Punkte im Unteraufgaben-Header', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({ prompt: 'X.' })]);
    const out = buildSubtaskInstructions(recipe, ['ba'], [7]);
    expect(out).toContain('Unteraufgabe ba (7P)');
  });

  it('hängt den Bewertungshinweis an, wenn gesetzt', () => {
    const recipe = makeRecipe('t1_test', [
      makeSubtask({ prompt: 'X.', gradingHint: 'Je Punkt 1P. Stichworte reichen.' }),
    ]);
    const out = buildSubtaskInstructions(recipe, ['a'], [3]);
    expect(out).toContain('Bewertungshinweis:');
    expect(out).toContain('Je Punkt 1P. Stichworte reichen.');
  });

  it('trennt mehrere Subtasks durch Leerzeilen', () => {
    const recipe = makeRecipe('t1_test', [
      makeSubtask({ prompt: 'X.' }),
      makeSubtask({ prompt: 'Y.' }),
    ]);
    const out = buildSubtaskInstructions(recipe, ['a', 'b'], [3, 4]);
    const parts = out.split('\n\n');
    expect(parts.length).toBe(2);
    expect(parts[0]).toContain('Unteraufgabe a');
    expect(parts[1]).toContain('Unteraufgabe b');
  });
});

// ─── buildUserPrompt ─────────────────────────────────────────────────────────

describe('buildUserPrompt', () => {
  it('enthält das Thema in Anführungszeichen', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({})]);
    const prompt = buildUserPrompt({
      topic: 'Stakeholder-Analyse',
      recipe,
      subtaskInstructions: 'Unteraufgabe a (5P): ...',
      totalPoints: 5,
      schemas: ['{}'],
    });
    expect(prompt).toContain('"Stakeholder-Analyse"');
  });

  it('enthält die totalPoints und den topicArea im JSON-Skelett', () => {
    const recipe = makeRecipe('t1_test', [makeSubtask({})]);
    const prompt = buildUserPrompt({
      topic: 'ACID',
      recipe,
      subtaskInstructions: 'Unteraufgabe a (20P): ...',
      totalPoints: 20,
      schemas: ['{"x":1}'],
    });
    expect(prompt).toContain('"topicArea":"ACID"');
    expect(prompt).toContain('"pointsValue":20');
  });

  it('injiziert topic-spezifische Hints (z.B. bei SQL-Rezepten)', () => {
    const recipe = makeRecipe('t2_test', [makeSubtask({ taskType: 'sql' })]);
    const prompt = buildUserPrompt({
      topic: 'SQL JOIN',
      recipe,
      subtaskInstructions: '...',
      totalPoints: 25,
      schemas: ['{}'],
    });
    expect(prompt).toContain('Hinweise:');
    expect(prompt).toContain('SQL');
  });

  it('enthält die schemas-JSON-Fragmente im subtasks-Array', () => {
    const recipe = makeRecipe('t1_test', [
      makeSubtask({ prompt: 'A' }),
      makeSubtask({ prompt: 'B' }),
    ]);
    const prompt = buildUserPrompt({
      topic: 'Test',
      recipe,
      subtaskInstructions: '...',
      totalPoints: 10,
      schemas: ['{"n":1}', '{"n":2}'],
    });
    expect(prompt).toContain('{"n":1},{"n":2}');
  });
});
