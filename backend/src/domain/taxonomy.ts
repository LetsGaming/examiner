/**
 * taxonomy.ts — Zentrale Fachbegriffe aus der Prüfungsanalyse.
 *
 * Single Source of Truth für: Operatoren, Notenschema, Task-Typen, Diagramm-Typen,
 * MC-Option-Formate (Teil 1/2 vs. WiSo).
 *
 * Alle Werte hier sind im Referenz-MD belegt — bei Änderungen MD-Stelle prüfen.
 * Andere Module (prompts.ts, gradingTemplates.ts, examGenerator.ts, aiService.ts)
 * importieren von hier — nirgendwo sonst im Code dürfen diese Werte dupliziert
 * werden.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { IhkGrade, Specialty } from '../types/index.js';

// ─── Operatoren ───────────────────────────────────────────────────────────────
// MD §6.2: "nennen < beschreiben < erklären < erläutern" — explizit in JEDEM
// ZPA-Lösungsbogen (MD §6.1, wortgleiches Korrekturhinweis-Zitat).
//
// MD-belegt: nennen, beschreiben, erklären, erläutern, berechnen.
// Extrapolation (nicht im MD-Zitat, aber aus Aufgabenformulierungen abgeleitet —
// z.B. "Vergleichen Sie ..." MD §5.1 S25 T1 Aufg.4, "Identifizieren Sie den Fehler"
// MD §5.2 W22/23 T2): entwerfen, vergleichen, identifizieren.

export const OPERATORS = [
  'nennen',
  'beschreiben',
  'erklaeren',
  'erlaeutern',
  'berechnen',
  'entwerfen',
  'vergleichen',
  'identifizieren',
] as const;

export type Operator = (typeof OPERATORS)[number];

/** Ist dieser Operator im MD direkt belegt (vs. aus Formulierungen abgeleitet)? */
export function isOperatorMdBacked(op: Operator): boolean {
  return ['nennen', 'beschreiben', 'erklaeren', 'erlaeutern', 'berechnen'].includes(op);
}

/**
 * Erwartungsniveau je Operator — wird vom Prüfer-Prompt (aiService) als
 * Bewertungsmaßstab verwendet. Formulierungen angelehnt an ZPA-Lösungsbögen.
 */
export const OPERATOR_GUIDANCE: Record<Operator, string> = {
  nennen:
    'NENNEN: Stichworte und kurze Begriffe reichen. Keine Begründung, kein ganzer Satz nötig. Volle Punkte, wenn die geforderte Anzahl korrekt benannt ist.',
  beschreiben:
    'BESCHREIBEN: 2–3 Sätze, Sachverhalt in eigenen Worten wiedergeben. Keine Wertung oder Begründung nötig — nur sachliche Darstellung.',
  erklaeren:
    'ERKLÄREN: 3–5 Sätze mit Begründung/Hintergrund. Der Prüfling soll zeigen, dass er die Ursachen und Zusammenhänge verstanden hat.',
  erlaeutern:
    'ERLÄUTERN: 3–5 Sätze mit Begründung und konkretem Bezug. Ähnlich wie "erklären", aber mit Beispiel/Kontext-Bezug.',
  berechnen:
    'BERECHNEN: Rechenweg UND Endergebnis mit Einheit. Folgefehler nur einmal abziehen — wenn der Weg ab einem falschen Zwischenergebnis korrekt weitergeht, Teilpunkte geben.',
  entwerfen:
    'ENTWERFEN: konkrete Umsetzung (Code, Diagramm, Tabellenstruktur, Formular). Sinngemäße Varianten zulassen, solange die fachlichen Anforderungen erfüllt sind.',
  vergleichen:
    'VERGLEICHEN: klare Gegenüberstellung entlang nachvollziehbarer Kriterien. Je Kriterium Teilpunkte; unvollständige Vergleiche entsprechend anteilig werten.',
  identifizieren:
    'IDENTIFIZIEREN: Fehler, Elemente oder Zusammenhänge benennen. Teilpunkte je korrekt identifiziertem Element, keine Begründung zwingend (außer explizit gefordert).',
};

// ─── Notenschema ─────────────────────────────────────────────────────────────
// MD §6.1: IHK-Schema ist in den ZPA-Lösungsbögen verankert. Die Grenzen sind
// in echten Prüfungen (§5.3 Aufgaben-Lösungsliste) implizit verwendet.

export interface GradeBand {
  grade: IhkGrade;
  minPercent: number;
  label: string;
}

export const IHK_GRADE_BANDS: GradeBand[] = [
  { grade: 'sehr_gut', minPercent: 92, label: 'sehr gut (1)' },
  { grade: 'gut', minPercent: 81, label: 'gut (2)' },
  { grade: 'befriedigend', minPercent: 67, label: 'befriedigend (3)' },
  { grade: 'ausreichend', minPercent: 50, label: 'ausreichend (4)' },
  { grade: 'mangelhaft', minPercent: 30, label: 'mangelhaft (5)' },
  { grade: 'ungenuegend', minPercent: 0, label: 'ungenügend (6)' },
];

export function deriveIhkGrade(percent: number): IhkGrade {
  for (const band of IHK_GRADE_BANDS) {
    if (percent >= band.minPercent) return band.grade;
  }
  return 'ungenuegend';
}

/** Pflichtblock für LLM-Prompts: das Notenschema wortgleich präsentieren. */
export function gradeSchemaPromptBlock(): string {
  const lines = IHK_GRADE_BANDS.map((band, i) => {
    const next = IHK_GRADE_BANDS[i - 1];
    const upper = next ? next.minPercent - 1 : 100;
    return `- ${band.minPercent}–${upper} % → ${band.grade}`;
  }).join('\n');
  return `IHK-NOTENSCHEMA (Pflichtanwendung):\n${lines}`;
}

// ─── Prüfungsteile ───────────────────────────────────────────────────────────
// MD §4: AO 2020 (ab W2021/22). Alte AO (bis S2021) hatte 5 Handlungsschritte
// mit Wahl. Code generiert ausschließlich AO-2020-Format.

export const PART_DESCRIPTIONS: Record<'teil_1' | 'teil_2' | 'teil_3', string> = {
  teil_1:
    'Planen eines Softwareproduktes (Anforderungsanalyse, Projektplanung, UML-Modellierung, Qualitätssicherung)',
  teil_2:
    'Entwicklung und Umsetzung von Softwarealgorithmen (Programmierung, Datenbanken, Pseudocode, Komplexität)',
  teil_3: 'Wirtschafts- und Sozialkunde (Arbeitsrecht, Ausbildungsrecht, Wirtschaft, Soziales)',
};

/** Ausbildungsberufs-Labels für Prompts. */
export const SPECIALTY_LABELS: Record<Specialty, string> = {
  fiae: 'FIAE',
  fisi: 'FISI',
};

// ─── AP2-Struktur-Konstanten ─────────────────────────────────────────────────
// MD §2 + §5.1/5.2: Jede AP2-Prüfung hat 4 Aufgaben, Gesamtpunktzahl 100.

/** Pflicht-Aufgabenzahl pro Teil (MD §2: "4 Aufgaben à 20–30 Punkten, Gesamt 100"). */
export const TASKS_PER_PART = 4;

/** Gesamtpunktzahl einer AP2-Prüfung (MD §2). */
export const TOTAL_POINTS_PER_PART = 100;

/** Erwarteter Punkteumfang einer einzelnen Aufgabe (MD §2). */
export const POINTS_PER_TASK_RANGE: readonly [number, number] = [20, 30];

// ─── Diagramm-Labels ─────────────────────────────────────────────────────────
// Wird vom Prüfer-Prompt (aiService.ts analyzeDiagram) als deutsches Label
// verwendet — genau so wie es in echten ZPA-Aufgaben steht (MD §5.1/5.2).

export const DIAGRAM_TYPE_LABELS: Record<
  'uml_class' | 'uml_sequence' | 'uml_use_case' | 'uml_activity' | 'uml_state' | 'er',
  string
> = {
  uml_class: 'UML-Klassendiagramm',
  uml_sequence: 'UML-Sequenzdiagramm',
  uml_use_case: 'UML-Use-Case-Diagramm',
  uml_activity: 'UML-Aktivitätsdiagramm',
  uml_state: 'UML-Zustandsdiagramm',
  er: 'Entity-Relationship-Diagramm',
};

// ─── ACID-Eigenschaften ──────────────────────────────────────────────────────
// MD §5.2 W23/24 Aufg.3 belegt die englischen Bezeichner explizit als
// Aufgaben-Kanon ("ACID: Atomicity, Consistency, Isolation, Durability je 2 Pkt.").
// Zentralisiert, damit Rezepte die Werte importieren statt sie zu duplizieren.

export const ACID_PROPERTIES = ['Atomicity', 'Consistency', 'Isolation', 'Durability'] as const;

// ─── Sozialversicherungs-Beitragssätze (Stand 2026) ──────────────────────────
// Quelle: Deutsche Rentenversicherung, Techniker Krankenkasse, AOK (Jan 2026).
// MD §5.3 verwendet in Lohn-/SV-Beispielen konkrete Zahlen (244,80 EUR etc.),
// belegt aber keine Beitragssätze selbst. Diese Konstanten werden vom WiSo-
// SV-Berechnungs-Rezept (teil3.ts t3_calc_mc5) an den Generator übergeben,
// damit die erzeugten Aufgaben und Musterlösungen aktuelle Zahlen nutzen
// statt LLM-Halluzinationen aus dem Trainings-Wissen.
//
// WICHTIG: Bei Jahreswechsel prüfen! Die Sätze ändern sich im 1–2-Jahres-Rhythmus.

export interface SVBeitragssatz {
  /** Gesamtbeitragssatz in Prozent. */
  gesamt: number;
  /** Arbeitnehmer-Anteil in Prozent. */
  arbeitnehmer: number;
}

export const SV_BEITRAGSSAETZE_2026 = {
  stand: '2026',
  krankenversicherung: { gesamt: 14.6, arbeitnehmer: 7.3 },
  /** Durchschnittlicher Zusatzbeitrag KV — kassen-individuell. */
  krankenversicherungZusatzbeitrag: { gesamt: 2.9, arbeitnehmer: 1.45 },
  rentenversicherung: { gesamt: 18.6, arbeitnehmer: 9.3 },
  arbeitslosenversicherung: { gesamt: 2.6, arbeitnehmer: 1.3 },
  /** Pflegeversicherung (Standard; Sachsen abweichend, Kinderlosen-Zuschlag +0,6%). */
  pflegeversicherung: { gesamt: 3.6, arbeitnehmer: 1.8 },
  /** Beitragsbemessungsgrenze KV/PV (monatlich, in Euro). */
  bemessungsgrenzeKvPv: 5812.5,
  /** Beitragsbemessungsgrenze RV/AV (monatlich, in Euro). */
  bemessungsgrenzeRvAv: 8450,
} as const satisfies {
  stand: string;
  [key: string]: SVBeitragssatz | string | number;
};

/** Kurzformatierter Hinweisblock für LLM-Prompts. */
export function svBeitragssaetzePromptBlock(): string {
  const s = SV_BEITRAGSSAETZE_2026;
  return `SV-BEITRAGSSÄTZE (Stand ${s.stand}, verpflichtend für Aufgaben und Musterlösungen):
- Krankenversicherung: ${s.krankenversicherung.gesamt}% (AN ${s.krankenversicherung.arbeitnehmer}%), Zusatzbeitrag Ø ${s.krankenversicherungZusatzbeitrag.gesamt}% (AN ${s.krankenversicherungZusatzbeitrag.arbeitnehmer}%)
- Rentenversicherung: ${s.rentenversicherung.gesamt}% (AN ${s.rentenversicherung.arbeitnehmer}%)
- Arbeitslosenversicherung: ${s.arbeitslosenversicherung.gesamt}% (AN ${s.arbeitslosenversicherung.arbeitnehmer}%)
- Pflegeversicherung: ${s.pflegeversicherung.gesamt}% (AN ${s.pflegeversicherung.arbeitnehmer}%), Sachsen abweichend, Kinderlosenzuschlag +0,6% auf AN-Anteil
- Bemessungsgrenze KV/PV: ${s.bemessungsgrenzeKvPv} EUR/Monat, RV/AV: ${s.bemessungsgrenzeRvAv} EUR/Monat`;
}

// ─── MC-Option-Formate ───────────────────────────────────────────────────────
// MD §5.3: WiSo verwendet 5 Optionen mit Ziffern 1–5 (NICHT A–D).
// Teil 1/2 verwendet 4 Optionen A–D.
// ACHTUNG: Die 4er-Buchstabenform für Teil 1/2 ist NICHT MD-belegt. MD §5.1/§5.2
// enthält praktisch keine echten MC-Aufgaben im Teil 1/2 — die Konvention stammt
// aus der Code-Historie / Frontend-Erwartung. Bei Änderung Frontend prüfen.

export const MC_OPTION_IDS_TEIL12 = ['A', 'B', 'C', 'D'] as const;
export const MC_OPTION_IDS_WISO = ['1', '2', '3', '4', '5'] as const;

export type McContext = 'teil12' | 'wiso';

/**
 * Liefert die zulässigen Option-IDs für den gegebenen Kontext.
 * WiSo-Rezepte müssen 'wiso' setzen — Schema-Builder + Validatoren nutzen dieses
 * Format statt dem Teil-1/2-Default.
 */
export function mcOptionIds(context: McContext): readonly string[] {
  return context === 'wiso' ? MC_OPTION_IDS_WISO : MC_OPTION_IDS_TEIL12;
}

/** Formatiert die IDs für LLM-Prompts. */
export function formatMcIdList(context: McContext): string {
  return mcOptionIds(context)
    .map((id) => `"${id}"`)
    .join(',');
}

// ─── Placeholder-Tokens ──────────────────────────────────────────────────────
// MD §5.1 durchgehend: Aufgaben beziehen sich auf EINE Firma pro Prüfungsterm.
// Codebase löst das über Platzhalter, die nach Pool-Ziehen ersetzt werden
// (scenarios.ts). Die hier definierten Tokens sind die einzigen zulässigen.

export const PLACEHOLDERS = {
  company: '{{UNTERNEHMEN}}',
  industry: '{{BRANCHE}}',
  product: '{{PRODUKT}}',
  employees: '{{MITARBEITER}}',
} as const;

export const PLACEHOLDER_TOKEN_REGEX = /\{\{[A-Z_]+\}\}/g;

/** Entfernt unaufgelöste Platzhalter aus Text (für Prüfer-Prompts). */
export function stripPlaceholders(text: string): string {
  return text.replace(PLACEHOLDER_TOKEN_REGEX, '');
}
