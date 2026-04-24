/**
 * gradingTemplates.test.ts — Tests für die Bewertungshinweis-Helfer aus
 * domain/gradingTemplates.ts.
 *
 * Schwerpunkte:
 *   - Ausgabe-Struktur jeder Helfer-Funktion
 *   - detail?-Parameter wird korrekt angehängt (erst durch Punkt-1-Refactor eingeführt)
 *   - ZPA_CORRECTION_DISCLAIMER ist wortgleich mit MD §6.1-Zitat
 */
import { describe, it, expect } from 'vitest';
import {
  diagramHint,
  enumerationHint,
  prosConsHint,
  sqlHint,
  tableRowHint,
  ZPA_CORRECTION_DISCLAIMER,
} from '../domain/gradingTemplates.js';
import {
  SV_BEITRAGSSAETZE_2026,
  svBeitragssaetzePromptBlock,
} from '../domain/taxonomy.js';

describe('enumerationHint', () => {
  it('uses "halbe Punkte" for count=2', () => {
    expect(enumerationHint(2)).toContain('halbe Punkte');
  });

  it('uses "1/3 der Punkte" for count=3', () => {
    expect(enumerationHint(3)).toContain('1/3 der Punkte');
  });

  it('uses generic "1/N der Punkte" for count>=4', () => {
    expect(enumerationHint(5)).toContain('1/5 der Punkte');
  });

  it('mentions that semantically equivalent answers are accepted', () => {
    expect(enumerationHint(3)).toContain('Sinngemäß');
  });

  it('appends detail string when provided', () => {
    const result = enumerationHint(3, 'Z.B. Authentifizierung, Autorisierung, Verschlüsselung.');
    expect(result).toContain('1/3 der Punkte');
    expect(result).toContain('Z.B. Authentifizierung, Autorisierung, Verschlüsselung.');
  });

  it('omits trailing space when detail is undefined', () => {
    expect(enumerationHint(2)).not.toMatch(/\s$/);
  });
});

describe('prosConsHint', () => {
  it('describes the half-points-per-item split', () => {
    expect(prosConsHint()).toContain('halbe Punkte');
  });

  it('appends detail string when provided', () => {
    const result = prosConsHint('Bsp. Vorteil: zentrale Übersicht. Nachteil: Single Point of Failure.');
    expect(result).toContain('halbe Punkte');
    expect(result).toContain('Single Point of Failure');
  });
});

describe('calculationHint (entfernt)', () => {
  // Der Helfer wurde entfernt, weil seine starre path/result/unit-Struktur keinem
  // der vorhandenen Rechen-Hints im Code exakt entsprach. Dieser Platzhalter
  // bleibt, um sicherzustellen dass niemand den Helfer versehentlich wieder
  // einführt, ohne die fachlichen Rezept-Anforderungen neu zu prüfen.
  it('ist bewusst nicht exportiert', async () => {
    const mod = await import('../domain/gradingTemplates.js');
    expect('calculationHint' in mod).toBe(false);
  });
});

describe('tableRowHint', () => {
  it('lists the column labels joined by " + "', () => {
    const h = tableRowHint(3, 4, ['Stakeholder', 'Erwartung', 'Befürchtung']);
    expect(h).toContain('Stakeholder + Erwartung + Befürchtung');
  });

  it('mentions the points-per-row value', () => {
    expect(tableRowHint(3, 4, ['A', 'B', 'C'])).toContain('4P');
  });

  it('mentions that alternative plausible entries are accepted', () => {
    expect(tableRowHint(3, 4, ['A', 'B'])).toMatch(/Alternative/);
  });

  it('appends detail when provided', () => {
    const h = tableRowHint(3, 4, ['X', 'Y'], '1P X, 3P Y.');
    expect(h).toContain('1P X, 3P Y.');
  });
});

describe('sqlHint', () => {
  it('produces a distinct hint for each SQL focus variant', () => {
    const select = sqlHint('select');
    const ddl = sqlHint('ddl');
    const dml = sqlHint('dml');
    const aggregate = sqlHint('aggregate');
    const hints = [select, ddl, dml, aggregate];
    // All four must be distinct
    expect(new Set(hints).size).toBe(4);
  });

  it('ddl mentions PK and FK constraints', () => {
    const h = sqlHint('ddl');
    expect(h).toContain('PK');
    expect(h).toContain('FK');
  });

  it('aggregate mentions GROUP BY and HAVING', () => {
    const h = sqlHint('aggregate');
    expect(h).toContain('GROUP BY');
    expect(h).toContain('HAVING');
  });

  it('dml warns about missing WHERE on UPDATE/DELETE', () => {
    const h = sqlHint('dml');
    expect(h).toMatch(/WHERE.*UPDATE\/DELETE/);
  });

  it('appends detail when provided', () => {
    const h = sqlHint('select', 'Bei Aliasen auch t1/t2 akzeptieren.');
    expect(h).toContain('Aliasen auch t1/t2');
  });
});

describe('diagramHint', () => {
  it('produces a distinct hint for each diagram kind', () => {
    const kinds: Array<'er' | 'activity' | 'sequence' | 'class' | 'state'> = [
      'er',
      'activity',
      'sequence',
      'class',
      'state',
    ];
    const hints = kinds.map((k) => diagramHint(k));
    expect(new Set(hints).size).toBe(kinds.length);
  });

  it('er mentions Entitätstyp and Kardinalität', () => {
    const h = diagramHint('er');
    expect(h).toContain('Entitätstyp');
    expect(h).toContain('Kardinalität');
  });

  it('activity mentions Swimlanes', () => {
    expect(diagramHint('activity')).toContain('Swimlanes');
  });

  it('sequence mentions Lifeline', () => {
    expect(diagramHint('sequence')).toContain('Lifeline');
  });

  it('state mentions Zustand and Transition', () => {
    const h = diagramHint('state');
    expect(h).toContain('Zustand');
    expect(h).toContain('Transition');
  });

  it('appends detail when provided', () => {
    const h = diagramHint('activity', 'Je Aktivität 1P max.');
    expect(h).toContain('Swimlanes');
    expect(h).toContain('Je Aktivität 1P max.');
  });
});

describe('ZPA_CORRECTION_DISCLAIMER (MD §6.1)', () => {
  // Der Disclaimer ist WORTGLEICH zu den ZPA-Lösungsbögen. Änderungen müssen
  // gegen die MD-Quelle abgewogen werden — dieser Test fixiert das Zitat.
  it('enthält den "Korrekturhilfen" Kernsatz', () => {
    expect(ZPA_CORRECTION_DISCLAIMER).toContain('Korrekturhilfen');
    expect(ZPA_CORRECTION_DISCLAIMER).toContain('Anspruch auf Vollständigkeit');
    expect(ZPA_CORRECTION_DISCLAIMER).toContain('Ausschließlichkeit');
  });

  it('nennt die Operator-Dimensionen nennen-erklären-beschreiben-erläutern', () => {
    expect(ZPA_CORRECTION_DISCLAIMER).toContain('nennen');
    expect(ZPA_CORRECTION_DISCLAIMER).toContain('erklären');
    expect(ZPA_CORRECTION_DISCLAIMER).toContain('beschreiben');
    expect(ZPA_CORRECTION_DISCLAIMER).toContain('erläutern');
  });
});

describe('SV_BEITRAGSSAETZE_2026 (OF 6 — WiSo-SV-Berechnung)', () => {
  it('enthält alle fünf SV-Zweige als Arbeitnehmeranteil', () => {
    expect(SV_BEITRAGSSAETZE_2026.krankenversicherung.arbeitnehmer).toBe(7.3);
    expect(SV_BEITRAGSSAETZE_2026.rentenversicherung.arbeitnehmer).toBe(9.3);
    expect(SV_BEITRAGSSAETZE_2026.arbeitslosenversicherung.arbeitnehmer).toBe(1.3);
    expect(SV_BEITRAGSSAETZE_2026.pflegeversicherung.arbeitnehmer).toBe(1.8);
    expect(SV_BEITRAGSSAETZE_2026.krankenversicherungZusatzbeitrag.arbeitnehmer).toBe(1.45);
  });

  it('enthält die aktuellen Bemessungsgrenzen (TK/AOK/DRV Jan 2026)', () => {
    expect(SV_BEITRAGSSAETZE_2026.bemessungsgrenzeKvPv).toBe(5812.5);
    expect(SV_BEITRAGSSAETZE_2026.bemessungsgrenzeRvAv).toBe(8450);
  });

  it('Arbeitnehmer-Anteil ist stets die Hälfte des Gesamtbeitrags (paritätisch)', () => {
    const s = SV_BEITRAGSSAETZE_2026;
    expect(s.krankenversicherung.arbeitnehmer * 2).toBe(s.krankenversicherung.gesamt);
    expect(s.rentenversicherung.arbeitnehmer * 2).toBe(s.rentenversicherung.gesamt);
    expect(s.arbeitslosenversicherung.arbeitnehmer * 2).toBe(s.arbeitslosenversicherung.gesamt);
  });
});

describe('svBeitragssaetzePromptBlock', () => {
  it('enthält den Stand-Hinweis', () => {
    const block = svBeitragssaetzePromptBlock();
    expect(block).toContain('Stand 2026');
    expect(block).toContain('verpflichtend');
  });

  it('listet alle Beitragssätze mit Arbeitnehmer-Anteil', () => {
    const block = svBeitragssaetzePromptBlock();
    expect(block).toContain('Krankenversicherung: 14.6%');
    expect(block).toContain('Rentenversicherung: 18.6%');
    expect(block).toContain('Arbeitslosenversicherung: 2.6%');
    expect(block).toContain('Pflegeversicherung: 3.6%');
  });

  it('erwähnt Sachsen-Sonderregel und Kinderlosenzuschlag', () => {
    const block = svBeitragssaetzePromptBlock();
    expect(block).toContain('Sachsen');
    expect(block).toContain('Kinderlosenzuschlag');
  });

  it('nennt beide Bemessungsgrenzen', () => {
    const block = svBeitragssaetzePromptBlock();
    expect(block).toContain('5812.5');
    expect(block).toContain('8450');
  });
});
