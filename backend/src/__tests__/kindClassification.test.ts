/**
 * kindClassification.test.ts — Tests for the new kind-based task classification
 * and kind-aware topic picking introduced for typ-balanced exam assembly.
 *
 * Covers:
 *   - classifyTaskFromSubtasks priority (diagram > calc > sql > code > table > text)
 *   - Mockup/Skizze detection from questionText
 *   - inferKindForTopic regex patterns
 *   - pickTopicsByKinds prefers requested kinds and fills with others
 */
import { describe, it, expect } from 'vitest';
import { classifyTaskFromSubtasks } from '../services/taskKind.js';
import { inferKindForTopic, pickTopicsByKinds } from '../services/topics.js';

describe('classifyTaskFromSubtasks', () => {
  it('classifies as diagram when a plantuml subtask is present', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'freitext', question_text: 'Beschreibe den Ablauf.' },
      { task_type: 'plantuml', question_text: 'Erstelle ein UML-Aktivitätsdiagramm.' },
    ]);
    expect(kind).toBe('diagram');
  });

  it('classifies as diagram when a diagram_upload subtask is present', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'diagram_upload', question_text: 'Lade dein Diagramm hoch.' },
    ]);
    expect(kind).toBe('diagram');
  });

  it('classifies as diagram when questionText mentions Mockup', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'freitext', question_text: 'Skizzieren Sie das Mockup der Eingabemaske.' },
    ]);
    expect(kind).toBe('diagram');
  });

  it('classifies as diagram when questionText mentions Skizze', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'freitext', question_text: 'Erstellen Sie eine Skizze der Oberfläche.' },
    ]);
    expect(kind).toBe('diagram');
  });

  it('classifies as calc when operator is berechnen', () => {
    const kind = classifyTaskFromSubtasks([
      {
        task_type: 'freitext',
        question_text: 'Bestimmen Sie das Ergebnis.',
        expected_answer: '{"operator":"berechnen","keyPoints":[]}',
      },
    ]);
    expect(kind).toBe('calc');
  });

  it('classifies as calc when questionText mentions Speicherbedarf', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'freitext', question_text: 'Berechnen Sie den Speicherbedarf in GiB.' },
    ]);
    expect(kind).toBe('calc');
  });

  it('classifies as calc when questionText mentions kritischer Pfad', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'freitext', question_text: 'Bestimmen Sie den kritischen Pfad im Netzplan.' },
    ]);
    expect(kind).toBe('calc');
  });

  it('classifies as sql when an sql subtask is present (no diagram/calc)', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'freitext', question_text: 'Erläutern Sie JOINs.' },
      { task_type: 'sql', question_text: 'Schreiben Sie die Abfrage.' },
    ]);
    expect(kind).toBe('sql');
  });

  it('classifies as code when a pseudocode subtask is present (no sql)', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'pseudocode', question_text: 'Implementieren Sie den Algorithmus.' },
    ]);
    expect(kind).toBe('code');
  });

  it('classifies as table when only table subtask is present', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'freitext', question_text: 'Beschreiben Sie Stakeholder.' },
      { task_type: 'table', question_text: 'Füllen Sie die Stakeholder-Tabelle aus.' },
    ]);
    expect(kind).toBe('table');
  });

  it('classifies as text as default', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'freitext', question_text: 'Erläutern Sie DSGVO.' },
      { task_type: 'freitext', question_text: 'Beschreiben Sie die Schritte.' },
    ]);
    expect(kind).toBe('text');
  });

  it('prioritizes diagram over table when both present', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'table', question_text: 'Füllen Sie die Tabelle.' },
      { task_type: 'plantuml', question_text: 'Erstellen Sie das Diagramm.' },
    ]);
    expect(kind).toBe('diagram');
  });

  it('prioritizes calc over sql when both present', () => {
    const kind = classifyTaskFromSubtasks([
      { task_type: 'sql', question_text: 'Schreiben Sie SELECT.' },
      { task_type: 'freitext', question_text: 'Berechnen Sie den Speicherbedarf.' },
    ]);
    expect(kind).toBe('calc');
  });
});

describe('inferKindForTopic', () => {
  it.each([
    ['UML-Aktivitätsdiagramme', 'diagram'],
    ['UML-Zustandsdiagramme', 'diagram'],
    ['UML-Klassendiagramme', 'diagram'],
    ['ER-Modellierung', 'diagram'],
    ['ER-Diagramm vervollständigen', 'diagram'],
    ['UI-Design & Mockups', 'diagram'],
    ['Darstellungsformen (Liste/Kachel/Karte) mit Begründung', 'diagram'],
    ['Netzplan & kritischer Pfad', 'calc'],
    ['Speicherbedarf & Datenkodierung', 'calc'],
    ['SQL SELECT & JOIN', 'sql'],
    ['SQL GROUP BY & Aggregation', 'sql'],
    ['SQL CREATE TABLE (DDL)', 'sql'],
    ['Pseudocode & Algorithmen entwerfen', 'code'],
    ['Sortieralgorithmen', 'code'],
    ['Rekursion', 'code'],
    ['Stakeholder-Analyse', 'table'],
    ['Testkonzept & Teststrategie', 'table'],
    ['DSGVO & Datenschutz', 'text'],
    ['Continuous Integration / CI-CD-Pipelines', 'text'],
    ['Verschlüsselung (symmetrisch/asymmetrisch/hybrid)', 'text'],
  ])('%s → %s', (topic, expected) => {
    expect(inferKindForTopic(topic)).toBe(expected);
  });
});

describe('pickTopicsByKinds', () => {
  it('returns topics matching the requested kind when available', () => {
    const topics = pickTopicsByKinds('teil_1', ['diagram'], 3);
    expect(topics).toHaveLength(3);
    // All three should infer to diagram
    const kinds = topics.map(inferKindForTopic);
    // At least some should match (regex-based inference is best-effort —
    // the fill-up pass may add non-diagram topics if pool is thin)
    const diagramCount = kinds.filter((k) => k === 'diagram').length;
    expect(diagramCount).toBeGreaterThanOrEqual(2);
  });

  it('falls back to other topics when not enough of requested kind exist', () => {
    // Asking for 50 diagram topics — there are fewer than that in teil_1
    const topics = pickTopicsByKinds('teil_1', ['diagram'], 50);
    // Returns as many as the topic list has (no duplicates, no error)
    expect(topics.length).toBeGreaterThan(3);
    expect(new Set(topics).size).toBe(topics.length); // no duplicates
  });

  it('handles multiple requested kinds', () => {
    const topics = pickTopicsByKinds('teil_2', ['sql', 'code'], 5);
    expect(topics).toHaveLength(5);
    const kinds = topics.map(inferKindForTopic);
    const matchCount = kinds.filter((k) => k === 'sql' || k === 'code').length;
    expect(matchCount).toBeGreaterThanOrEqual(3);
  });

  it('returns empty array when count is 0', () => {
    expect(pickTopicsByKinds('teil_1', ['diagram'], 0)).toEqual([]);
  });
});
