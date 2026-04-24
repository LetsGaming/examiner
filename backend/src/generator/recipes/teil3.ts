/**
 * recipes/teil3.ts — Aufgaben-Rezepte für AP2 Teil 3 "Wirtschafts- und Sozialkunde".
 *
 * AUFGABENFORMATE (aus OCR-Analyse echter WiSo-Prüfungen, MD §5.3):
 *  - Single-Choice mit 5 Optionen (Ziffern 1–5, NICHT A–D)
 *  - Multi-Choice mit 5 Optionen, IMMER genau 2 korrekt
 *  - Kurzrechnung: Lohn, SV-Beiträge, Urlaubstage — Rechenweg + Zahl + Einheit
 *  - Lückentext / "Nennen Sie" (Stichworte, niemals "Begründen Sie")
 *
 * THEMEN (Häufigkeit in echten Prüfungen, MD §5.3 Aufgaben-Matrix):
 *  AGG (jede Prüfung!), Betriebsrat §7-9, BBiG, Probezeit, JArbSchG, KSchG,
 *  Sozialversicherung, Tarifvertrag, Gesellschaftsformen, Prokura, EK-Rentabilität,
 *  DSGVO, Mutterschutz, ArbZG, BUrlG.
 *
 * NIEMALS in WiSo: "Begründen Sie Ihre Auswahl", "Erläutern Sie Ihren Ansatz",
 *                  offene Vergleichsaufgaben, UML, SQL, Pseudocode.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { svBeitragssaetzePromptBlock } from '../../domain/taxonomy.js';
import type { TaskRecipe } from '../types.js';

export const RECIPES_TEIL3: TaskRecipe[] = [
  // Muster 1: Single-Choice (5 Optionen) + Single-Choice (5 Optionen)
  // Häufigstes Format in echten WiSo-Prüfungen — ca. 40% aller Aufgaben
  {
    id: 't3_mc5_mc5',
    weight: 35,
    subtasks: [
      {
        taskType: 'mc',
        prompt: `Erstelle eine IHK-WiSo-Single-Choice-Aufgabe mit GENAU 5 Optionen (Ziffern 1–5, nicht A–D).
Aufgabentext: Konkrete Situation aus dem Ausbildungs-/Arbeitsrecht oder Wirtschaftslehre.
Formulierung: "Welche der folgenden Aussagen ist zutreffend?" oder "Welcher der folgenden Sachverhalte trifft zu?"
Korrekte Antwort: genau EINE der 5 Optionen. Variiere die Position (nicht immer Option 1).
Alle 5 Optionen plausibel formuliert, Distraktoren fachlich korrekt klingend aber falsch.
Themen: BBiG, Ausbildungsvertrag, Probezeit, Kündigung, Sozialversicherung, Tarifvertrag, Betriebsrat, Gesellschaftsformen.
Die Antwort-IDs in mcOptions müssen "1","2","3","4","5" sein (keine A–D).`,
        points: 4,
        operator: 'identifizieren',
        gradingHint:
          'Binär: richtig = volle Punkte, falsch = 0. Keine Teilpunkte bei Single-Choice.',
      },
      {
        taskType: 'mc',
        prompt: `Erstelle eine zweite IHK-WiSo-Single-Choice-Aufgabe mit GENAU 5 Optionen (Ziffern 1–5).
Anderes Thema als die erste Aufgabe dieser Prüfung.
Themen: Urlaub (BUrlG), Arbeitszeit (ArbZG/JarbSchG), Kaufvertrag, Verbraucherschutz, Datenschutz (DSGVO), GmbH/AG-Unterschiede, Wirtschaftlichkeitsrechnung.
Korrekte Antwort: genau EINE. Variiere Position.
Die Antwort-IDs in mcOptions müssen "1","2","3","4","5" sein.`,
        points: 4,
        operator: 'identifizieren',
        gradingHint: 'Binär.',
      },
    ],
  },

  // Muster 2: Multi-Choice (5 Opt., genau 2 korrekt) + Short-Calc oder Lückentext
  // Zweithäufigstes Format — ca. 30% aller Aufgaben
  {
    id: 't3_mc5multi_calc',
    weight: 30,
    subtasks: [
      {
        taskType: 'mc_multi',
        prompt: `Erstelle eine IHK-WiSo-Mehrfachauswahl-Aufgabe mit GENAU 5 Optionen (Ziffern 1–5).
Aufgabentext: Konkrete Situation (z.B. Auszug aus einem Gesetz oder Vertrag).
Formulierung: "Welche zwei der folgenden Aussagen sind zutreffend?" — IMMER genau 2 korrekt (nie 3, nie 1).
Distraktoren: 3 falsche Aussagen, die plausibel klingen.
Themen: BBiG §§, JArbSchG, Sozialversicherungsrecht, Tarifvertragsgesetz, Betriebsverfassungsgesetz, KSchG.
Die Antwort-IDs in mcOptions müssen "1","2","3","4","5" sein. correctOptions: genau 2 Ziffern-Strings.`,
        points: 5,
        operator: 'identifizieren',
        cascade: true,
        gradingHint:
          'Je korrekt markierter Option 50%, je falsch markierter Abzug (min. 0 Punkte gesamt).',
      },
      {
        taskType: 'freitext',
        prompt: `Erstelle eine kurze WiSo-Berechnungsaufgabe ODER eine Ergänzungsaufgabe (Lückentext / "Nennen Sie").
NIEMALS "Begründen Sie" oder "Erläutern Sie Ihre Auswahl" — das kommt in WiSo-Prüfungen nicht vor.
Erlaubte Formate:
  a) Rechenaufgabe: Bruttolohn → Nettolohn, SV-Beiträge berechnen, Urlaubstage/-geld, Abzüge.
     Konkrete Zahlen vorgeben. Antwort: Rechenweg + Ergebnis mit €-Zeichen.
  b) "Nennen Sie X Merkmale/Pflichten/Rechte von Y" (2–3 Stichworte genügen).
  c) Lückentext: 2–3 Begriffe aus dem Ausbildungs-/Arbeitsrecht eintragen.
Thema muss zum restlichen Aufgabenkontext passen.`,
        points: 5,
        operator: 'nennen',
        gradingHint:
          'Bei Rechnung: Rechenweg 50%, Ergebnis mit Einheit 50%. Bei "Nennen": je Stichpunkt 1/2 oder 1/3 der Punkte. Keine Abzüge für fehlende Begründung.',
      },
    ],
  },

  // Muster 3: Single-Choice (5) + Multi-Choice (5, genau 2 korrekt)
  {
    id: 't3_mc5_mc5multi',
    weight: 20,
    subtasks: [
      {
        taskType: 'mc',
        prompt: `IHK-WiSo-Single-Choice mit GENAU 5 Optionen (Ziffern 1–5, nicht A–D).
Themen: Ausbildungsrecht (BBiG), Sozialversicherung (5 Zweige + Beitragssätze), Tarifvertrag, Gesellschaftsformen.
Korrekte Antwort: genau 1. Variiere Position (nicht immer Ziffer 1).
IDs in mcOptions: "1","2","3","4","5".`,
        points: 4,
        operator: 'identifizieren',
        gradingHint: 'Binär.',
      },
      {
        taskType: 'mc_multi',
        prompt: `IHK-WiSo-Mehrfachauswahl mit GENAU 5 Optionen (Ziffern 1–5).
IMMER genau 2 korrekt (Formulierung: "zwei zutreffende Aussagen").
Thema muss sich von der ersten Unteraufgabe dieser Prüfung unterscheiden.
Themen: Arbeitszeit/Pausen (ArbZG), Urlaub (BUrlG), Berufsschule/Lernmittelfreiheit, Kaufvertragsrecht, DSGVO.
IDs in mcOptions: "1","2","3","4","5". correctOptions: genau 2 Ziffern-Strings.`,
        points: 6,
        operator: 'identifizieren',
        gradingHint: 'Je korrekt markierter Option 50%, Abzug für falsch markierte (min. 0).',
      },
    ],
  },

  // Muster 4: Reine Berechnungsaufgabe (Lohn/SV) + Single-Choice
  // Kommt in ca. jeder zweiten WiSo-Prüfung vor
  {
    id: 't3_calc_mc5',
    weight: 15,
    subtasks: [
      {
        taskType: 'freitext',
        prompt: `Erstelle eine WiSo-Lohn- oder SV-Berechnungsaufgabe wie in echten IHK-Prüfungen.
Konkrete Ausgangswerte vorgeben (Bruttogehalt, SV-Beitragssätze, Steuern etc.).
Typische Berechnungen:
  • Arbeitnehmer-Anteil zur Sozialversicherung (KV + PV + RV + AV + UV-Anteil)
  • Nettogehalt aus Brutto, Steuern und SV-Abzügen
  • Urlaubsentgelt: (Jahresgehalt / Arbeitstage) × Urlaubstage
  • Überstundenzuschlag
  • Ausbildungsvergütung nach Lehrjahr
Verpflichtend: echte Zahlenwerte (kein "X Euro"), Rechenweg in expectedAnswer angeben.
KEIN Freitext-Begründungsanteil.

${svBeitragssaetzePromptBlock()}`,
        points: 6,
        operator: 'berechnen',
        gradingHint:
          'Rechenweg vollständig 50%, Zwischenergebnisse korrekt 25%, Endergebnis mit Einheit 25%. Folgefehler nur einmal abziehen.',
      },
      {
        taskType: 'mc',
        prompt: `IHK-WiSo-Single-Choice mit GENAU 5 Optionen (Ziffern 1–5).
Thema ergänzt die Berechnungsaufgabe (z.B. nach SV-Berechnung: Frage zu Versicherungspflicht / Beitragsverteilung).
Korrekte Antwort: genau 1. IDs: "1","2","3","4","5".`,
        points: 4,
        operator: 'identifizieren',
        gradingHint: 'Binär.',
      },
    ],
  },
];
