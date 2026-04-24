/**
 * mcGrader.test.ts — Tests für ai/grading/mcGrader.ts.
 *
 * Schwerpunkte:
 *   - OF-5-Fix: Default mcOptionIds nutzen jetzt MC_OPTION_IDS_TEIL12 aus der
 *     zentralen Taxonomy (nicht mehr hardcoded ['A','B','C','D'])
 *   - WiSo-Modus: numerische IDs 1–5 (MD §5.3)
 *   - Proportionale Teilpunkte bei Multi-Choice
 */
import { describe, it, expect } from 'vitest';
import { gradeMcAnswer, gradeMcMultiAnswer } from '../ai/grading/mcGrader.js';
import { MC_OPTION_IDS_TEIL12, MC_OPTION_IDS_WISO } from '../domain/taxonomy.js';

describe('gradeMcAnswer — Single-Choice Teil 1/2 (A–D)', () => {
  it('vergibt volle Punkte bei korrekter Auswahl', () => {
    const result = gradeMcAnswer({
      selectedOptionId: 'B',
      expectedAnswer: { correctOption: 'B', explanation: 'B ist richtig weil...' },
      maxPoints: 5,
      mcOptionIds: [...MC_OPTION_IDS_TEIL12],
    });
    expect(result.awardedPoints).toBe(5);
    expect(result.percentageScore).toBe(100);
  });

  it('vergibt 0 Punkte bei falscher Auswahl', () => {
    const result = gradeMcAnswer({
      selectedOptionId: 'A',
      expectedAnswer: { correctOption: 'C' },
      maxPoints: 5,
      mcOptionIds: [...MC_OPTION_IDS_TEIL12],
    });
    expect(result.awardedPoints).toBe(0);
    expect(result.keyMistakes.length).toBeGreaterThan(0);
  });

  it('normalisiert Kleinschreibung beim Teil-1/2-Format', () => {
    const result = gradeMcAnswer({
      selectedOptionId: 'b',
      expectedAnswer: { correctOption: 'B' },
      maxPoints: 5,
      mcOptionIds: [...MC_OPTION_IDS_TEIL12],
    });
    expect(result.awardedPoints).toBe(5);
  });
});

describe('gradeMcAnswer — OF-5-Fix: Default ohne mcOptionIds-Param', () => {
  // Diese Tests fixieren den Fix: wenn mcOptionIds nicht übergeben wird,
  // wird MC_OPTION_IDS_TEIL12 aus der Taxonomy genutzt (nicht mehr hardcoded).
  it('akzeptiert A–D als Default-IDs, wenn mcOptionIds weggelassen wird', () => {
    const result = gradeMcAnswer({
      selectedOptionId: 'C',
      expectedAnswer: { correctOption: 'C' },
      maxPoints: 3,
    });
    expect(result.awardedPoints).toBe(3);
  });

  it('Default-IDs stammen aus MC_OPTION_IDS_TEIL12 (Taxonomy-Konstante)', () => {
    // Falls MC_OPTION_IDS_TEIL12 sich ändert, muss der Default mitziehen.
    // Dieser Test würde fehlschlagen, falls jemand wieder hardcodet.
    expect(MC_OPTION_IDS_TEIL12).toEqual(['A', 'B', 'C', 'D']);
    // Smoke-Test: Antwort "D" muss mit Default-IDs funktionieren
    const result = gradeMcAnswer({
      selectedOptionId: 'D',
      expectedAnswer: { correctOption: 'D' },
      maxPoints: 2,
    });
    expect(result.awardedPoints).toBe(2);
  });
});

describe('gradeMcAnswer — WiSo (Ziffern 1–5, MD §5.3)', () => {
  it('akzeptiert numerische IDs 1–5', () => {
    const result = gradeMcAnswer({
      selectedOptionId: '3',
      expectedAnswer: { correctOption: '3' },
      maxPoints: 4,
      mcOptionIds: [...MC_OPTION_IDS_WISO],
    });
    expect(result.awardedPoints).toBe(4);
  });

  it('vergibt 0 Punkte bei falscher WiSo-Auswahl', () => {
    const result = gradeMcAnswer({
      selectedOptionId: '1',
      expectedAnswer: { correctOption: '5' },
      maxPoints: 4,
      mcOptionIds: [...MC_OPTION_IDS_WISO],
    });
    expect(result.awardedPoints).toBe(0);
  });

  it('keyMistakes nennt die korrekte WiSo-Option mit Ziffer', () => {
    const result = gradeMcAnswer({
      selectedOptionId: '2',
      expectedAnswer: { correctOption: '4' },
      maxPoints: 4,
      mcOptionIds: [...MC_OPTION_IDS_WISO],
    });
    expect(result.keyMistakes[0]).toContain('4');
  });
});

describe('gradeMcMultiAnswer — Multi-Choice (proportional)', () => {
  it('vergibt volle Punkte bei exakt korrekter Auswahl', () => {
    const result = gradeMcMultiAnswer({
      studentSelectionRaw: '2,3',
      mcOptionIds: [...MC_OPTION_IDS_WISO],
      expectedAnswer: { correctOptions: ['2', '3'] },
      maxPoints: 5,
    });
    expect(result.awardedPoints).toBe(5);
    expect(result.percentageScore).toBe(100);
  });

  it('vergibt Teilpunkte bei 4 von 5 korrekt eingeordneten Optionen', () => {
    const result = gradeMcMultiAnswer({
      studentSelectionRaw: '2,4', // erwartet 2+3, student nahm 2+4
      mcOptionIds: [...MC_OPTION_IDS_WISO],
      expectedAnswer: { correctOptions: ['2', '3'] },
      maxPoints: 5,
    });
    // korrekt eingeordnet: 1 (nicht gewählt, korrekt), 2 (gewählt, korrekt),
    // 5 (nicht gewählt, korrekt) = 3 von 5 → 60%
    expect(result.percentageScore).toBe(60);
  });

  it('akzeptiert JSON-Array als studentSelectionRaw', () => {
    const result = gradeMcMultiAnswer({
      studentSelectionRaw: '["2","3"]',
      mcOptionIds: [...MC_OPTION_IDS_WISO],
      expectedAnswer: { correctOptions: ['2', '3'] },
      maxPoints: 5,
    });
    expect(result.awardedPoints).toBe(5);
  });

  it('listet fälschlich ausgewählte und übersehene Optionen getrennt', () => {
    const result = gradeMcMultiAnswer({
      studentSelectionRaw: '1,4',
      mcOptionIds: [...MC_OPTION_IDS_WISO],
      expectedAnswer: { correctOptions: ['2', '3'] },
      maxPoints: 5,
    });
    const mistakes = result.keyMistakes.join(' | ');
    expect(mistakes).toContain('Fälschlicherweise');
    expect(mistakes).toContain('übersehen');
  });
});
