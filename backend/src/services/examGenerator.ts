/**
 * examGenerator.ts — AI-gestützte IHK-AP2-Aufgabengenerierung.
 *
 * ## Neuer Flow (an realen AP2-Prüfungen 2019–2025 orientiert)
 *
 * Die Aufgaben werden szenario-frei in den Pool generiert. Der Unternehmens-
 * kontext kommt erst beim Prüfungsstart dazu, wenn die KI eine passende
 * Ausgangssituation für die gezogenen Aufgaben erstellt (siehe scenarios.ts).
 *
 * ## Echte AP2-Strukturen (aus 9 Prüfungen 2019–2025 analysiert)
 *
 * Eine AP2-Prüfung Teil 1/2 besteht immer aus:
 *   - 4 Aufgaben à 20–30 Punkten, Gesamt 100 Punkte
 *   - 2–6 Unteraufgaben pro Aufgabe (selten nur 2, typisch 3–4)
 *   - Labels oft kaskadiert: a, b, c oder a, ba, bb, c oder aa, ab, ac, b, c
 *   - Jede Unteraufgabe hat eigene Punktzahl
 *
 * Diese Varianz bildet die `TaskRecipe`-Struktur unten ab. Statt einer starren
 * typeA/typeB-Liste hat jedes Rezept ein Array von `SubtaskSpec`-Einträgen, die
 * dynamisch kaskadiert werden können.
 *
 * ## Punkteverteilung
 *
 * Echte IHK-Prüfungen geben granulare Bewertungshinweise ("je Entitätstyp 1P,
 * je Beziehung 2P"). Jedes Rezept enthält daher einen `gradingHint`, der an
 * den LLM-Prüfer weitergereicht wird — das macht die Bewertung fairer und
 * konsistenter.
 *
 * ## Operator-Dimensionen (IHK-Standard)
 *
 * Jede Lösung beginnt mit "Zu beachten ist die unterschiedliche Dimension
 * der Aufgabenstellung (nennen – erklären – beschreiben – erläutern usw.)."
 * Diese Skala wird im Bewertungsprompt explizit gemacht (siehe aiService.ts).
 */
import type { ExamPart, TaskType, DiagramType, TableConfig, Specialty } from '../types/index.js';
import { callAiProvider } from './aiService.js';
import type { ProviderMeta } from '../routes/settingsRoutes.js';
import { getTopics } from './topics.js';
// Re-Export für Kompatibilität mit bestehenden Routen
export {
  SCENARIOS,
  applyScenario,
  generateScenarioForTasks,
  pickRandomFallbackScenario,
} from './scenarios.js';
export type { Scenario } from './scenarios.js';

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface GeneratedSubTask {
  /** Label wie "a", "b", "ba", "bb", "c" — wird vom Generator automatisch vergeben. */
  label: string;
  taskType: TaskType;
  questionText: string;
  points: number;
  diagramType?: DiagramType;
  expectedElements?: string[];
  mcOptions?: { id: string; text: string }[];
  tableConfig?: TableConfig;
  expectedAnswer: Record<string, unknown>;
}

export interface GeneratedTask {
  topicArea: string;
  pointsValue: number;
  difficulty: 'easy' | 'medium' | 'hard';
  subtasks: GeneratedSubTask[];
}

// ─── Subtask-Spezifikation ───────────────────────────────────────────────────
// Beschreibt, wie eine einzelne Unteraufgabe aussehen soll. Rezepte setzen
// diese Spezifikationen in Ketten zusammen und der Generator baut daraus das
// LLM-Prompt.

interface SubtaskSpec {
  taskType: TaskType;
  prompt: string;
  /** Punkte — kann Einzelwert oder Bereich [min, max] sein. Bei Bereich würfelt
   *  der Generator einen konkreten Wert, um die reale IHK-Varianz abzubilden. */
  points: number | [number, number];
  /** Operator-Dimension: bestimmt mit, wie streng die KI bewertet. */
  operator?:
    | 'nennen'
    | 'beschreiben'
    | 'erklaeren'
    | 'erlaeutern'
    | 'berechnen'
    | 'entwerfen'
    | 'vergleichen'
    | 'identifizieren';
  /** Bewertungshinweis für den LLM-Prüfer — wird in expectedAnswer.gradingHint kopiert. */
  gradingHint?: string;
  /** Nur für taskType === "table". */
  tableColumns?: string[];
  tableRowCount?: number;
  fixedFirstColumn?: boolean;
  fixedFirstColumnValues?: string[];
  tableKind?: 'flexible' | 'guided' | 'fixed';
  tableDescription?: string;
  /** Nur für taskType === "plantuml"/"diagram_upload". */
  diagramType?: DiagramType;
  /** Wenn true: das Subtask-Label wird kaskadiert (z.B. "ba","bb") statt linear ("b","c").
   *  Der Generator gruppiert fortlaufende Subtasks mit `cascade: true` unter demselben
   *  Haupt-Label und hängt "a","b",… als Suffix an. */
  cascade?: boolean;
}

// ─── Task-Rezept ─────────────────────────────────────────────────────────────
// Ein Rezept beschreibt eine komplette Aufgabe: Subtasks in Reihenfolge +
// Gewicht für die Auswahl + optionale Begrenzung, welche Themen passen.

interface TaskRecipe {
  /** Eindeutige Kennung, nur für Logging/Debugging. */
  id: string;
  /** Relative Häufigkeit in der Auswahl. */
  weight: number;
  /** Subtasks in der Reihenfolge, in der sie erscheinen sollen. */
  subtasks: SubtaskSpec[];
  /** Optionale Filter: Rezept passt nur zu diesen Themen (Substring-Match). */
  topicKeywords?: string[];
  /** Wenn true: Rezept nicht verwenden, wenn bereits UML/Zustandsdiagramm in dieser Charge. */
  containsDiagram?: boolean;
}

// ─── TEIL 1 REZEPTE ──────────────────────────────────────────────────────────
// Alle Rezepte sind an realen AP2-Prüfungen 2019–2025 nachempfunden. Die
// kaskadierte Label-Struktur (aa/ab/ac, ba/bb) entspricht dem echten
// IHK-Muster.

const RECIPES_TEIL1: TaskRecipe[] = [
  // Klassisches 3-Subtask-Muster: a) Konzept erläutern, b) Konkretisierung, c) Vergleich
  {
    id: 't1_konzept_3',
    weight: 10,
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie das Konzept im Kontext von {{UNTERNEHMEN}} in 3–4 Sätzen.',
        points: [6, 8],
        operator: 'erlaeutern',
        gradingHint:
          'Erläuterung: Kernidee korrekt + mindestens ein Begründungsaspekt im Unternehmenskontext.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie 3 konkrete Beispiele oder Ausprägungen und beschreiben Sie diese jeweils kurz (1–2 Sätze).',
        points: [9, 12],
        operator: 'beschreiben',
        gradingHint:
          'Je korrektem Beispiel mit Kurzbeschreibung 1/3 der Punkte. Sinngemäße Bezüge reichen.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie einen Vor- und einen Nachteil des beschriebenen Vorgehens.',
        points: [4, 6],
        operator: 'nennen',
        gradingHint: 'Je Vor- oder Nachteil die Hälfte der Punkte. Stichworte reichen.',
      },
    ],
  },

  // Stakeholder-Tabelle mit Vertiefung — sehr IHK-typisch (W22/23, S25)
  {
    id: 't1_stakeholder',
    weight: 8,
    topicKeywords: ['Stakeholder', 'Anforderung', 'Projekt'],
    subtasks: [
      {
        taskType: 'table',
        prompt:
          'Nennen Sie 3 Stakeholder des Projekts und beschreiben Sie je Stakeholder eine Erwartung und eine Befürchtung.',
        points: [9, 12],
        operator: 'beschreiben',
        tableColumns: ['Stakeholder', 'Erwartung', 'Befürchtung'],
        tableRowCount: 3,
        tableKind: 'guided',
        tableDescription:
          'Stakeholder-Tabelle: je Zeile 1 konkreter Stakeholder (Rolle oder Person) mit 1 Erwartung und 1 Befürchtung. Alle Einträge beziehen sich auf das konkrete Projekt bei {{UNTERNEHMEN}}.',
        gradingHint:
          'Je Zeile bis zu 4 Punkte: 1P Stakeholder, 2P Erwartung, 2P Befürchtung. Alternative Stakeholder mit plausibler Begründung auch korrekt.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, wie Sie mit einem Stakeholder mit geringem Einfluss aber hohem Interesse umgehen.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Ein plausibler Umgangsansatz (z.B. regelmäßige Information) reicht für volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, warum eine frühzeitige Stakeholder-Analyse wichtig ist.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Zwei plausible Begründungen (Risikominimierung, frühes Feedback, ...) → volle Punkte.',
      },
    ],
  },

  // Umfeldanalyse (technisch + rechtlich) — S25 Aufgabe 1a
  {
    id: 't1_umfeldanalyse',
    weight: 5,
    topicKeywords: ['Umfeld', 'Anforderung'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie je einen Aspekt Ihrer Umfeldanalyse aus den Bereichen „technisches Umfeld" und „rechtliches Umfeld" für das Projekt bei {{UNTERNEHMEN}}.',
        points: [6, 8],
        operator: 'erlaeutern',
        gradingHint:
          'Je Bereich 1 passender Aspekt + Erläuterung = halbe Punkte. Beispiele: technisch → bestehende Hardware/Netzwerk; rechtlich → DSGVO, Datenschutz.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 3 funktionale und 3 nicht-funktionale Anforderungen an das Projekt.',
        points: [10, 14],
        operator: 'nennen',
        gradingHint:
          'Je Anforderung 1/6 der Punkte. Keine scharfe Trennung verlangen, sinngemäß korrekte Zuordnung reicht.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie kurz, welche Aufgaben zur Vorbereitung des Projektabschluss-Protokolls durchzuführen sind.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Soll-Ist-Vergleich + Folgemaßnahmen identifizieren = volle Punkte. Auch "Lessons Learned" zulässig.',
      },
    ],
  },

  // User Stories + INVEST (kaskadiert aa, ab, ac, b) — W23/24 Aufgabe 2
  {
    id: 't1_user_stories',
    weight: 6,
    topicKeywords: ['User Story', 'INVEST', 'Anforderung'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie die Rolle, die typischerweise User Stories schreibt.',
        points: 1,
        operator: 'nennen',
        cascade: true,
        gradingHint: 'Product Owner / Produktverantwortlicher / Teammitglied = korrekt.',
      },
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie den typischen Aufbau einer User Story.',
        points: 3,
        operator: 'beschreiben',
        cascade: true,
        gradingHint:
          'Als <Rolle> möchte ich <Ziel>, damit <Nutzen>. Drei Bestandteile = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie die 6 Buchstaben der INVEST-Regel in je einem Satz.',
        points: 6,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'Je Buchstabe 1 Punkt: Independent / Negotiable / Valuable / Estimable / Small / Testable.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Formulieren Sie 2 User Stories für eine zentrale Funktion des Projekts bei {{UNTERNEHMEN}}.',
        points: [6, 8],
        operator: 'entwerfen',
        gradingHint: 'Je Story mit allen 3 Bestandteilen (Rolle, Ziel, Nutzen) = halbe Punkte.',
      },
    ],
  },

  // Vergleich (Wasserfall vs. Scrum, NoSQL vs. SQL, usw.) + Entscheidung (S22 T1 Muster)
  {
    id: 't1_vergleich',
    weight: 7,
    topicKeywords: [
      'Vergleich',
      'Vorgehensmodell',
      'Scrum',
      'Wasserfall',
      'NoSQL',
      'Datenbank',
      'agil',
      'klassisch',
    ],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein konkreter Entscheidungskontext bei {{UNTERNEHMEN}} beschrieben. Erläutern Sie die wesentlichen Unterschiede zwischen den beiden verglichenen Konzepten (z.B. klassisch vs. agil, SQL vs. NoSQL). Beziehen Sie sich dabei auf die im questionText genannte Ausgangssituation.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Mindestens 2 konkrete Unterschiede + Bezug zur beschriebenen Situation = volle Punkte.',
      },
      {
        taskType: 'table',
        prompt:
          'Füllen Sie die Vergleichstabelle aus. Die konkreten Vergleichsmerkmale in der ersten Spalte müssen im questionText angegeben sein — z.B. „Planbarkeit", „Flexibilität bei Änderungen", „Eignung für verteilte Teams", „Dokumentationsaufwand".',
        points: [10, 14],
        operator: 'vergleichen',
        tableColumns: ['Vergleichsmerkmal', '[Konzept A]', '[Konzept B]'],
        tableRowCount: 4,
        fixedFirstColumn: true,
        tableKind: 'flexible',
        tableDescription:
          'Vergleichstabelle: erste Spalte enthält 4 konkrete projektrelevante Vergleichsmerkmale, Spalten 2 und 3 tragen die echten Konzeptnamen (z.B. "Scrum" / "Wasserfallmodell" statt "Option A/B"). Jede Zeile bewertet ein Merkmal für beide Konzepte.',
        gradingHint:
          'Je Zeile je Konzept 1P wenn inhaltlich korrekt und projektbezogen. Synonyme und begründete Alternativen akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Entscheiden Sie sich begründet für eines der beiden Konzepte für das konkrete Projekt bei {{UNTERNEHMEN}}. Nennen Sie mindestens 2 projektspezifische Gründe.',
        points: [4, 6],
        operator: 'entwerfen',
        gradingHint:
          '1P für klare Entscheidung + restliche Punkte für mindestens 2 projektspezifische Begründungen. Beide Optionen zulässig bei schlüssiger Argumentation.',
      },
    ],
  },

  // UML-Aktivitätsdiagramm (S25 T1 Aufg. 3-Muster: Bullet-Prozess + Optimierungstabelle)
  {
    id: 't1_uml_aktivitaet',
    weight: 7,
    containsDiagram: true,
    topicKeywords: ['Aktivität', 'Aktivitätsdiagramm', 'UML', 'Ablauf'],
    subtasks: [
      {
        taskType: 'plantuml',
        // questionText muss: Bullet-Point-Prozessbeschreibung mit Verzweigungen und Swimlanes enthalten
        prompt:
          'Im questionText ist ein Geschäftsprozess als Bullet-Point-Liste mit Verzweigungen beschrieben und die beteiligten Rollen für Swimlanes angegeben. Erstellen Sie das UML-Aktivitätsdiagramm mit: Startknoten, allen Aktivitäten, Entscheidungsknoten (Rauten) mit Bedingungen, Synchronisierungsbalken bei parallelen Abläufen, Swimlanes für die beteiligten Rollen, und Endknoten.',
        points: [13, 17],
        operator: 'entwerfen',
        diagramType: 'uml_activity',
        gradingHint:
          'Je Aktivität 1P (max. Gesamtzahl), je Entscheidung/Verzweigung mit Bedingung 2P, Synchronisierungsbalken 2P, Start+Ende vorhanden 2P, Swimlanes korrekt zugeordnet 2P. Alternative Darstellungen akzeptieren.',
      },
      {
        taskType: 'table',
        prompt:
          'Im questionText sind potenzielle Schwachstellen des Prozesses beschrieben. Tragen Sie für 3 Probleme eine Erläuterung und einen konkreten Lösungsansatz durch Digitalisierung ein.',
        points: [9, 12],
        operator: 'erlaeutern',
        tableColumns: ['Problem', 'Erläuterung', 'Lösungsansatz durch Digitalisierung'],
        tableRowCount: 3,
        tableKind: 'guided',
        tableDescription:
          'Prozessoptimierungs-Tabelle: je Zeile 1 konkretes Problem aus dem Prozess + Erläuterung warum es ein Problem ist + konkreter digitaler Lösungsansatz.',
        gradingHint:
          'Je Zeile: Problem korrekt identifiziert 1P + Erläuterung plausibel 2P + Lösungsansatz konkret und digital 3P. Insgesamt 3×2P+3×3P möglich.',
      },
    ],
  },

  // ER-Modell-Aufgabe (S25 T1 Aufg. 2-Muster: aufzählende Anforderungsliste + Vervollständigen)
  {
    id: 't1_er_modell',
    weight: 7,
    containsDiagram: true,
    topicKeywords: ['ER', 'Datenmodell', 'Relational', 'Datenbank'],
    subtasks: [
      {
        taskType: 'plantuml',
        // questionText muss: aufzählende Anforderungsliste + Hinweis auf bereits gegebene Entität enthalten
        prompt:
          'Im questionText sind die Anforderungen als Bullet-Point-Liste gegeben. Ein Entitätstyp ist bereits vorgegeben. Vervollständigen Sie das ER-Diagramm: Ergänzen Sie alle fehlenden Entitätstypen, Attribute (inkl. Primärschlüssel), Beziehungen und Kardinalitäten. Bei m:n-Beziehungen mit eigenen Attributen: diese Attribute an der Beziehung angeben.',
        points: [14, 18],
        operator: 'entwerfen',
        diagramType: 'er',
        gradingHint:
          'Je Entitätstyp 1P, je Primärschlüssel 0,5P, je Attribut 0,5P (max. 3P Attribute), je Beziehung mit korrekter Kardinalität 2P, Beziehungsattribute an m:n 1P je Attribut.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Überführen Sie eine der m:n-Beziehungen in ein relationales Modell. Geben Sie die Tabellenstruktur mit Primärschlüsseln (PK) und Fremdschlüsseln (FK) an.',
        points: [5, 8],
        operator: 'entwerfen',
        gradingHint:
          'Zwischentabelle mit korrektem Namen 1P, PK der Zwischentabelle korrekt 2P, FK zu beiden Ausgangstabellen je 1P, Beziehungsattribute in Zwischentabelle 1P.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie für 3 Attribute Ihrer Wahl den passenden SQL-Datentyp und begründen Sie die Wahl kurz.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint:
          'Je Attribut mit korrektem Datentyp + Kurzbegründung 1/3 der Punkte. Synonyme (VARCHAR/String) akzeptieren.',
      },
    ],
  },

  // UI-Darstellungsform + Mockup (S25 T1 Aufg. 2b-Muster + W23/24 Aufg. 4b-Muster)
  {
    id: 't1_ui_darstellung',
    weight: 6,
    topicKeywords: ['UI', 'Darstellung', 'Mockup', 'Oberfläche', 'User Interface'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein konkreter Anwendungsfall (z.B. Dateneingabe oder Übersichtsansicht) für {{UNTERNEHMEN}} beschrieben. Benennen Sie zwei geeignete Darstellungsformen für diesen Anwendungsfall.',
        points: [2, 3],
        operator: 'nennen',
        cascade: true,
        gradingHint:
          'Je Darstellungsform 1P: Liste, Tabelle, Kachel/Grid, Karte, Formular — alle sinnvollen Varianten akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Entscheiden Sie sich für eine der genannten Darstellungsformen und begründen Sie Ihre Wahl im Kontext des beschriebenen Anwendungsfalls.',
        points: [2, 3],
        operator: 'entwerfen',
        cascade: true,
        gradingHint:
          '1P Entscheidung klar benannt + 1–2P Begründung projektbezogen. Beide Optionen zulässig, solange Begründung trägt.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Skizzieren Sie ein Mockup Ihrer gewählten Darstellungsform. Das Mockup muss mindestens enthalten: Überschrift, alle geforderten Eingabefelder oder Anzeigeelemente mit Beschriftung, ein Auswahlfeld (Dropdown/Combobox) wo sinnvoll, sowie Aktionsbuttons (z.B. Speichern/Abbrechen).',
        points: [8, 12],
        operator: 'entwerfen',
        gradingHint:
          '1P Überschrift / 2P Eingabefelder mit Beschriftung / 1P Auswahlfeld (Dropdown o.ä.) / 2P Aktionsbuttons / 1P sinnvolle Anordnung. Alternative Darstellungen vollständig werten.',
      },
    ],
  },

  // Testkonzept
  {
    id: 't1_testkonzept',
    weight: 5,
    topicKeywords: ['Test', 'Qualität', 'Abnahme'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie die Notwendigkeit eines Testkonzepts für das Projekt bei {{UNTERNEHMEN}}.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Zwei Begründungen (Fehler früh erkennen, Qualität sichern, ...) = volle Punkte.',
      },
      {
        taskType: 'table',
        prompt:
          'Füllen Sie die Tabelle aus: Nennen Sie 4 Teststufen mit Beschreibung und einem konkreten Beispiel aus dem Projekt.',
        points: [12, 16],
        operator: 'nennen',
        tableColumns: ['Teststufe', 'Beschreibung', 'Beispiel aus dem Projekt'],
        tableRowCount: 4,
        tableKind: 'guided',
        fixedFirstColumn: false,
        tableDescription:
          'Teststufen-Tabelle: Unit-Test, Integrationstest, Systemtest, Abnahmetest — je mit Kurzbeschreibung und projektkonkretem Beispiel.',
        gradingHint:
          'Je vollständige Zeile (Stufe + Beschreibung + Beispiel) 1/4 der Punkte. Bei fehlerhafter Zuordnung Teilpunkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie 3 weitere Inhalte, die in einem Testkonzept enthalten sein sollten.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint: 'Je Inhalt (Testumfang, Testdaten, Rollen, Zeitplan, ...) 1/3 der Punkte.',
      },
    ],
  },

  // Verschlüsselung (W22/23 Aufgabe 1d/e) — wichtig, weil IT-Sicherheit oft kommt
  {
    id: 't1_verschluesselung',
    weight: 4,
    topicKeywords: ['Verschlüsselung', 'TLS', 'Zertifikat', 'Sicherheit', 'CA'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen symmetrischer und asymmetrischer Verschlüsselung.',
        points: [5, 7],
        operator: 'erlaeutern',
        gradingHint:
          'Symm.: ein Schlüssel für beide Seiten. Asymm.: Public+Private-Key. Beide Aspekte = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie das Prinzip der hybriden Verschlüsselung am Beispiel des TLS-Handshakes und nennen Sie den Grund für den hybriden Ansatz.',
        points: [5, 7],
        operator: 'erlaeutern',
        gradingHint:
          'Asymm. zum Schlüsselaustausch + symm. für Nutzdaten + Performance-Grund. Kernidee = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, wie mithilfe einer lokalen Certificate Authority die Authentizität von Diensten sichergestellt werden kann.',
        points: [3, 4],
        operator: 'beschreiben',
        gradingHint:
          'CA signiert Zertifikate + Clients prüfen Signatur + Widerrufsprüfung = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie je einen Vor- und einen Nachteil einer zentralen Rechteverwaltung (Identity Provider / SSO).',
        points: [4, 6],
        operator: 'nennen',
        gradingHint:
          'Je Vor-/Nachteil halbe Punkte. Bsp. Vorteil: zentrale Übersicht. Nachteil: Single Point of Failure.',
      },
    ],
  },

  // CI/CD-Pipeline (W22/23 Aufgabe 1c)
  {
    id: 't1_ci_cd',
    weight: 4,
    topicKeywords: ['Continuous Integration', 'CI', 'Pipeline', 'Deployment', 'DevOps'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, was eine CI/CD-Pipeline ist und bei welchen Ereignissen sie typischerweise ausgelöst wird.',
        points: [3, 4],
        operator: 'beschreiben',
        gradingHint: 'Automatisierte Abfolge bei Commit/Tag/PR. Kernidee + Trigger = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie 4 Vorteile einer CI/CD-Pipeline für die Entwicklung bei {{UNTERNEHMEN}}.',
        points: [8, 10],
        operator: 'nennen',
        gradingHint:
          'Je Vorteil 1/4 der Punkte. Z.B. automatische Tests, einheitliche Deploys, Rollback, weniger manueller Zugriff.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie, wie ein Rollback bei einer defekten Deployment-Version aussehen kann.',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint:
          'Alte Pipeline erneut ausführen / vorherigen Container deployen / Git-Tag zurücksetzen = volle Punkte.',
      },
    ],
  },

  // OOP / Entwurfsmuster (S25 T1 Aufg. 4-Muster: englischer Beschreibungstext + Klassendiagramm ergänzen)
  {
    id: 't1_oop_entwurf',
    weight: 5,
    topicKeywords: [
      'OOP',
      'Entwurfsmuster',
      'Factory',
      'Singleton',
      'Observer',
      'abstrakt',
      'Interface',
    ],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein englischer Beschreibungstext eines Entwurfsmusters (aus einer Fachliteraturquelle) gegeben. Erläutern Sie anhand dieses Textes zwei Aspekte des Entwurfsmusters.',
        points: 6,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'Je Aspekt 3P: muss aus dem Text herleitbar sein und korrekt erläutert werden. Reine Paraphrase ohne Erläuterung: halbe Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist eine Einschränkung des Entwurfsmusters beschrieben. Erläutern Sie diese Einschränkung in eigenen Worten.',
        points: 3,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'Für Factory: gemeinsame Basisklasse/Interface notwendig. Kernaussage korrekt = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie drei Merkmale einer abstrakten Klasse im Vergleich zu gewöhnlichen Klassen und Interfaces.',
        points: 6,
        operator: 'erlaeutern',
        gradingHint:
          'Mind. 3 Merkmale: abstrakte Methoden zwingend / nicht instanziierbar / vollständig definierte Methoden erlaubt / Attribute erlaubt / mehrfache Vererbung nur bei Interfaces. Je Merkmal 2P.',
      },
      {
        taskType: 'plantuml',
        prompt:
          'Im questionText ist ein teilweise ausgefülltes Klassendiagramm mit dem Entwurfsmuster gegeben. Ergänzen Sie das Klassendiagramm um die fehlenden Klassen (Fabrik-Unterklasse und Produkt-Unterklasse) für den beschriebenen neuen Anwendungsfall.',
        points: 6,
        operator: 'entwerfen',
        diagramType: 'uml_class',
        gradingHint:
          '3P für korrekte Fabrik-Unterklasse (erbt von abstrakter Fabrik, überschreibt Fabrikmethode) + 3P für korrekte Produkt-Unterklasse (erbt von Produkt-Basisklasse).',
      },
    ],
  },

  // Berechnungsaufgabe Teil 1 (Kosten, Aufwand, Netzplan)
  {
    id: 't1_berechnung',
    weight: 4,
    topicKeywords: ['Netzplan', 'kritisch', 'Aufwand', 'Kosten'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText sind Projektvorgänge mit Dauern (in Tagen) und Vorgängerabhängigkeiten gegeben. Berechnen Sie den frühesten Anfangs- und Endzeitpunkt für alle Vorgänge sowie den Gesamtprojektendtermin. Zeigen Sie den Rechenweg und geben Sie das Ergebnis mit Einheit an.',
        points: [10, 15],
        operator: 'berechnen',
        gradingHint:
          'Rechenweg (Vorwärtsrechnung) 50% / korrektes Ergebnis je Vorgang 30% / Gesamtendtermin 20%. Bei Folgefehlern nur Ausgangsfehler abziehen.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Benennen Sie den kritischen Pfad und erläutern Sie, welchen Einfluss eine Verlängerung eines kritischen Vorgangs um einen Tag auf den Projektendtermin hat.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Kritischer Pfad korrekt benannt 2P + Erläuterung: direkte Verschiebung Endtermin um 1 Tag 2–4P.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie 2 Kostenfaktoren bei Softwareprojekten, die in der Praxis oft unterschätzt werden, und erläutern Sie jeweils kurz warum.',
        points: [4, 5],
        operator: 'nennen',
        gradingHint:
          'Je Kostenfaktor (Einarbeitung, Meetings, Testaufwand, Fehlerbehebung, Dokumentation, ...) 1P + Erläuterung 1P = 2P. Insgesamt 2 × 2P = 4P.',
      },
    ],
  },

  // Use-Case-Diagramm + User Stories (W23/24 T2 Aufg. 2-Muster)
  {
    id: 't1_usecases_userstories',
    weight: 6,
    topicKeywords: ['Use-Case', 'User Story', 'UseCase', 'Anwendungsfall'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein Use-Case-Diagramm mit mehreren Anwendungsfällen für {{PRODUKT}} bei {{UNTERNEHMEN}} beschrieben. Erstellen Sie für zwei der genannten Anwendungsfälle je eine User Story nach dem Connextra-Template: „Als <Rolle> möchte ich <Ziel>, damit <Nutzen>."',
        points: [6, 8],
        operator: 'entwerfen',
        gradingHint:
          'Je User Story 3–4P: Rolle korrekt (1P) + Ziel konkret (1–2P) + Nutzen plausibel (1P). Template-Abweichungen mit Sinngehalt akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie drei der sechs INVEST-Kriterien für gute User Stories.',
        points: [6, 9],
        operator: 'erlaeutern',
        gradingHint:
          'Je Kriterium 2–3P: korrekter Buchstabe + Bedeutung + Erläuterung. Independent/Negotiable/Valuable/Estimable/Small/Testable — alle Varianten akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, in welchem Scrum-Artefakt User Stories typischerweise gesammelt und priorisiert werden, und welche Rolle dafür verantwortlich ist.',
        points: [4, 5],
        operator: 'beschreiben',
        gradingHint:
          'Product Backlog 2P + Product Owner 2P. Sprint Backlog als Ergänzung akzeptieren.',
      },
    ],
  },

  // Risikomanagement + Befürchtungen-Tabelle (S22 T1 Aufg. 1-Muster)
  {
    id: 't1_risiko_befuerchtungen',
    weight: 5,
    topicKeywords: ['Risikomanagement', 'Risiko', 'Change Management', 'Konflikt', 'Befürchtung'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist eine Konfliktsituation bei der Einführung von {{PRODUKT}} bei {{UNTERNEHMEN}} beschrieben (z.B. Widerstand von Mitarbeitern). Beschreiben Sie zwei konkrete Schritte, um diesen Konflikt zu bewältigen.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Je konkreter Schritt (Informationsveranstaltung, Schulung, Pilotgruppe, Einbeziehung, ...) halbe bis volle Punkte. Allgemein "kommunizieren" ohne konkreten Schritt: halbe Punkte.',
      },
      {
        taskType: 'table',
        prompt:
          'Im questionText sind 3 Projektrisiken genannt. Ergänzen Sie für jedes Risiko eine plausible Ursache und eine mögliche Auswirkung auf das Projekt.',
        points: [8, 12],
        operator: 'beschreiben',
        tableColumns: ['Risiko', 'Ursache', 'Auswirkung'],
        tableRowCount: 3,
        fixedFirstColumn: true,
        tableKind: 'fixed',
        tableDescription:
          'Risikotabelle: erste Spalte mit vorgegebenen Risiken (z.B. "Unterschätzung Entwicklungsaufwand", "Inkompatible Schnittstellen", "Widerstand Personalrat") — Spalten 2 und 3 werden ausgefüllt.',
        gradingHint:
          'Je Zeile: Ursache plausibel 2P + Auswirkung konkret auf Projekt 2P = 4P je Zeile. Insgesamt 12P möglich.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie je eine funktionale und eine nicht-funktionale Anforderung an {{PRODUKT}}.',
        points: [4, 5],
        operator: 'beschreiben',
        gradingHint:
          'Funktional: was das System tun soll (Funktion, Feature) 2P. Nicht-funktional: wie es das tun soll (Leistung, Sicherheit, Verfügbarkeit) 2P. Je korrekte Zuordnung volle Punkte.',
      },
    ],
  },

  // NoSQL + JSON-Transformation (W23/24 T2 Aufg. 3 + S22 T1-Muster)
  {
    id: 't1_nosql_json',
    weight: 5,
    topicKeywords: ['NoSQL', 'MongoDB', 'JSON', 'Dokumenten', 'dokumentenorientiert'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein Textauszug über NoSQL-Datenbanken (z.B. MongoDB) aus einer Fachliteraturquelle gegeben. Erläutern Sie anhand des Textes drei Vorteile von NoSQL-Datenbanken gegenüber relationalen Datenbanken.',
        points: [6, 9],
        operator: 'erlaeutern',
        gradingHint:
          'Je Vorteil (Flexible Schema, Performance/keine JOINs, Developer-Friendly, horizontale Skalierung, ...) 2–3P wenn aus dem Text herleitbar und korrekt erläutert.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Im questionText sind relationale Tabellendaten (mit Fremdschlüsselbezug) gegeben. Wandeln Sie die Daten in JSON-Objekte um. Verwenden Sie bei der Einbettung zusammengehöriger Daten ein verschachteltes Array.',
        points: [7, 10],
        operator: 'entwerfen',
        gradingHint:
          'Gültiges JSON-Syntax 2P / alle Felder enthalten 3P / verschachteltes Array korrekt eingebettet 3P / konsistente Feldnamen 2P.',
      },
      {
        taskType: 'table',
        prompt:
          'Ordnen Sie die relationale Datenbankterminologie der dokumentenorientierten Entsprechung zu.',
        points: [3, 4],
        operator: 'identifizieren',
        tableColumns: ['Relationaler Begriff', 'Dokumenten-Datenbank-Begriff'],
        tableRowCount: 4,
        fixedFirstColumn: true,
        fixedFirstColumnValues: ['Database', 'Table', 'Record/Row', 'Column'],
        tableKind: 'fixed',
        tableDescription:
          'Begriffszuordnung relational↔dokumentenorientiert: Database→Database, Table→Collection, Record→Document, Column→Field.',
        gradingHint: 'Je korrekte Zuordnung 1P: Database, Collection, Document, Field.',
      },
    ],
  },
];

// ─── TEIL 2 REZEPTE ──────────────────────────────────────────────────────────

const RECIPES_TEIL2: TaskRecipe[] = [
  // SQL SELECT mit JOIN (mit vollständigen Tabellendaten — IHK-Pflicht)
  {
    id: 't2_sql_join',
    weight: 10,
    topicKeywords: ['SQL', 'JOIN', 'SELECT'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Zweck eines JOIN und nennen Sie mindestens 2 JOIN-Arten mit je einem Satz Beschreibung.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Verknüpfung von Tabellen auf Basis von PK/FK + INNER/LEFT/RIGHT/FULL je mit Beschreibung = volle Punkte.',
      },
      {
        taskType: 'sql',
        // Die Tabellendaten MÜSSEN im questionText landen — das erzwingt das buildUserPrompt + buildSystemPrompt.
        prompt:
          'Im questionText sind die Tabellenstrukturen mit Beispieldaten gegeben. Erstellen Sie eine SQL-SELECT-Abfrage mit einem JOIN über die angegebenen Tabellen. Geben Sie Nachname, Vorname und eine weitere relevante Information aus, gefiltert und sortiert nach einem sinnvollen Kriterium.',
        points: [12, 16],
        operator: 'entwerfen',
        gradingHint:
          'SELECT-Spalten 20% / JOIN-Bedingung mit richtigen Spalten 30% / WHERE/ORDER BY 30% / Alias-Verwendung 20%. Alternative korrekte Lösungen vollständig werten.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie zwei konkrete Maßnahmen, mit denen die Performance der erstellten SQL-Abfrage verbessert werden könnte.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Je Maßnahme halbe Punkte. Z.B.: Index auf JOIN-Spalten, nur benötigte Spalten selektieren, WHERE vor JOIN anwenden, EXPLAIN nutzen.',
      },
    ],
  },

  // SQL GROUP BY / Aggregation (S25-Stil: komplexe Auswertung mit Ergebnisbeispiel)
  {
    id: 't2_sql_groupby',
    weight: 7,
    topicKeywords: ['SQL', 'GROUP BY', 'Aggregation', 'Aggregat'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 3 SQL-Aggregatfunktionen und erläutern Sie jeweils kurz deren Zweck.',
        points: 6,
        operator: 'nennen',
        cascade: true,
        gradingHint:
          'COUNT/SUM/AVG/MIN/MAX — je 2P für korrekten Namen + treffende Kurzbeschreibung.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen WHERE und HAVING anhand eines konkreten Beispiels.',
        points: 4,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'WHERE filtert Zeilen vor Aggregation. HAVING filtert nach Aggregation. Beispiel muss beide zeigen.',
      },
      {
        taskType: 'sql',
        prompt:
          'Im questionText sind Tabellendaten gegeben. Erstellen Sie eine SQL-Abfrage, die für jeden Datensatz-Typ die Anzahl und einen Durchschnittswert ermittelt. Sortieren Sie absteigend nach der Anzahl. Zeigen Sie nur Gruppen mit mindestens 3 Einträgen.',
        points: [12, 16],
        operator: 'entwerfen',
        gradingHint:
          'GROUP BY korrekt 25% / COUNT/AVG korrekt 25% / HAVING COUNT>=3 korrekt 25% / ORDER BY DESC 25%. Subquery-Variante als Alternative akzeptieren.',
      },
    ],
  },

  // SQL DML-Mix: INSERT + GRANT + REVOKE + UPDATE/ALTER (S25 T2 Aufg. 4-Muster)
  {
    id: 't2_sql_dml_mix',
    weight: 8,
    topicKeywords: ['SQL', 'UPDATE', 'DELETE', 'INSERT', 'GRANT', 'REVOKE', 'ALTER'],
    subtasks: [
      {
        taskType: 'sql',
        prompt:
          'Im questionText sind Tabellendaten gegeben. Fügen Sie einen neuen Datensatz mit den angegebenen Werten in die Tabelle ein.',
        points: 3,
        operator: 'entwerfen',
        cascade: true,
        gradingHint:
          'INSERT INTO ... (Spalten) VALUES (Werte) — Spaltennamen korrekt, Werte in richtiger Reihenfolge = volle Punkte.',
      },
      {
        taskType: 'sql',
        prompt:
          'Gewähren Sie dem angegebenen Datenbankbenutzer Schreibrechte (INSERT, UPDATE) auf die genannte Tabelle.',
        points: 3,
        operator: 'entwerfen',
        cascade: true,
        gradingHint:
          'GRANT INSERT, UPDATE ON datenbank.tabelle TO "benutzer" = volle Punkte. Datenbankname vergessen = halbe Punkte.',
      },
      {
        taskType: 'sql',
        prompt: 'Entziehen Sie einem anderen Benutzer die Schreibrechte auf die genannte Tabelle.',
        points: 3,
        operator: 'entwerfen',
        cascade: true,
        gradingHint: 'REVOKE INSERT, UPDATE ON datenbank.tabelle FROM "benutzer" = volle Punkte.',
      },
      {
        taskType: 'sql',
        prompt:
          'Eine Spalte der Tabelle soll zu einem Pflichtfeld werden. Vorher sollen fehlende Werte mit einem Standardwert befüllt werden. Schreiben Sie beide notwendigen SQL-Anweisungen.',
        points: 5,
        operator: 'entwerfen',
        gradingHint:
          'UPDATE tabelle SET spalte = "standard" WHERE spalte IS NULL (2P) + ALTER TABLE tabelle MODIFY spalte TYP NOT NULL (3P). Reihenfolge muss korrekt sein.',
      },
    ],
  },

  // CREATE TABLE (DDL) + Abfrage
  {
    id: 't2_sql_create',
    weight: 5,
    topicKeywords: ['SQL', 'CREATE TABLE', 'DDL'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen DDL und DML und nennen Sie jeweils zwei konkrete SQL-Befehle als Beispiele.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'DDL=Struktur (CREATE/ALTER/DROP), DML=Daten (SELECT/INSERT/UPDATE/DELETE). Je Kategorie mind. 2 Befehle = volle Punkte.',
      },
      {
        taskType: 'sql',
        prompt:
          'Im questionText sind die Anforderungen an eine neue Tabelle beschrieben. Schreiben Sie das vollständige CREATE TABLE-Statement mit Primärschlüssel, Fremdschlüssel und passenden Datentypen.',
        points: [13, 17],
        operator: 'entwerfen',
        gradingHint:
          'Tabellenname+Spaltennamen 20% / Datentypen korrekt 20% / PK-Constraint 20% / FK-Constraint mit REFERENCES 25% / NOT NULL/DEFAULT wo sinnvoll 15%.',
      },
      {
        taskType: 'table',
        prompt:
          'Tragen Sie für 3 der definierten Attribute den passenden Datentyp und eine kurze Begründung ein.',
        points: [3, 4],
        operator: 'nennen',
        tableColumns: ['Attribut', 'Datentyp', 'Begründung'],
        tableRowCount: 3,
        tableKind: 'guided',
        tableDescription:
          'Datentyp-Tabelle: je Zeile 1 konkretes Attribut aus dem Szenario, der SQL-Datentyp und eine 1-Satz-Begründung.',
        gradingHint:
          'Je vollständige Zeile (Attribut + korrekter Typ + Begründung) 1/3 der Punkte. VarChar/String/Text als Synonyme akzeptieren.',
      },
    ],
  },

  // Pseudocode-Fehler finden + korrigieren (W22/23, W23/24-Muster)
  {
    id: 't2_pseudocode_debug',
    weight: 7,
    topicKeywords: ['Pseudocode', 'Rekursion', 'Algorithmus', 'Fehler'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein Pseudocode-Fragment mit Zeilennummern und eine Klassen-/Methodenbeschreibung gegeben. Führen Sie den Algorithmus für zwei konkrete Eingaben gedanklich aus. Geben Sie für jede Eingabe den erwarteten und den tatsächlich berechneten Rückgabewert an.',
        points: [4, 6],
        operator: 'identifizieren',
        gradingHint:
          'Je Testfall 2–3P: Eingabe korrekt benannt + erwartetes Ergebnis + tatsächliches (fehlerhaftes) Ergebnis. Wenn nur ein Testfall korrekt: halbe Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Benennen Sie die fehlerhafte Zeile (Zeilennummer) und beschreiben Sie die Art des Fehlers. Geben Sie die korrigierte Version dieser Zeile an.',
        points: [4, 6],
        operator: 'identifizieren',
        gradingHint:
          '50% für Fehlerbeschreibung mit korrekter Zeilennummer, 50% für die korrekte Korrektur.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Begriff „Anweisungsüberdeckung" (Statement Coverage) und nennen Sie, wie viele Testfälle für den gegebenen Code minimal nötig sind, um sie zu erreichen.',
        points: [3, 4],
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'Definition: jede Anweisung wird mind. 1× ausgeführt (2P) + korrekte Anzahl Testfälle (1–2P).',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie je einen Vor- und einen Nachteil rekursiver Algorithmen im Vergleich zu iterativen Lösungen.',
        points: [3, 4],
        operator: 'nennen',
        cascade: true,
        gradingHint:
          'Vorteil: Eleganz/Lesbarkeit/Natürlichkeit der Darstellung. Nachteil: Speicherverbrauch (Stack)/Stack Overflow/ggf. langsamer.',
      },
    ],
  },

  // Pseudocode entwerfen mit Klassenkontext (S25 T2 Aufg. 1-Muster)
  {
    id: 't2_pseudocode_entwurf',
    weight: 6,
    topicKeywords: ['Pseudocode', 'Algorithmus', 'Sortier', 'Such'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText sind die Klassen mit ihren Attributen und get-Methoden sowie der Funktionskopf gegeben. Beschreiben Sie den Algorithmus in eigenen Worten: Welche Schritte führt die Funktion durch? Welche Schleifenstruktur und welche Abbruchbedingung nutzt sie?',
        points: [5, 7],
        operator: 'beschreiben',
        gradingHint:
          'Kernschritte vollständig (2P) + Schleifentyp korrekt (2P) + Abbruchbedingung korrekt (1–3P).',
      },
      {
        taskType: 'pseudocode',
        prompt:
          'Implementieren Sie die im questionText beschriebene Funktion als Pseudocode. Verwenden Sie den vorgegebenen Funktionskopf, die Klassenattribute mit get-Methoden und IHK-typische Pseudocode-Konstrukte (solange/ende solange, für/ende für, wenn/sonst/ende wenn, return).',
        points: [12, 16],
        operator: 'entwerfen',
        gradingHint:
          'Funktionskopf/Rückgabe 10% / Schleifenstruktur 30% / Zugriff auf Objekte per get-Methode 30% / Korrektheit bei Testfällen 30%. Syntaktische Varianten (while/for) akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Geben Sie die Zeitkomplexität Ihrer Lösung in O-Notation an und begründen Sie kurz, wie Sie diese ableiten.',
        points: [3, 5],
        operator: 'berechnen',
        gradingHint:
          'Korrekte O-Notation (z.B. O(n), O(n²)) + kurze Herleitung (Anzahl Schleifendurchläufe) = volle Punkte.',
      },
    ],
  },

  // Speicherberechnung (W23/24 Aufgabe 3b — sehr IHK-typisch)
  {
    id: 't2_speicherberechnung',
    weight: 4,
    topicKeywords: ['Speicher', 'Speicherbedarf', 'Kodierung', 'Datenmenge'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Berechnen Sie den Speicherbedarf für das beschriebene Datenvolumen. Zeigen Sie den Rechenweg vollständig. Geben Sie das Ergebnis in einer passenden Einheit (KiB/MiB/GiB) an.',
        points: [10, 14],
        operator: 'berechnen',
        gradingHint: 'Rechenweg 60% / korrektes Ergebnis 40%. Rundungsdifferenzen akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen KB/MB/GB (dezimal) und KiB/MiB/GiB (binär).',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint:
          'Dezimal: 1000er-Schritte. Binär: 1024er-Schritte. Beide Konzepte = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie 2 Möglichkeiten, den Speicherbedarf des beschriebenen Datentyps zu reduzieren.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint:
          'Kompression, geringere Auflösung, effizientere Kodierung, Delta-Encoding — je 1 Ansatz halbe Punkte.',
      },
    ],
  },

  // OOP Codebeispiel (S22 T1 Aufg. 3-Muster: Observer-Pattern mit Sequenzdiagramm + Code)
  {
    id: 't2_oop_code',
    weight: 6,
    topicKeywords: [
      'OOP',
      'Vererbung',
      'Polymorphismus',
      'Klasse',
      'Interface',
      'generisch',
      'Observer',
      'Entwurfsmuster',
    ],
    subtasks: [
      {
        taskType: 'plantuml',
        // questionText muss schrittweise Ablaufbeschreibung + Klassenausschnitt enthalten
        prompt:
          'Im questionText ist ein Ablauf mit Objekt-Interaktionen und ein teilweise gegebenes Klassendiagramm beschrieben. Ergänzen Sie das Sequenzdiagramm um alle noch fehlenden Methodenaufrufe gemäß der Ablaufbeschreibung.',
        points: [9, 12],
        operator: 'entwerfen',
        diagramType: 'uml_sequence',
        gradingHint:
          'Je fehlende Nachricht mit korrektem Namen 1P, Rückgaben 1P, Reihenfolge korrekt 2P, opt/loop-Blöcke korrekt 2P.',
      },
      {
        taskType: 'pseudocode',
        prompt:
          'Im questionText ist eine Methode aus dem Klassendiagramm hervorgehoben. Implementieren Sie diese Methode in Pseudocode. Nutzen Sie die beschriebenen Objekte und deren Methoden aus dem Klassendiagramm.',
        points: [4, 6],
        operator: 'entwerfen',
        gradingHint:
          'Schleife über Listenelemente 2P / korrekter Methoden-Aufruf je Element 2P / Struktur vollständig 2P.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Begriff Polymorphismus und geben Sie an, wo er im beschriebenen Klassendiagramm zum Einsatz kommt.',
        points: [3, 5],
        operator: 'erlaeutern',
        gradingHint:
          'Definition: verschiedene Klassen überschreiben dieselbe Methode der Basisklasse 2P + konkreter Bezug zum Diagramm 1–3P.',
      },
    ],
  },

  // Relationales Datenmodell + SQL
  {
    id: 't2_relmodell_sql',
    weight: 5,
    topicKeywords: ['relational', 'Datenmodell', 'Normalisierung', 'SQL'],
    subtasks: [
      {
        taskType: 'table',
        prompt:
          'Erstellen Sie das relationale Datenmodell in Tabellenform für das beschriebene Szenario (mindestens 3 Tabellen).',
        points: [12, 16],
        operator: 'entwerfen',
        tableColumns: ['Tabellenname', 'Attribute (PK, FK, Datentyp)', 'Beziehung'],
        tableRowCount: 4,
        tableKind: 'guided',
        tableDescription:
          'Datenmodell-Tabelle: je Zeile 1 Tabelle mit Name, Attributen (PK/FK markiert, Datentyp) und Beziehungsangaben (z.B. 1:n zu kunde).',
        gradingHint:
          'Je Tabelle mit allen Attributen 1P, je PK 1P, je FK 1P, je Beziehung mit Kardinalität 1P. Alternative Strukturen akzeptieren.',
      },
      {
        taskType: 'sql',
        prompt: 'Schreiben Sie eine SQL-Abfrage, die zwei Ihrer Tabellen mit einem JOIN verknüpft.',
        points: [6, 9],
        operator: 'entwerfen',
        gradingHint: 'JOIN-Bedingung 40% / Spaltenauswahl 30% / WHERE falls sinnvoll 30%.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie, welche Normalform Ihr Modell erfüllt (1NF/2NF/3NF) und begründen Sie kurz.',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint: 'Nennung der Normalform + passende Begründung = volle Punkte.',
      },
    ],
  },

  // ACID-Tabelle (S25 Aufgabe 3a, W23/24 Aufgabe 3a)
  {
    id: 't2_acid',
    weight: 4,
    topicKeywords: ['ACID', 'Transaktion', 'Datenbank'],
    subtasks: [
      {
        taskType: 'table',
        prompt: 'Erläutern Sie die vier ACID-Eigenschaften. Die Eigenschaftsnamen sind vorgegeben.',
        points: [8, 12],
        operator: 'erlaeutern',
        tableColumns: ['Eigenschaft', 'Bedeutung', 'Beispiel'],
        tableRowCount: 4,
        fixedFirstColumn: true,
        fixedFirstColumnValues: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        tableKind: 'fixed',
        tableDescription:
          'ACID-Tabelle: erste Spalte fix (Atomicity/Consistency/Isolation/Durability), Spalten 2 und 3 werden vom Prüfling ausgefüllt.',
        gradingHint:
          'Je Eigenschaft Bedeutung 1P, Beispiel 1P. Sinngemäße Erläuterungen akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie, welche Probleme entstehen können, wenn die Isolation-Eigenschaft verletzt wird.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Lost Update / Dirty Read / Non-Repeatable Read / Phantom Read — je Phänomen Teilpunkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie einen konkreten Mechanismus, mit dem Datenbanksysteme Isolation sicherstellen.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint:
          'Sperrverfahren (Locks) / MVCC / Transactional Isolation Levels — jeweils = volle Punkte.',
      },
    ],
  },

  // XML / JSON Fehler finden (W22/23 Teil 1 Aufgabe 3c war XML-Validierung)
  {
    id: 't2_xml_fehler',
    weight: 3,
    topicKeywords: ['XML', 'JSON', 'DTD', 'Wohlgeformtheit', 'Datenformat'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen „wohlgeformt" und „gültig" bei XML-Dokumenten.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Wohlgeformt = XML-Regeln eingehalten. Gültig = zusätzlich DTD/Schema erfüllt. Beide Konzepte = volle Punkte.',
      },
      {
        taskType: 'table',
        prompt:
          'Im questionText ist ein fehlerhaftes XML-Dokument mit Zeilennummern gegeben. Tragen Sie die Fehler mit Zeile, Beschreibung und Fehlerart (Wohlgeformtheit/Gültigkeit) in die Tabelle ein.',
        points: [10, 14],
        operator: 'identifizieren',
        tableColumns: ['Zeile', 'Beschreibung', 'Fehlerart (Wohlgeformt/Gültig)'],
        tableRowCount: 5,
        tableKind: 'guided',
        tableDescription:
          'XML-Fehlertabelle: je Zeile 1 Fehler mit Zeilennummer + kurzer Beschreibung + Fehlerart.',
        gradingHint:
          'Je vollständige Zeile (alle 3 Spalten korrekt) 2P. Teilpunkte bei 2 von 3 Spalten.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, wofür eine DTD in XML verwendet wird.',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint:
          'Vokabular + Grammatik festlegen + Dokumentinstanz-Validierung = volle Punkte.',
      },
    ],
  },

  // UML-Sequenzdiagramm ergänzen (S25 T2 Aufg. 2-Muster, S22 T1 Aufg. 3c-Muster)
  {
    id: 't2_uml_sequenz',
    weight: 4,
    containsDiagram: true,
    topicKeywords: ['Sequenzdiagramm', 'UML', 'Klassendiagramm'],
    subtasks: [
      {
        taskType: 'plantuml',
        // questionText muss: Klassenausschnitt + schrittweise Vorgangsbeschreibung liefern
        prompt:
          'Im questionText sind die beteiligten Klassen mit ihren Methoden und eine schrittweise Vorgangsbeschreibung (Bullet-Points) gegeben. Ergänzen Sie das UML-Sequenzdiagramm um alle noch nicht dargestellten Methodenaufrufe. Zeichnen Sie Lebenslinien, synchrone Nachrichten, Rückgaben, und — falls laut Beschreibung vorhanden — optionale Blöcke (opt/alt) oder Schleifen (loop).',
        points: [13, 19],
        operator: 'entwerfen',
        diagramType: 'uml_sequence',
        gradingHint:
          'Je Lifeline 1P, je Nachricht mit korrektem Namen 1P, Rückgaben 2P, opt/alt-Block korrekt 2P, loop-Block korrekt 2P, korrekte Reihenfolge 3P.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, welche Art der Testüberdeckung (Coverage) für die Methode im Mittelpunkt des Sequenzdiagramms geeignet ist, und begründen Sie Ihre Wahl.',
        points: [2, 4],
        operator: 'beschreiben',
        gradingHint:
          'Zweigüberdeckung bevorzugt bei opt/alt-Strukturen. Anweisungsüberdeckung als Minimum. Pfadüberdeckung bei Schleifen oft nicht realistisch.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, was einen Whitebox-Test auszeichnet und wie er sich vom Blackbox-Test unterscheidet.',
        points: [2, 3],
        operator: 'beschreiben',
        gradingHint:
          'Whitebox: Testdaten basieren auf Codestruktur/Quelltext. Blackbox: nur Ein-/Ausgabeverhalten, ohne Kenntnis des Codes. Beide Aspekte = volle Punkte.',
      },
    ],
  },
];

// ─── TEIL 3 REZEPTE (WiSo) ───────────────────────────────────────────────────
// WiSo besteht aus vielen kleineren Aufgaben, meist MC + kurzer Freitext.

const RECIPES_TEIL3: TaskRecipe[] = [
  {
    id: 't3_mc_freitext',
    weight: 30,
    subtasks: [
      {
        taskType: 'mc',
        prompt:
          'Formuliere eine IHK-typische Wissensfrage als Single-Choice (genau 4 Optionen A–D, nur EINE korrekt).',
        points: 4,
        operator: 'identifizieren',
        gradingHint:
          'Binäre Bewertung: richtig = volle Punkte, falsch = 0. Teilpunkte gibt es bei MC nicht.',
      },
      {
        taskType: 'freitext',
        prompt: 'Berechnen oder erläutern Sie den beschriebenen Sachverhalt kurz.',
        points: 6,
        operator: 'erlaeutern',
        gradingHint:
          'Fachlich korrekte Antwort = volle Punkte. Bei Berechnung Rechenweg nicht zwingend.',
      },
    ],
  },
  {
    id: 't3_mcmulti_freitext',
    weight: 20,
    subtasks: [
      {
        taskType: 'mc_multi',
        prompt:
          'Formuliere eine IHK-typische Mehrfachauswahlfrage (4 Optionen A–D, 2 oder 3 korrekt).',
        points: 5,
        operator: 'identifizieren',
        gradingHint:
          'Je korrekt markierter Option Teilpunkte, je falsch markierter Abzug (nie negativ).',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie Ihre Auswahl kurz (2–3 Sätze).',
        points: 5,
        operator: 'erlaeutern',
        gradingHint: 'Sinngemäße Begründung = volle Punkte.',
      },
    ],
  },
  {
    id: 't3_freitext_mc',
    weight: 20,
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 2–3 Aspekte oder Unterschiede und erläutern Sie kurz.',
        points: 6,
        operator: 'nennen',
        gradingHint: 'Je Aspekt mit kurzer Erläuterung 1/3 oder 1/2 der Punkte.',
      },
      {
        taskType: 'mc',
        prompt:
          'Formuliere eine thematisch passende Single-Choice-Frage (4 Optionen A–D, 1 korrekt).',
        points: 4,
        operator: 'identifizieren',
        gradingHint: 'Binär: richtig = volle Punkte.',
      },
    ],
  },
  {
    id: 't3_mc_mcmulti',
    weight: 15,
    subtasks: [
      {
        taskType: 'mc',
        prompt:
          'Formuliere eine IHK-typische Wissensfrage als Single-Choice (4 Optionen A–D, 1 korrekt).',
        points: 4,
        operator: 'identifizieren',
        gradingHint: 'Binär.',
      },
      {
        taskType: 'mc_multi',
        prompt: 'Formuliere eine IHK-typische Mehrfachauswahlfrage (4 Optionen A–D, 2-3 korrekt).',
        points: 6,
        operator: 'identifizieren',
        gradingHint: 'Je Option mit richtiger Auswahl Teilpunkte.',
      },
    ],
  },
  {
    id: 't3_mcmulti_mc',
    weight: 15,
    subtasks: [
      {
        taskType: 'mc_multi',
        prompt: 'Formuliere eine IHK-typische Mehrfachauswahlfrage (4 Optionen A–D, 2-3 korrekt).',
        points: 6,
        operator: 'identifizieren',
        gradingHint: 'Je Option mit richtiger Auswahl Teilpunkte.',
      },
      {
        taskType: 'mc',
        prompt:
          'Formuliere eine IHK-typische Wissensfrage als Single-Choice (4 Optionen A–D, 1 korrekt).',
        points: 4,
        operator: 'identifizieren',
        gradingHint: 'Binär.',
      },
    ],
  },
];

// ─── Rezept-Auswahl ──────────────────────────────────────────────────────────

function pickWeightedRecipe(recipes: TaskRecipe[]): TaskRecipe {
  const total = recipes.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const recipe of recipes) {
    r -= recipe.weight;
    if (r <= 0) return recipe;
  }
  return recipes[recipes.length - 1];
}

/**
 * Wählt ein Rezept, das thematisch zum gegebenen Topic passt und die
 * UML-Beschränkung respektiert.
 */
function selectRecipe(part: ExamPart, topic: string, avoidDiagram: boolean): TaskRecipe {
  const all = part === 'teil_1' ? RECIPES_TEIL1 : part === 'teil_2' ? RECIPES_TEIL2 : RECIPES_TEIL3;

  // Strenger Filter: Rezepte, deren topicKeywords im Topic stecken
  const topicLower = topic.toLowerCase();
  const topicMatches = all.filter((r) => {
    if (avoidDiagram && r.containsDiagram) return false;
    if (!r.topicKeywords) return false;
    return r.topicKeywords.some((kw) => topicLower.includes(kw.toLowerCase()));
  });
  if (topicMatches.length > 0) {
    return pickWeightedRecipe(topicMatches);
  }

  // Kein Topic-Match → generische Rezepte ohne topicKeywords
  const generic = all.filter((r) => {
    if (avoidDiagram && r.containsDiagram) return false;
    return !r.topicKeywords;
  });
  if (generic.length > 0) {
    return pickWeightedRecipe(generic);
  }

  // Notfall: alle Rezepte außer Diagramm (wenn gesperrt)
  const fallback = all.filter((r) => !avoidDiagram || !r.containsDiagram);
  return pickWeightedRecipe(fallback.length > 0 ? fallback : all);
}

// ─── Punkte-Würfeln ──────────────────────────────────────────────────────────

function resolvePoints(p: number | [number, number]): number {
  if (typeof p === 'number') return p;
  const [min, max] = p;
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ─── Label-Vergabe ───────────────────────────────────────────────────────────
// Kaskadierte Labels wie "aa","ab","ac","b","c" werden automatisch erzeugt,
// basierend auf dem cascade-Flag der SubtaskSpecs.

function assignLabels(specs: SubtaskSpec[]): string[] {
  const labels: string[] = [];
  let mainIdx = 0; // 0="a", 1="b", 2="c", ...
  let i = 0;
  while (i < specs.length) {
    if (specs[i].cascade) {
      // Gruppiere alle aufeinanderfolgenden cascade-Specs
      const groupStart = i;
      let groupEnd = i;
      while (groupEnd + 1 < specs.length && specs[groupEnd + 1].cascade) groupEnd++;
      const groupSize = groupEnd - groupStart + 1;
      if (groupSize > 1) {
        for (let k = 0; k < groupSize; k++) {
          const mainLetter = String.fromCharCode(97 + mainIdx);
          const subLetter = String.fromCharCode(97 + k);
          labels.push(mainLetter + subLetter);
        }
      } else {
        // Einzelner cascade-Eintrag — behandele ihn wie ein normales Label
        labels.push(String.fromCharCode(97 + mainIdx));
      }
      mainIdx++;
      i = groupEnd + 1;
    } else {
      labels.push(String.fromCharCode(97 + mainIdx));
      mainIdx++;
      i++;
    }
  }
  return labels;
}

// ─── Tabellen-Schema-Hint für LLM ────────────────────────────────────────────

function buildTableSchemaHint(spec: SubtaskSpec): string {
  const cols = spec.tableColumns ?? [];
  const rowCount = spec.tableRowCount ?? 3;
  const kind = spec.tableKind ?? 'guided';
  const descr = spec.tableDescription ? `  Semantik: ${spec.tableDescription}\n` : '';
  if (kind === 'fixed') {
    const fixedVals = spec.fixedFirstColumnValues
      ? `  "firstColumnValues": ${JSON.stringify(spec.fixedFirstColumnValues)} (BINDEND, genau so übernehmen)\n`
      : '';
    return `  Tabellenspalten (BINDEND): ${JSON.stringify(cols)}
  Zeilenzahl: ${rowCount}
${fixedVals}${descr}  "exampleRow": liefere EINE vollständig ausgefüllte Beispielzeile (${cols.length} Einträge, konkret auf das Szenario bezogen).`;
  }
  if (kind === 'guided') {
    return `  Spalten-Vorschlag: ${JSON.stringify(cols)} — darf an das konkrete Thema angepasst werden, Anzahl (${cols.length}) bleibt.
  Zeilenzahl: ${rowCount}
${descr}  "exampleRow": ${cols.length} Einträge, konkret auf das Szenario bezogen.`;
  }
  // flexible
  return `  Spalten-Richtung: ${JSON.stringify(cols)} — ERSETZE abstrakte Platzhalter durch konkrete themenspezifische Bezeichnungen. Anzahl (${cols.length}) bleibt.
  Zeilenzahl: ${rowCount}
${descr}  "exampleRow": ${cols.length} Einträge, konkret.`;
  // unreachable, but TS guards
}

// ─── Schema-Fragment je Subtask ──────────────────────────────────────────────

function buildSubtaskSchema(spec: SubtaskSpec, label: string, points: number): string {
  switch (spec.taskType) {
    case 'mc':
      return `{"label":"${label}","taskType":"mc","questionText":"FRAGE?","points":${points},"mcOptions":[{"id":"A","text":"Antwort A"},{"id":"B","text":"Antwort B"},{"id":"C","text":"Antwort C"},{"id":"D","text":"Antwort D"}],"expectedAnswer":{"correctOption":"X","explanation":"Begründung"}}`;
    case 'mc_multi':
      return `{"label":"${label}","taskType":"mc_multi","questionText":"FRAGE?","points":${points},"mcOptions":[{"id":"A","text":"Aussage A"},{"id":"B","text":"Aussage B"},{"id":"C","text":"Aussage C"},{"id":"D","text":"Aussage D"}],"expectedAnswer":{"correctOptions":["A","C"],"explanation":"Begründung"}}`;
    case 'sql':
      return `{"label":"${label}","taskType":"sql","questionText":"FRAGE mit Tabellenstruktur(en) im Text","points":${points},"expectedAnswer":{"solutionSql":"SELECT ...;","keyElements":["SELECT","JOIN"],"gradingHint":"${(spec.gradingHint ?? '').replace(/"/g, "'")}"}}`;
    case 'table': {
      const ffc =
        spec.fixedFirstColumn && spec.fixedFirstColumnValues
          ? `,"firstColumnValues":${JSON.stringify(spec.fixedFirstColumnValues)}`
          : '';
      return `{"label":"${label}","taskType":"table","questionText":"FRAGE","points":${points},"tableConfigProposed":{"columns":["Spalte1","Spalte2","Spalte3"],"exampleRow":["Beispiel 1","Beispiel 2","Beispiel 3"]${ffc}},"expectedAnswer":{"keyPoints":["Musterinhalt 1","Musterinhalt 2"]}}`;
    }
    case 'plantuml':
      return `{"label":"${label}","taskType":"plantuml","questionText":"FRAGE","points":${points},"diagramType":"${spec.diagramType ?? 'uml_activity'}","expectedElements":["Element1","Element2","Element3"],"expectedAnswer":{"keyPoints":[]}}`;
    case 'pseudocode':
      return `{"label":"${label}","taskType":"pseudocode","questionText":"FRAGE","points":${points},"expectedAnswer":{"keyPoints":["Schritt 1","Schritt 2"]}}`;
    case 'diagram_upload':
      return `{"label":"${label}","taskType":"diagram_upload","questionText":"FRAGE","points":${points},"diagramType":"${spec.diagramType ?? 'uml_activity'}","expectedElements":["Element1"],"expectedAnswer":{"keyPoints":[]}}`;
    case 'freitext':
    default:
      return `{"label":"${label}","taskType":"freitext","questionText":"FRAGE","points":${points},"expectedAnswer":{"keyPoints":["Punkt 1","Punkt 2"]}}`;
  }
}

// ─── JSON-Parsing robust ─────────────────────────────────────────────────────

function safeParseTask(raw: string): GeneratedTask | null {
  try {
    // Markdown-Fences entfernen
    const clean = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    const obj = JSON.parse(clean);
    if (
      typeof obj.topicArea === 'string' &&
      typeof obj.pointsValue === 'number' &&
      Array.isArray(obj.subtasks) &&
      obj.subtasks.length > 0
    ) {
      return obj as GeneratedTask;
    }
  } catch {
    // nope
  }
  return null;
}

// ─── Prompt-Builder ──────────────────────────────────────────────────────────
//
// Die zentralen Erkenntnisse aus der OCR-Analyse von 10+ echten IHK AP2-Prüfungen
// (Sommer 2020 – Sommer 2025), die den alten Prompt fundamental verbessern:
//
// 1. KONTEXTMATERIAL — Jede echte IHK-Aufgabe liefert zuerst Material, dann
//    die Frage. Pseudocode-Aufgaben zeigen Klassendiagramme + Objekte + Beispieldaten.
//    SQL-Aufgaben zeigen vollständige Tabellendaten mit Beispielzeilen.
//    Sequenzdiagramm-Aufgaben zeigen den Ablauf als Prosa + beteiligte Klassen.
//    Der alte Prompt ließ diesen Kontext weg → die KI produzierte abstrakte,
//    nicht-prüfungsreife Fragen ohne Verankerung.
//
// 2. AUFGABENTEXT-STIL — Echte IHK-Texte beginnen mit einem situativen Satz,
//    dann kommt der Arbeitsauftrag mit Operator. Nie "Erläutern Sie allgemein X",
//    sondern immer "Die AMAG Soft GmbH möchte ... Erstellen Sie ...".
//
// 3. SQL — Echte Prüfungen (S25 T2 Aufg. 4) liefern IMMER vollständige
//    Tabellenausschnitte mit Beispieldaten. Ohne Daten ist SQL nicht lösbar.
//    Außerdem kommen komplexe Aufgaben: INSERT + GRANT + REVOKE + ALTER TABLE
//    + SELECT mit GROUP BY/HAVING — nicht nur simple JOINs.
//
// 4. PSEUDOCODE — Echte Prüfungen (S25 T2 Aufg. 1) liefern Klassen mit
//    Attributen und get-Methoden, Beispiel-Array mit Daten, und einen
//    konkreten Funktionskopf. Der Prüfling füllt nur den Körper aus.
//
// 5. SEQUENZDIAGRAMM — Echte Prüfungen (S25 T2 Aufg. 2, S22 T1 Aufg. 3)
//    liefern Klassendiagramm-Ausschnitt + schrittweise Vorgangsbeschreibung
//    ("Die Methode X ruft Y auf ... wenn leer, dann ...").
//
// 6. ER-DIAGRAMM — Echte Prüfungen (S25 T1 Aufg. 2) liefern eine
//    aufzählende Anforderungsliste ("Patienten werden mit... erfasst.
//    Ein Patient kann mehrere Medikamente einnehmen.").
//
// 7. AKTIVITÄTSDIAGRAMM — Echte Prüfungen (S25 T1 Aufg. 3, W23/24 T2 Aufg. 2)
//    liefern einen Bullet-Point-Ablauf als Prozessbeschreibung.
//
// 8. PUNKTE-ANGABE IM AUFGABENTEXT — Jede Unteraufgabe endet mit
//    "X Punkte" direkt im Aufgabentext.
//
// 9. BEWERTUNGSHINWEISE IN DEN LÖSUNGEN — IHK-Korrektoren bekommen
//    granulare Hinweise: "je Entität 1P, je Beziehung 2P, je Attribut 0,5P".

/** Erkennt, ob das Rezept mindestens eine SQL/Pseudocode/Sequenz-Subtask enthält. */
function recipeNeedsContextMaterial(recipe: TaskRecipe): boolean {
  return recipe.subtasks.some(
    (s) => s.taskType === 'sql' || s.taskType === 'pseudocode' || s.taskType === 'plantuml',
  );
}

function buildSystemPrompt(specialtyLabel: string, recipe: TaskRecipe): string {
  const hasSql = recipe.subtasks.some((s) => s.taskType === 'sql');
  const hasPseudocode = recipe.subtasks.some((s) => s.taskType === 'pseudocode');
  const hasSequenz = recipe.subtasks.some(
    (s) => s.taskType === 'plantuml' && s.diagramType === 'uml_sequence',
  );
  const hasAktivitaet = recipe.subtasks.some(
    (s) => s.taskType === 'plantuml' && s.diagramType === 'uml_activity',
  );
  const hasEr = recipe.subtasks.some((s) => s.taskType === 'plantuml' && s.diagramType === 'er');

  let contextRules = '';

  if (hasSql) {
    contextRules += `
SQL-AUFGABEN — PFLICHTREGELN (aus echten IHK-Prüfungen abgeleitet):
- Der questionText MUSS vollständige Tabellenstrukturen + MINDESTENS 4–7 Beispieldatenzeilen enthalten.
  Format exakt wie in echten Prüfungen, z.B.:
  "Tabelle Aerzte:\nAID | Vorname | Nachname | Fachgebiet | Email\n1 | Tomas | Krüger | Allgemeinmedizin | tkrueger@fit.de\n2 | Jürgen | Walter | Kardiologie | jwalter@fit.de\n3 | Birgit | Schneider | Neurologie | NULL"
- Bei mehreren Tabellen: alle Tabellen mit Daten angeben, nicht nur die Struktur.
- Aufgabentypen variieren: nicht nur SELECT+JOIN, sondern auch:
  • INSERT INTO ... VALUES (...)
  • GRANT/REVOKE Rechte auf Tabellen
  • UPDATE ... WHERE ... / ALTER TABLE ... MODIFY ...
  • SELECT mit GROUP BY, HAVING, ORDER BY, COUNT/AVG
  • Subqueries: SELECT ... FROM (SELECT ... GROUP BY ...) AS sub
- Bei komplexeren Aufgaben (GROUP BY, Subquery): Ergebnisbeispiel zeigen wie echte Prüfungen:
  "Ergebnisbeispiel:\nPID | Nachname | Anzahl_Verschreibungen\n1 | Keller | 4"
- "solutionSql": exakte funktionierende Musterlösung mit den konkreten Tabellen- und Spaltennamen aus dem questionText.
- "keyElements": z.B. ["JOIN Patienten p ON p.PID = v.PID", "GROUP BY p.PID", "HAVING COUNT >= 3"]`;
  }

  if (hasPseudocode) {
    contextRules += `
PSEUDOCODE-AUFGABEN — PFLICHTREGELN (aus echten IHK-Prüfungen abgeleitet):
- Der questionText MUSS ein vollständiges Klassendiagramm-Fragment mit konkreten Attributen und get-Methoden enthalten.
  Format: Klassenname\n- attributName : Datentyp\n+ getAttributName(): Datentyp
  Beispiel aus S25 T2 Aufg. 1:
  "Belegung\n- patientId : Integer\n- datumVon : Date  // Aufnahmetag\n- datumBis : Date  // Entlassungstag, zählt nicht als Belegungstag\n- stationId : Integer\nFür jedes Attribut gibt es eine öffentliche get-Methode."
- Außerdem: konkreten Funktionskopf mit Parametern angeben, den der Prüfling implementieren soll.
  Beispiel: "ermittleAuslastungsTage(belegung: Belegung[], startDatum: Date, endDatum: Date, stationId: Integer, anzahlBetten: Integer): Integer"
- Optional: kleines Beispiel-Array mit 2–3 Einträgen zeigen, damit der Prüfling den Kontext versteht.
- Hinweise zu besonderen Operatoren/Methoden angeben (z.B. "date = date + 1 liefert das Folgedatum").
- "keyPoints" in expectedAnswer: vollständige Musterlösung als Pseudocode-Schrittliste.`;
  }

  if (hasSequenz) {
    contextRules += `
SEQUENZDIAGRAMM-AUFGABEN — PFLICHTREGELN (aus echten IHK-Prüfungen abgeleitet):
- Der questionText MUSS einen Klassendiagramm-Ausschnitt mit den beteiligten Klassen und ihren Methoden enthalten.
  Format wie in echten Prüfungen (S25 T2 Aufg. 2):
  "Klasse U:\n+ ausgabeMedikationsplan(): void\n+ ausgabeMedikation(medikation: String): void\nKlasse Verordnungen:\n+ getMedikamente(patient: Patient): Medikament[]\nKlasse MedikamentDB:\n+ getEinnahme(medikament: Medikament, patient: Patient): String\n+ getStandardMedikation(medikament: Medikament): String"
- Dann eine schrittweise Vorgangsbeschreibung mit Bullets:
  "— Die Methode ausgabeMedikationsplan() der Klasse U wird aufgerufen.\n— Diese Methode ruft getMedikamente(...) auf, um eine Liste der Medikamente zu erhalten.\n— Für alle Elemente dieser Liste ruft ausgabeMedikationsplan() dann getEinnahme(..) auf.\n— Wenn diese Methode einen leeren String zurückgibt, liefert getStandardMedikation(...) die Vorgabe.\n— Die Einnahmevorgaben werden mit ausgabeMedikation(..) ausgegeben."
- "expectedElements": konkrete Lebenslinien-Namen + Nachrichten, z.B. ["Lifeline U", "Lifeline Verordnungen", "getMedikamente(patient)", "Loop für alle Medikamente", "alt: Einnahme leer → getStandardMedikation"]`;
  }

  if (hasAktivitaet) {
    contextRules += `
AKTIVITÄTSDIAGRAMM-AUFGABEN — PFLICHTREGELN (aus echten IHK-Prüfungen abgeleitet):
- Der questionText MUSS eine Bullet-Point-Prozessbeschreibung liefern wie in echten Prüfungen (S25 T1 Aufg. 3):
  "— Die Ärzte versammeln sich zusammen mit dem Pflegepersonal.\n— Es werden die Laborergebnisse abgefragt und die Reihenfolge (Priorisierung nach Behandlungen) und Dringlichkeit geplant.\n— Im Behandlungszimmer wird zuerst die Patientenakte geöffnet.\n— Die Vitalwerte werden vom Pflegepersonal überwacht, der Patient wird nach auftretenden Symptomen gefragt.\n— Eventuell aufgetretene Symptome werden notiert, der Behandlungsplan besprochen.\n— Falls neue Laborergebnisse vorliegen, werden diese eingearbeitet.\n— Nach Notierung der Vitalwerte werden ärztliche Untersuchungen durchgeführt.\n— Die Änderungen der Patientenakte werden nach der Visite übertragen."
- Swimlanes angeben falls mehrere Akteure: "Stellen Sie den Ablauf mit zwei Swimlanes (Arzt / Pflegepersonal) dar."
- "expectedElements": konkrete Aktivitäten + Entscheidungen, z.B. ["StartNode", "Aktivität: Laborergebnisse abfragen", "Verzweigung: neue Laborergebnisse vorhanden?", "Aktivität: Symptome notieren", "Synchronisierung nach Visite", "EndNode"]`;
  }

  if (hasEr) {
    contextRules += `
ER-DIAGRAMM-AUFGABEN — PFLICHTREGELN (aus echten IHK-Prüfungen abgeleitet):
- Der questionText MUSS eine aufzählende Anforderungsliste liefern wie in echten Prüfungen (S25 T1 Aufg. 2):
  "— Patienten werden mit Nachname, Vorname, Geburtsdatum, Krankenkasse und Versichertennummer erfasst.\n— Medikamente haben einen Hersteller und einen Wirkstoff.\n— Ein Patient kann mehrere Medikamente einnehmen.\n— Für jede Einnahme wird die Dosis und der Einnahmezeitpunkt hinterlegt.\n— Ärzte werden mit Nachname, Vorname und Spezialgebiet erfasst.\n— Ein Patient kann von unterschiedlichen Ärzten behandelt werden.\n— Für jede Behandlung wird ein Zeitstempel und ein Bericht hinterlegt."
- Wenn eine Entität bereits vorgegeben ist: "Der Entitätstyp Patient ist mit den geforderten Attributen bereits gegeben. Vervollständigen Sie das ER-Modell."
- "expectedElements": konkrete Entitäten + Beziehungen mit Kardinalitäten, z.B. ["Entität Patient (Vorname, Nachname, GebDat, PK: PatID)", "Entität Medikament (Hersteller, Wirkstoff, PK: MedID)", "Beziehung Patient — nimmt ein — Medikament (m:n mit Dosis, Zeitpunkt)", "Entität Arzt (Nachname, Vorname, Spezialgebiet, PK: ArztID)", "Beziehung Patient — wird behandelt von — Arzt (m:n mit Zeitstempel, Bericht)"]`;
  }

  return `Du bist IHK-Prüfungsersteller für ${specialtyLabel} AP2. Antworte NUR mit gültigem JSON, kein Markdown.

═══════════════════════════════════════════════════════════════════
KERNPRINZIP: ECHTE IHK-PRÜFUNGSQUALITÄT
═══════════════════════════════════════════════════════════════════

Echte IHK-Prüfungen haben IMMER diese Struktur:
1. SITUATIVER EINSTIEG: "Die {{UNTERNEHMEN}} möchte X entwickeln. Sie sind Mitarbeiter der AMAG Soft GmbH und arbeiten in diesem Projekt mit."
2. KONTEXTMATERIAL: Klassendiagramm, Tabellen mit Daten, Codeausschnitt, Prozessbeschreibung — was auch immer zur Aufgabe gehört.
3. ARBEITSAUFTRAG: "Erstellen Sie...", "Nennen Sie...", "Erläutern Sie..." + Punktzahl am Ende: "X Punkte"

AUFGABENTEXT-STIL (PFLICHT):
- Jeder questionText beginnt mit einem situativen Satz, der den Kontext herstellt.
- Dann kommt das Kontextmaterial (Klassendefinitionen, Tabellen, Bullet-Listen, Codefragmente).
- Dann der konkrete Arbeitsauftrag mit IHK-Operator.
- Der Operator steht IMMER am Satzanfang: "Nennen Sie...", "Erläutern Sie...", "Beschreiben Sie...", "Erstellen Sie...", "Berechnen Sie...", "Skizzieren Sie..."
- NIE "Erkläre allgemein X" — IMMER kontextgebunden: "Erläutern Sie, welche Vorteile der Einsatz von X für {{UNTERNEHMEN}} bei diesem Projekt hätte."

PLATZHALTER:
- {{UNTERNEHMEN}}, {{BRANCHE}}, {{PRODUKT}}, {{MITARBEITER}} dürfen im questionText verwendet werden.
- In "expectedAnswer", "explanation", "solutionSql" KEINE Platzhalter — dort szenario-neutrale Musterlösung.

MULTIPLE-CHOICE (mc):
- 4 konkrete, plausible Antwortoptionen (A–D). Alle Distraktoren müssen fachlich klingen.
- "correctOption": genau EIN Buchstabe. Variiere Position (nicht immer A).
- "explanation": 1–2 Sätze Begründung, warum diese Option richtig ist.

MULTIPLE-CHOICE MEHRFACHAUSWAHL (mc_multi):
- 4 Aussagen (A–D). Genau 2 oder 3 sind korrekt (nie 0, nie 4).
- "correctOptions": Array mit 2–3 Buchstaben.
- "explanation": kurze Begründung.

TABELLEN (table):
- "columns": konkrete themenspezifische Spaltennamen (bei flexible/guided anpassen, bei fixed Vorgabe halten).
- "exampleRow": EINE vollständig ausgefüllte Musterzeile.
- "keyPoints" in expectedAnswer: 2–4 Musterlösungs-Stichpunkte.

PLANTUML / ER (plantuml):
- "expectedElements": mind. 4 konkrete zu erwartende Elemente mit Namen.
${contextRules}
OPERATOREN (IHK-Dimension — STRIKT einhalten):
- "nennen" → Auflistung, Stichworte reichen, kein Satz nötig
- "beschreiben" → Sachverhalt in eigenen Worten, 2–3 Sätze
- "erläutern" → mit Begründung/Ursache-Wirkung, 3–5 Sätze
- "berechnen" → Rechenweg zwingend + Ergebnis mit Einheit
- "entwerfen" / "erstellen" / "skizzieren" → konkrete Umsetzung (Code/Diagramm/Tabelle/Mockup)
- "vergleichen" → strukturierte Gegenüberstellung nach Kriterien
- "identifizieren" / "benennen" → Fehler/Elemente finden und mit Zeilenbezug benennen

AUSGABE: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne umgebenden Text.`;
}

function buildUserPrompt(
  topic: string,
  recipe: TaskRecipe,
  subtaskInstructions: string,
  totalPoints: number,
  schemas: string[],
  labels: string[],
): string {
  // Baue themenspezifische Hinweise, die dem LLM helfen, realistisches
  // Kontextmaterial zu erzeugen — abgeleitet aus echten Prüfungsmustern.
  const contextHint = buildTopicContextHint(topic, recipe);

  return `Thema: "${topic}"
${contextHint}
Erstelle eine IHK-typische Prüfungsaufgabe mit ${recipe.subtasks.length} Unteraufgaben.

UNTERAUFGABEN:
${subtaskInstructions}

QUALITÄTSKRITERIEN (aus echten IHK-Prüfungen 2020–2025):
- Jede Unteraufgabe hat einen KONKRETEN, situativen Aufgabentext — kein abstraktes "Erkläre X".
- Bei SQL: Tabellen mit Beispieldaten im questionText, exakte Musterlösung in solutionSql.
- Bei Pseudocode/Sequenzdiagramm: Klassen mit Attributen + Methoden im questionText.
- Bei ER/Aktivitätsdiagramm: aufzählende Anforderungs- oder Prozessbeschreibung im questionText.
- Bei Freitext mit Vergleich: echte Namen der Konzepte verwenden (z.B. "Scrum" vs. "Wasserfallmodell"), keine generischen "Option A/B".
- Die Aufgabe soll sich kohärent auf EINEN Anwendungsfall bei {{UNTERNEHMEN}} beziehen.

Gib das JSON zurück. Ersetze alle FRAGE-Platzhalter durch echten IHK-typischen Aufgabentext und fülle alle mcOptions, expectedAnswer etc. mit konkreten Inhalten:
{"topicArea":"${topic}","pointsValue":${totalPoints},"difficulty":"medium","subtasks":[${schemas.join(',')}]}`;
}

/**
 * Liefert themenspezifische Hinweise für das User-Prompt, damit die KI
 * realistisches Kontextmaterial erzeugt. Abgeleitet aus den echten Prüfungen.
 */
function buildTopicContextHint(topic: string, recipe: TaskRecipe): string {
  const lower = topic.toLowerCase();
  const hasSql = recipe.subtasks.some((s) => s.taskType === 'sql');
  const hasPseudo = recipe.subtasks.some((s) => s.taskType === 'pseudocode');
  const hasPlantuml = recipe.subtasks.some((s) => s.taskType === 'plantuml');

  const hints: string[] = [];

  // ── SQL-spezifische Kontexthinweise ──────────────────────────────────────
  if (hasSql) {
    if (lower.includes('join') || lower.includes('select')) {
      hints.push(
        'SQL-Kontext: Erstelle 2–3 thematisch passende Tabellen mit je 5–7 Beispieldatenzeilen. ' +
          'Die Aufgabe soll einen realitätsnahen Anwendungsfall abbilden (z.B. Patientenverwaltung, ' +
          'Auftragssystem, Lagerbestand). Baue eine SELECT+JOIN-Abfrage mit WHERE/ORDER-Bedingung.',
      );
    } else if (lower.includes('group') || lower.includes('aggregat')) {
      hints.push(
        'SQL-Kontext: Erstelle 2 Tabellen mit 7–10 Datenzeilen, die Aggregation sinnvoll machen ' +
          '(z.B. Verschreibungen pro Patient, Bestellungen pro Kunde). ' +
          'Zeige ein Ergebnisbeispiel nach der Aufgabe.',
      );
    } else if (lower.includes('ddl') || lower.includes('create')) {
      hints.push(
        'SQL-Kontext: Liefere eine Anforderungsbeschreibung (3–4 Bullets) aus der die CREATE-Struktur ' +
          'eindeutig hervorgeht. Die Tabelle soll 5–7 Attribute + PK + FK haben.',
      );
    } else if (lower.includes('update') || lower.includes('delete') || lower.includes('insert')) {
      hints.push(
        'SQL-Kontext: Erstelle 2 Tabellen mit 5–7 Datenzeilen als Ausgangssituation. ' +
          'Die Aufgabe soll DML-Operationen (INSERT, UPDATE, GRANT, REVOKE, ALTER TABLE) kombinieren, ' +
          'wie in echten IHK-Prüfungen: z.B. Eintrag hinzufügen + Rechte vergeben + Pflichtfeld setzen.',
      );
    }
  }

  // ── Pseudocode-spezifische Kontexthinweise ───────────────────────────────
  if (hasPseudo) {
    if (lower.includes('rekursion') || lower.includes('such') || lower.includes('sortier')) {
      hints.push(
        'Pseudocode-Kontext: Liefere eine oder zwei Klassen mit Attributen und öffentlichen get-Methoden. ' +
          'Gib einen konkreten Funktionskopf mit Parametern vor, den der Prüfling implementieren soll. ' +
          'Zeige ein kleines Beispiel-Array mit 3–4 Objekten, damit der Prüfling die Datenstruktur versteht.',
      );
    } else {
      hints.push(
        'Pseudocode-Kontext: Definiere mindestens eine Klasse mit 3–4 Attributen und ihren get-Methoden. ' +
          'Gib einen vollständigen Funktionskopf vor (Name, Parameter mit Typen, Rückgabetyp). ' +
          'Beschreibe eventuelle Besonderheiten der Objekte (z.B. "date + 1 liefert das Folgedatum").',
      );
    }
  }

  // ── Diagramm-spezifische Kontexthinweise ─────────────────────────────────
  if (hasPlantuml) {
    const diagType = recipe.subtasks.find((s) => s.taskType === 'plantuml')?.diagramType;
    if (diagType === 'uml_sequence') {
      hints.push(
        'Sequenzdiagramm-Kontext: Liefere 3–4 beteiligte Klassen mit ihren relevanten Methoden ' +
          '(Signatur + Rückgabetyp). Dann eine schrittweise Vorgangsbeschreibung mit Bullet-Points, ' +
          'die Verzweigungen ("Wenn ... leer, dann ...") und Schleifen ("Für alle Elemente ...") enthält.',
      );
    } else if (diagType === 'uml_activity') {
      hints.push(
        'Aktivitätsdiagramm-Kontext: Liefere einen konkreten Geschäftsprozess als Bullet-Point-Liste ' +
          'mit 7–10 Schritten. Mindestens eine Verzweigung (if/else) und eine Parallelität oder Synchronisierung ' +
          'einbauen. Wenn mehrere Rollen beteiligt sind, Swimlanes vorgeben.',
      );
    } else if (diagType === 'er') {
      hints.push(
        'ER-Diagramm-Kontext: Liefere eine aufzählende Anforderungsliste mit 7–10 Bullets. ' +
          'Mindestens eine m:n-Beziehung mit Attributen an der Beziehung einbauen. ' +
          'Optional: einen bereits vorgegebenen Entitätstyp nennen, den der Prüfling ergänzen soll.',
      );
    }
  }

  // ── Inhaltliche Kontexthinweise je Thema ─────────────────────────────────
  if (lower.includes('scrum') || lower.includes('agil') || lower.includes('vorgehensmodell')) {
    hints.push(
      'Vergleichs-Kontext: Verwende echte Modellnamen (Scrum, Wasserfall, Kanban, V-Modell). ' +
        'Bei Tabellen-Vergleich: konkrete Vergleichsmerkmale wie "Planbarkeit", "Flexibilität bei Änderungen", ' +
        '"Eignung für verteilte Teams", "Dokumentationsaufwand".',
    );
  }

  if (lower.includes('stakeholder')) {
    hints.push(
      'Stakeholder-Kontext: Die Tabelle soll 3 verschiedene Stakeholder-Typen enthalten: ' +
        'mind. einen internen (z.B. Entwicklungsteam, Management) und einen externen (z.B. Kunde, Behörde). ' +
        'Erwartungen und Befürchtungen sollen konkret zum {{PRODUKT}}-Kontext passen.',
    );
  }

  if (lower.includes('testkonzept') || lower.includes('teststufen')) {
    hints.push(
      'Testkonzept-Kontext: Die 4 Teststufen (Unit, Integration, System, Abnahme) sollen jeweils ' +
        'mit einem projektkonkreten Beispiel belegt werden. Z.B. "Unit-Test: Test der Validierungsfunktion ' +
        'für das Eingabefeld Versichertennummer".',
    );
  }

  if (lower.includes('verschlüsselung') || lower.includes('tls') || lower.includes('zertifikat')) {
    hints.push(
      'Sicherheits-Kontext: Stelle einen konkreten IT-Sicherheitsfall vor ' +
        '(z.B. "Die Datenbank soll Passwörter sicher speichern" oder ' +
        '"Der Webserver soll mit SSL/TLS gesichert werden"). ' +
        'Beziehe die Fragen auf diesen konkreten Fall.',
    );
  }

  if (lower.includes('mockup') || lower.includes('ui') || lower.includes('darstellungsform')) {
    hints.push(
      'UI-Kontext: Beschreibe eine konkrete Dateneingabe- oder -anzeige-Situation ' +
        '(z.B. "Eingabe von Patientendaten wenn Chipkarte nicht verfügbar ist"). ' +
        'Das Mockup soll mindestens: Überschrift, Eingabefelder/Anzeigen, ein Auswahlfeld, ' +
        'und Aktionsbuttons (Speichern/Abbrechen) enthalten.',
    );
  }

  if (lower.includes('factory') || lower.includes('entwurfsmuster') || lower.includes('oop')) {
    hints.push(
      'OOP-Kontext: Wenn Factory Method: Liefere einen englischen Kurzbeschreibungstext des Musters ' +
        '(wie in echten Prüfungen mit Quellenangabe) und ein konkretes Anwendungsszenario ' +
        '(z.B. "Zur Kennzeichnung von Proben werden unterschiedliche Etiketten gedruckt"). ' +
        'Ein teilweise ausgefülltes Klassendiagramm vorgeben, das der Prüfling ergänzen soll.',
    );
  }

  if (lower.includes('acid') || lower.includes('transaktion')) {
    hints.push(
      'ACID-Kontext: Nutze einen konkreten Datenbank-Anwendungsfall als Rahmen ' +
        '(z.B. Krankenhausinformationssystem, Banküberweisung). ' +
        'Bei Isolation: konkrete Anomalien nennen (Lost Update, Dirty Read, Phantom Read).',
    );
  }

  if (
    lower.includes('nosql') ||
    lower.includes('mongodb') ||
    lower.includes('json') ||
    lower.includes('dokumenten')
  ) {
    hints.push(
      'NoSQL/JSON-Kontext: Liefere ein konkretes relationales Ausgangsdatenmodell ' +
        '(2 Tabellen mit Fremdschlüsselbezug und Beispieldaten), das in JSON/Dokumente überführt werden soll. ' +
        'Verwende realistische Feldnamen aus dem Anwendungskontext.',
    );
  }

  if (lower.includes('netzplan') || lower.includes('kritischer pfad')) {
    hints.push(
      'Netzplan-Kontext: Definiere 5–7 konkrete Projektvorgänge mit Vorgängern und Dauern (in Tagen). ' +
        'Mindestens ein paralleler Pfad muss existieren. ' +
        'Der kritische Pfad muss eindeutig bestimmbar sein.',
    );
  }

  if (lower.includes('speicher') || lower.includes('datenmenge')) {
    hints.push(
      'Speicher-Kontext: Liefere einen konkreten Anwendungsfall mit messbaren Größen, z.B.: ' +
        '"Die Klinik speichert täglich X Röntgenbilder mit einer Auflösung von Y×Z Pixeln und Z Bit Farbtiefe." ' +
        'Gib an, für welchen Zeitraum oder welche Anzahl gespeichert werden soll.',
    );
  }

  if (hints.length === 0) return '';
  return '\nKONTEXTHINWEISE FÜR DIESE AUFGABE:\n' + hints.map((h) => `• ${h}`).join('\n') + '\n';
}

// ─── Einzelne Aufgabe generieren ─────────────────────────────────────────────

async function generateOneTask(
  part: ExamPart,
  topic: string,
  apiKey: string,
  avoidDiagram: boolean,
  meta: ProviderMeta,
  specialty: Specialty,
): Promise<GeneratedTask> {
  const recipe = selectRecipe(part, topic, avoidDiagram);

  // Punkte pro Subtask würfeln (bei Range-Angaben)
  const resolvedPoints = recipe.subtasks.map((s) => resolvePoints(s.points));
  const totalPoints = resolvedPoints.reduce((a, b) => a + b, 0);

  // Labels vergeben
  const labels = assignLabels(recipe.subtasks);

  // Schema je Subtask bauen
  const schemas = recipe.subtasks.map((spec, i) =>
    buildSubtaskSchema(spec, labels[i], resolvedPoints[i]),
  );

  // Subtask-Anweisungen für LLM
  const subtaskInstructions = recipe.subtasks
    .map((spec, i) => {
      const opLabel = spec.operator ? ` [Operator: ${spec.operator}]` : '';
      const tableHint = spec.taskType === 'table' ? `\n${buildTableSchemaHint(spec)}` : '';
      const ghint = spec.gradingHint ? `\n  Bewertungshinweis: ${spec.gradingHint}` : '';
      return `Unteraufgabe ${labels[i]} (${resolvedPoints[i]}P)${opLabel}: ${spec.prompt}${tableHint}${ghint}`;
    })
    .join('\n\n');

  const specialtyLabel = specialty === 'fisi' ? 'FISI' : 'FIAE';
  const system = buildSystemPrompt(specialtyLabel, recipe);
  const user = buildUserPrompt(topic, recipe, subtaskInstructions, totalPoints, schemas, labels);

  const raw = await callAiProvider(`${system}\n\n${user}`, apiKey, meta);
  const task = safeParseTask(raw);

  if (!task) {
    console.warn(`[generator] JSON-Parse fehlgeschlagen für "${topic}", nutze Fallback-Aufgabe`);
    return buildFallbackTask(topic, recipe, resolvedPoints, labels);
  }

  // Harte Nachvalidierung
  task.topicArea = topic;
  task.difficulty = task.difficulty ?? 'medium';
  task.pointsValue = totalPoints;

  // KI-Subtasks auf erwartete Anzahl trimmen / auffüllen
  if (task.subtasks.length > recipe.subtasks.length) {
    task.subtasks = task.subtasks.slice(0, recipe.subtasks.length);
  }
  while (task.subtasks.length < recipe.subtasks.length) {
    const i = task.subtasks.length;
    task.subtasks.push({
      label: labels[i],
      taskType: recipe.subtasks[i].taskType,
      questionText: `Aufgabentext zum Thema „${topic}".`,
      points: resolvedPoints[i],
      expectedAnswer: { keyPoints: [] },
    });
  }

  // Jeden Subtask validieren
  for (let i = 0; i < task.subtasks.length; i++) {
    const st = task.subtasks[i];
    const spec = recipe.subtasks[i];
    st.label = labels[i];
    st.taskType = spec.taskType;
    st.points = resolvedPoints[i];

    // Bewertungshinweis aus Rezept in expectedAnswer kippen, falls nicht schon da
    if (!st.expectedAnswer) st.expectedAnswer = {};
    if (spec.gradingHint && !st.expectedAnswer.gradingHint) {
      st.expectedAnswer.gradingHint = spec.gradingHint;
    }
    if (spec.operator) {
      st.expectedAnswer.operator = spec.operator;
    }

    validateSubtask(st, spec, topic);
  }

  return task;
}

// ─── Subtask-Validierung je Typ ──────────────────────────────────────────────

function validateSubtask(st: GeneratedSubTask, spec: SubtaskSpec, topic: string): void {
  const taskType = spec.taskType;

  if (taskType === 'table') {
    validateTableSubtask(st, spec);
  }
  if (taskType === 'plantuml' || taskType === 'diagram_upload') {
    st.diagramType = spec.diagramType ?? st.diagramType ?? 'uml_activity';
  }
  if (taskType === 'mc') {
    validateMcSubtask(st, topic);
  }
  if (taskType === 'mc_multi') {
    validateMcMultiSubtask(st, topic);
  }
  if (taskType === 'sql') {
    validateSqlSubtask(st);
  }
  // {{PLACEHOLDER}} aus explanation/feedback-relevanten Feldern entfernen
  if (typeof st.expectedAnswer?.explanation === 'string') {
    st.expectedAnswer.explanation = (st.expectedAnswer.explanation as string).replace(
      /\{\{[A-Z_]+\}\}/g,
      '',
    );
  }
}

function validateTableSubtask(st: GeneratedSubTask, spec: SubtaskSpec): void {
  const rowCount = spec.tableRowCount ?? 3;
  const proposed = (st as unknown as Record<string, unknown>).tableConfigProposed as
    | Record<string, unknown>
    | undefined;

  let columns = (spec.tableColumns ?? []).slice();
  let exampleRow: string[] | undefined;
  let firstColumnValues: string[] | undefined = spec.fixedFirstColumnValues?.slice();

  if (proposed) {
    const proposedCols = proposed.columns as string[] | undefined;
    const proposedExample = proposed.exampleRow as string[] | undefined;
    const proposedFirst = proposed.firstColumnValues as string[] | undefined;

    const kind = spec.tableKind ?? 'guided';
    if (
      kind !== 'fixed' &&
      Array.isArray(proposedCols) &&
      proposedCols.length === columns.length &&
      proposedCols.every((c) => typeof c === 'string' && c.trim().length > 0)
    ) {
      columns = proposedCols.map((c) => c.trim());
    }
    if (
      Array.isArray(proposedExample) &&
      proposedExample.length === columns.length &&
      proposedExample.every((c) => typeof c === 'string' && c.trim().length > 0)
    ) {
      exampleRow = proposedExample.map((c) => c.trim());
    }
    if (
      kind !== 'fixed' &&
      spec.fixedFirstColumn &&
      Array.isArray(proposedFirst) &&
      proposedFirst.length === rowCount &&
      proposedFirst.every((v) => typeof v === 'string' && v.trim().length > 0)
    ) {
      firstColumnValues = proposedFirst.map((v) => v.trim());
    }
  }

  const rows: string[][] = Array.from({ length: rowCount }, (_, ri) =>
    columns.map((_c, ci) => {
      if (ci === 0 && spec.fixedFirstColumn && firstColumnValues && firstColumnValues[ri]) {
        return firstColumnValues[ri];
      }
      return '';
    }),
  );

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

function validateMcSubtask(st: GeneratedSubTask, topic: string): void {
  if (!st.mcOptions || st.mcOptions.length < 4) {
    st.mcOptions = [
      { id: 'A', text: st.mcOptions?.[0]?.text ?? 'Antwort A' },
      { id: 'B', text: st.mcOptions?.[1]?.text ?? 'Antwort B' },
      { id: 'C', text: st.mcOptions?.[2]?.text ?? 'Antwort C' },
      { id: 'D', text: st.mcOptions?.[3]?.text ?? 'Antwort D' },
    ];
  }
  const validOptions = new Set(st.mcOptions.map((o) => o.id.toUpperCase()));
  const raw = String(st.expectedAnswer?.correctOption ?? '')
    .toUpperCase()
    .trim();
  if (!validOptions.has(raw)) {
    console.warn(`[generator] correctOption "${raw}" ungültig für "${topic}" — Fallback "A"`);
    st.expectedAnswer = { ...st.expectedAnswer, correctOption: 'A' };
  } else {
    st.expectedAnswer = { ...st.expectedAnswer, correctOption: raw };
  }
}

function validateMcMultiSubtask(st: GeneratedSubTask, topic: string): void {
  if (!st.mcOptions || st.mcOptions.length < 4) {
    st.mcOptions = [
      { id: 'A', text: st.mcOptions?.[0]?.text ?? 'Aussage A' },
      { id: 'B', text: st.mcOptions?.[1]?.text ?? 'Aussage B' },
      { id: 'C', text: st.mcOptions?.[2]?.text ?? 'Aussage C' },
      { id: 'D', text: st.mcOptions?.[3]?.text ?? 'Aussage D' },
    ];
  }
  const validIds = new Set(st.mcOptions.map((o) => o.id.toUpperCase()));
  const rawList = Array.isArray(st.expectedAnswer?.correctOptions)
    ? (st.expectedAnswer.correctOptions as unknown[])
    : [];
  const normalised = rawList
    .map((v) => String(v).toUpperCase().trim())
    .filter((v) => validIds.has(v));
  const unique = Array.from(new Set(normalised));
  let finalList = unique;
  if (finalList.length === 0 || finalList.length >= st.mcOptions.length) {
    console.warn(`[generator] correctOptions ungültig für "${topic}" — Fallback ["A","C"]`);
    finalList = ['A', 'C'];
  }
  st.expectedAnswer = { ...st.expectedAnswer, correctOptions: finalList };
}

function validateSqlSubtask(st: GeneratedSubTask): void {
  if (!st.expectedAnswer) st.expectedAnswer = {};
  if (typeof st.expectedAnswer.solutionSql !== 'string' || !st.expectedAnswer.solutionSql.trim()) {
    st.expectedAnswer.solutionSql = '-- Musterlösung nicht verfügbar';
  }
  if (!Array.isArray(st.expectedAnswer.keyElements)) {
    st.expectedAnswer.keyElements = [];
  }
  if (typeof st.expectedAnswer.gradingHint !== 'string') {
    st.expectedAnswer.gradingHint =
      'Bewertung nach SQL-Syntax, korrekten Tabellen-/Spaltenbezügen und Ergebnismenge.';
  }
}

// ─── Fallback-Aufgabe (wenn KI komplett ausfällt) ────────────────────────────

function buildFallbackTask(
  topic: string,
  recipe: TaskRecipe,
  points: number[],
  labels: string[],
): GeneratedTask {
  const subtasks: GeneratedSubTask[] = recipe.subtasks.map((spec, i) => {
    const base: GeneratedSubTask = {
      label: labels[i],
      taskType: spec.taskType,
      questionText:
        spec.taskType === 'table'
          ? `Füllen Sie die Tabelle zum Thema „${topic}" aus.`
          : `Bearbeiten Sie die Aufgabe zum Thema „${topic}" im Kontext von {{UNTERNEHMEN}}.`,
      points: points[i],
      expectedAnswer: {
        keyPoints: [],
        ...(spec.gradingHint ? { gradingHint: spec.gradingHint } : {}),
      },
    };
    if (spec.taskType === 'table' && spec.tableColumns) {
      const rowCount = spec.tableRowCount ?? 3;
      const firstCol = spec.fixedFirstColumnValues;
      base.tableConfig = {
        columns: spec.tableColumns.slice(),
        rows: Array.from({ length: rowCount }, (_, ri) =>
          spec.tableColumns!.map((_c, ci) =>
            ci === 0 && spec.fixedFirstColumn && firstCol && firstCol[ri] ? firstCol[ri] : '',
          ),
        ),
        rowCount,
        fixedFirstColumn: spec.fixedFirstColumn ?? false,
        fixedFirstColumnValues: firstCol,
      };
    }
    if (spec.taskType === 'mc' || spec.taskType === 'mc_multi') {
      base.mcOptions = [
        { id: 'A', text: 'Antwort A' },
        { id: 'B', text: 'Antwort B' },
        { id: 'C', text: 'Antwort C' },
        { id: 'D', text: 'Antwort D' },
      ];
      base.expectedAnswer =
        spec.taskType === 'mc'
          ? { correctOption: 'A', explanation: '' }
          : { correctOptions: ['A', 'C'], explanation: '' };
    }
    if (spec.taskType === 'plantuml' || spec.taskType === 'diagram_upload') {
      base.diagramType = spec.diagramType ?? 'uml_activity';
      base.expectedElements = ['Element 1', 'Element 2', 'Element 3'];
    }
    return base;
  });

  return {
    topicArea: topic,
    pointsValue: points.reduce((a, b) => a + b, 0),
    difficulty: 'medium',
    subtasks,
  };
}

// ─── Public: Batch-Generierung ───────────────────────────────────────────────

export type TaskSource = 'user_ai' | 'server_ai' | 'fallback';

export interface TaskWarning {
  topic: string;
  source: TaskSource;
  message: string;
}

export interface GeneratePoolResult {
  tasks: GeneratedTask[];
  warnings: TaskWarning[];
}

/**
 * Generiert `count` Aufgaben für den Pool. Dreistufiger Fallback pro Thema:
 *   1. User-AI
 *   2. Server-AI (falls unterschiedlich)
 *   3. Fallback-Platzhalteraufgabe (immer erfolgreich)
 *
 * Jede Aufgabe bekommt eine explizite Warnung, wenn Tier 2 oder 3 einspringen.
 */
/**
 * Generiert `count` Aufgaben für den Pool. Dreistufiger Fallback pro Thema:
 *   1. User-AI
 *   2. Server-AI (falls unterschiedlich)
 *   3. Fallback-Platzhalteraufgabe (immer erfolgreich)
 *
 * Jede Aufgabe bekommt eine explizite Warnung, wenn Tier 2 oder 3 einspringen.
 *
 * @param topics Optional: konkrete Themenliste, die abgearbeitet werden soll.
 *   Wenn nicht angegeben, wird eine Zufallsauswahl aus getTopics(part) getroffen.
 *   Der Pool-Refill (routeHelpers.refillPoolInBackground) nutzt diesen Parameter,
 *   um gezielt Topics zu generieren, deren Kind im Pool unterrepräsentiert ist.
 */
export async function generateTasksForPool(
  part: ExamPart,
  count: number,
  userApiKey: string,
  userMeta?: ProviderMeta,
  serverApiKey?: string | null,
  serverMeta?: ProviderMeta | null,
  specialty: Specialty = 'fiae',
  topics?: string[],
): Promise<GeneratePoolResult> {
  const topicsToUse = topics ?? pickUnique(getTopics(part, specialty), count);
  const tasks: GeneratedTask[] = [];
  const warnings: TaskWarning[] = [];
  // Innerhalb eines Batches erlauben wir jetzt bis zu 2 Diagramm-Aufgaben.
  // Der alte Wert 1 war zu streng und hat zur Diagramm-Armut im Pool beigetragen
  // — die Typbalance-Logik in assembleExam braucht mindestens 2 diagram-Tasks
  // für Teil 1 (einmal als Slot-1-Match, einmal als Fallback).
  let diagramCount = 0;
  const MAX_DIAGRAM_PER_BATCH = 2;

  const hasDistinctServer =
    !!serverApiKey &&
    !!serverMeta &&
    (serverApiKey !== userApiKey || serverMeta.id !== userMeta?.id);

  for (const topic of topicsToUse) {
    const avoidDiagram = diagramCount >= MAX_DIAGRAM_PER_BATCH;
    let task: GeneratedTask | null = null;
    let userError: string | null = null;
    let serverError: string | null = null;

    if (userMeta) {
      try {
        task = await generateOneTask(part, topic, userApiKey, avoidDiagram, userMeta, specialty);
      } catch (err) {
        userError = err instanceof Error ? err.message : String(err);
        console.warn(`[generator] "${topic}" User-AI fehlgeschlagen: ${userError.slice(0, 120)}`);
      }
    }

    if (!task && hasDistinctServer) {
      try {
        task = await generateOneTask(
          part,
          topic,
          serverApiKey!,
          avoidDiagram,
          serverMeta!,
          specialty,
        );
        warnings.push({
          topic,
          source: 'server_ai',
          message: `„${topic}": ${userMeta?.label ?? 'KI'} fehlgeschlagen (${truncate(userError ?? 'Fehler')}). Server-KI (${serverMeta!.label}) eingesprungen.`,
        });
      } catch (err) {
        serverError = err instanceof Error ? err.message : String(err);
        console.warn(
          `[generator] "${topic}" Server-AI fehlgeschlagen: ${serverError.slice(0, 120)}`,
        );
      }
    }

    if (!task) {
      // Platzhalter-Aufgabe: nimm irgendein passendes Rezept
      const recipe = selectRecipe(part, topic, avoidDiagram);
      const points = recipe.subtasks.map((s) => resolvePoints(s.points));
      const labels = assignLabels(recipe.subtasks);
      task = buildFallbackTask(topic, recipe, points, labels);
      const bothFailed = hasDistinctServer && serverError;
      warnings.push({
        topic,
        source: 'fallback',
        message: bothFailed
          ? `„${topic}": Alle KIs fehlgeschlagen. Platzhalter verwendet. User: ${truncate(userError ?? '-')} | Server: ${truncate(serverError ?? '-')}`
          : `„${topic}": KI nicht verfügbar (${truncate(userError ?? 'Kein Provider')}). Platzhalter verwendet.`,
      });
    }

    const hasDiagram = task.subtasks.some(
      (st) => st.taskType === 'plantuml' || st.taskType === 'diagram_upload',
    );
    if (hasDiagram) diagramCount++;
    tasks.push(task);
  }

  return { tasks, warnings };
}

function pickUnique<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

function truncate(s: string, max = 100): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}
