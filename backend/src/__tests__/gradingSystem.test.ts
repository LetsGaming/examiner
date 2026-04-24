/**
 * gradingSystem.test.ts — Tests für buildGradingSystemPrompt aus
 * ai/prompts/gradingSystem.ts.
 *
 * Schwerpunkte:
 *   - ZPA_CORRECTION_DISCLAIMER wird wortgleich in den Prompt integriert
 *     (Gap 3 aus dem Refactor — belegt MD §6.1 authentisch)
 *   - Prüfungsbereichs-Text wechselt je nach examPart
 *   - scenarioContext wird korrekt eingefügt, wenn angegeben
 *   - IHK-Notenschema ist im Prompt enthalten
 *   - Die 10 Bewertungsregeln sind vollständig vorhanden
 */
import { describe, it, expect } from 'vitest';
import { buildGradingSystemPrompt } from '../ai/prompts/gradingSystem.js';
import { ZPA_CORRECTION_DISCLAIMER } from '../domain/gradingTemplates.js';

describe('buildGradingSystemPrompt', () => {
  it('enthält den wortgleichen ZPA_CORRECTION_DISCLAIMER (Gap-3-Fix, MD §6.1)', () => {
    const prompt = buildGradingSystemPrompt('teil_1');
    expect(prompt).toContain(ZPA_CORRECTION_DISCLAIMER);
  });

  it('labelt den Disclaimer als "IHK-GRUNDHALTUNG"', () => {
    const prompt = buildGradingSystemPrompt('teil_1');
    expect(prompt).toContain('IHK-GRUNDHALTUNG');
  });

  it('wechselt den Prüfungsbereichs-Text je examPart', () => {
    const p1 = buildGradingSystemPrompt('teil_1');
    const p2 = buildGradingSystemPrompt('teil_2');
    const p3 = buildGradingSystemPrompt('teil_3');

    expect(p1).toContain('Planen eines Softwareproduktes');
    expect(p2).toContain('Entwicklung und Umsetzung von Softwarealgorithmen');
    expect(p3).toContain('Wirtschafts- und Sozialkunde');

    // Kreuzcheck: Teil-1-Prompt enthält NICHT den Teil-2-Text
    expect(p1).not.toContain('Entwicklung und Umsetzung von Softwarealgorithmen');
    expect(p2).not.toContain('Planen eines Softwareproduktes');
  });

  it('enthält das IHK-Notenschema (MD §6.1)', () => {
    const prompt = buildGradingSystemPrompt('teil_1');
    expect(prompt).toContain('IHK-NOTENSCHEMA');
    // Die Schwellwerte 92/81/67/50/30 müssen alle erscheinen
    expect(prompt).toContain('92');
    expect(prompt).toContain('81');
    expect(prompt).toContain('67');
    expect(prompt).toContain('50');
    expect(prompt).toContain('30');
  });

  it('enthält alle 10 Bewertungsregeln', () => {
    const prompt = buildGradingSystemPrompt('teil_1');
    for (let i = 1; i <= 10; i++) {
      expect(prompt).toContain(`${i}.`);
    }
  });

  it('fordert JSON-only Ausgabe (keine Markdown-Backticks)', () => {
    const prompt = buildGradingSystemPrompt('teil_1');
    expect(prompt).toMatch(/AUSSCHLIESSLICH.*JSON/i);
  });

  it('fügt scenarioContext ein, wenn angegeben', () => {
    const prompt = buildGradingSystemPrompt(
      'teil_1',
      'TravelTech GmbH — mittelständisches Reisetechnologie-Unternehmen',
    );
    expect(prompt).toContain('PRÜFUNGSKONTEXT');
    expect(prompt).toContain('TravelTech GmbH');
  });

  it('lässt scenarioContext weg, wenn nicht angegeben', () => {
    const prompt = buildGradingSystemPrompt('teil_1');
    expect(prompt).not.toContain('PRÜFUNGSKONTEXT');
  });

  it('fordert konkrete improvementHints (Feedback-Qualität)', () => {
    const prompt = buildGradingSystemPrompt('teil_1');
    expect(prompt).toContain('KONKRETE');
    expect(prompt).toContain('improvementHints');
  });

  it('verbietet generische Kriterium-Namen wie "Kriterium 1"', () => {
    const prompt = buildGradingSystemPrompt('teil_1');
    expect(prompt).toContain('criterionScores');
    expect(prompt).toContain('Kriterium 1');
    expect(prompt).toMatch(/NIEMALS.*Kriterium 1/i);
  });

  it('referenziert den FIAE-Ausbildungsberuf', () => {
    const prompt = buildGradingSystemPrompt('teil_1');
    expect(prompt).toContain('Fachinformatiker');
    expect(prompt).toContain('FIAE');
  });
});
