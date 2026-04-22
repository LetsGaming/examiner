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
export { SCENARIOS, applyScenario, generateScenarioForTasks, pickRandomFallbackScenario } from './scenarios.js';
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
  operator?: 'nennen' | 'beschreiben' | 'erklaeren' | 'erlaeutern' | 'berechnen' | 'entwerfen' | 'vergleichen' | 'identifizieren';
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
        gradingHint: 'Erläuterung: Kernidee korrekt + mindestens ein Begründungsaspekt im Unternehmenskontext.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 3 konkrete Beispiele oder Ausprägungen und beschreiben Sie diese jeweils kurz (1–2 Sätze).',
        points: [9, 12],
        operator: 'beschreiben',
        gradingHint: 'Je korrektem Beispiel mit Kurzbeschreibung 1/3 der Punkte. Sinngemäße Bezüge reichen.',
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
        prompt: 'Nennen Sie 3 Stakeholder des Projekts und beschreiben Sie je Stakeholder eine Erwartung und eine Befürchtung.',
        points: [9, 12],
        operator: 'beschreiben',
        tableColumns: ['Stakeholder', 'Erwartung', 'Befürchtung'],
        tableRowCount: 3,
        tableKind: 'guided',
        tableDescription:
          'Stakeholder-Tabelle: je Zeile 1 konkreter Stakeholder (Rolle oder Person) mit 1 Erwartung und 1 Befürchtung. Alle Einträge beziehen sich auf das konkrete Projekt bei {{UNTERNEHMEN}}.',
        gradingHint: 'Je Zeile bis zu 4 Punkte: 1P Stakeholder, 2P Erwartung, 2P Befürchtung. Alternative Stakeholder mit plausibler Begründung auch korrekt.',
      },
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie, wie Sie mit einem Stakeholder mit geringem Einfluss aber hohem Interesse umgehen.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint: 'Ein plausibler Umgangsansatz (z.B. regelmäßige Information) reicht für volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, warum eine frühzeitige Stakeholder-Analyse wichtig ist.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint: 'Zwei plausible Begründungen (Risikominimierung, frühes Feedback, ...) → volle Punkte.',
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
        prompt: 'Erläutern Sie je einen Aspekt Ihrer Umfeldanalyse aus den Bereichen „technisches Umfeld" und „rechtliches Umfeld" für das Projekt bei {{UNTERNEHMEN}}.',
        points: [6, 8],
        operator: 'erlaeutern',
        gradingHint: 'Je Bereich 1 passender Aspekt + Erläuterung = halbe Punkte. Beispiele: technisch → bestehende Hardware/Netzwerk; rechtlich → DSGVO, Datenschutz.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 3 funktionale und 3 nicht-funktionale Anforderungen an das Projekt.',
        points: [10, 14],
        operator: 'nennen',
        gradingHint: 'Je Anforderung 1/6 der Punkte. Keine scharfe Trennung verlangen, sinngemäß korrekte Zuordnung reicht.',
      },
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie kurz, welche Aufgaben zur Vorbereitung des Projektabschluss-Protokolls durchzuführen sind.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint: 'Soll-Ist-Vergleich + Folgemaßnahmen identifizieren = volle Punkte. Auch "Lessons Learned" zulässig.',
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
        gradingHint: 'Als <Rolle> möchte ich <Ziel>, damit <Nutzen>. Drei Bestandteile = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie die 6 Buchstaben der INVEST-Regel in je einem Satz.',
        points: 6,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint: 'Je Buchstabe 1 Punkt: Independent / Negotiable / Valuable / Estimable / Small / Testable.',
      },
      {
        taskType: 'freitext',
        prompt: 'Formulieren Sie 2 User Stories für eine zentrale Funktion des Projekts bei {{UNTERNEHMEN}}.',
        points: [6, 8],
        operator: 'entwerfen',
        gradingHint: 'Je Story mit allen 3 Bestandteilen (Rolle, Ziel, Nutzen) = halbe Punkte.',
      },
    ],
  },

  // Vergleich (Wasserfall vs. Scrum, NoSQL vs. SQL, etc.) + Entscheidung
  {
    id: 't1_vergleich',
    weight: 7,
    topicKeywords: ['Vergleich', 'Vorgehensmodell', 'Scrum', 'Wasserfall', 'NoSQL', 'Datenbank'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie in 3–4 Sätzen, worin sich die beiden Ansätze grundlegend unterscheiden.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint: 'Kernunterschied + mindestens ein konkretes Merkmal = volle Punkte.',
      },
      {
        taskType: 'table',
        prompt: 'Füllen Sie die Vergleichstabelle aus. Die Kriterien sind vorgegeben.',
        points: [10, 14],
        operator: 'vergleichen',
        tableColumns: ['Vergleichsmerkmal', 'Option A', 'Option B'],
        tableRowCount: 4,
        fixedFirstColumn: true,
        tableKind: 'flexible',
        tableDescription:
          'Vergleichstabelle: erste Spalte enthält 4 konkrete Vergleichsmerkmale, Spalten 2 und 3 benennen die beiden konkreten Vergleichsobjekte (z.B. "Scrum" vs "Wasserfall", nicht "Option A/B").',
        gradingHint: 'Je Zeile je Option 1 Punkt wenn inhaltlich korrekt. Sinngemäße Ausprägungen akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt: 'Entscheiden Sie sich begründet für eine der beiden Optionen für das Projekt bei {{UNTERNEHMEN}}.',
        points: [4, 6],
        operator: 'entwerfen',
        gradingHint: '1 Punkt für Entscheidung, Rest für fachliche Begründung. Beide Optionen zulässig, solange Begründung trägt.',
      },
    ],
  },

  // UML-Aktivitätsdiagramm-Aufgabe — W22/23 Aufgabe 4, W23/24 Aufgabe 2c
  {
    id: 't1_uml_aktivitaet',
    weight: 7,
    containsDiagram: true,
    topicKeywords: ['Aktivität', 'Aktivitätsdiagramm', 'UML', 'Ablauf'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie den darzustellenden Ablauf in eigenen Worten und identifizieren Sie die beteiligten Rollen/Swimlanes.',
        points: [5, 7],
        operator: 'beschreiben',
        gradingHint: 'Jede korrekt identifizierte Rolle/Aktivität = Teilpunkte.',
      },
      {
        taskType: 'plantuml',
        prompt: 'Erstellen Sie ein UML-Aktivitätsdiagramm des Ablaufs mit Start-/Endknoten, Aktivitäten, Verzweigungen und ggf. Swimlanes.',
        points: [13, 17],
        operator: 'entwerfen',
        diagramType: 'uml_activity',
        gradingHint: 'Je Aktivität 1P, je Entscheidung/Verzweigung 2P, Start+Ende vorhanden 2P, Swimlanes (falls gefordert) 2P. Alternative Lösungen akzeptieren.',
      },
    ],
  },

  // ER-Modell-Aufgabe (neu entwerfen oder vervollständigen)
  {
    id: 't1_er_modell',
    weight: 7,
    containsDiagram: true,
    topicKeywords: ['ER', 'Datenmodell', 'Relational', 'Datenbank'],
    subtasks: [
      {
        taskType: 'plantuml',
        prompt: 'Erstellen Sie ein ER-Diagramm für das beschriebene Szenario. Geben Sie Entitätstypen, Attribute (inkl. Primärschlüssel) und Beziehungen mit Kardinalitäten an.',
        points: [14, 18],
        operator: 'entwerfen',
        diagramType: 'er',
        gradingHint: 'Je Entitätstyp 1P, je Primärschlüssel 0.5P, je Attribut 0.5P, je Beziehung mit Kardinalität 2P, Attribute an m:n-Beziehung 2P.',
      },
      {
        taskType: 'freitext',
        prompt: 'Überführen Sie eine der m:n-Beziehungen in ein relationales Modell (Tabellenstruktur mit PK und FK angeben).',
        points: [5, 8],
        operator: 'entwerfen',
        gradingHint: 'Zwischentabelle mit korrekten PK/FK = volle Punkte. Tabellennamen frei wählbar.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie einen geeigneten Datentyp für 3 ausgewählte Attribute (z.B. Datum, Text, Zahl) und begründen Sie kurz.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint: 'Je Attribut 1P bei korrektem Datentyp. VarChar/String/Text als Synonyme akzeptieren.',
      },
    ],
  },

  // UI-Darstellungsform + Mockup
  {
    id: 't1_ui_darstellung',
    weight: 6,
    topicKeywords: ['UI', 'Darstellung', 'Mockup', 'Oberfläche', 'User Interface'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 3 mögliche Darstellungsformen für die beschriebene Funktion und beschreiben Sie diese jeweils kurz.',
        points: [6, 8],
        operator: 'nennen',
        gradingHint: 'Liste/Kachel/Karte/Tabelle = Standard. Je Darstellung 1/3 der Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Entscheiden Sie sich für eine der Darstellungsformen und begründen Sie Ihre Wahl (mindestens 3 Sätze).',
        points: [4, 6],
        operator: 'entwerfen',
        gradingHint: '1P Entscheidung + Rest für passende Argumentation im Kontext {{UNTERNEHMEN}}.',
      },
      {
        taskType: 'freitext',
        prompt: 'Skizzieren Sie das Mockup der gewählten Darstellungsform als ASCII-Skizze oder in beschreibenden Stichworten (Überschrift, Eingabefelder/Anzeigen, Aktionen).',
        points: [8, 12],
        operator: 'entwerfen',
        gradingHint: '1P Überschrift, 2P Eingabefelder, 2P Beschriftung, 2P Aktionen (Speichern/Abbrechen). Alternative Darstellungen voll punkten.',
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
        prompt: 'Beschreiben Sie die Notwendigkeit eines Testkonzepts für das Projekt bei {{UNTERNEHMEN}}.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint: 'Zwei Begründungen (Fehler früh erkennen, Qualität sichern, ...) = volle Punkte.',
      },
      {
        taskType: 'table',
        prompt: 'Füllen Sie die Tabelle aus: Nennen Sie 4 Teststufen mit Beschreibung und einem konkreten Beispiel aus dem Projekt.',
        points: [12, 16],
        operator: 'nennen',
        tableColumns: ['Teststufe', 'Beschreibung', 'Beispiel aus dem Projekt'],
        tableRowCount: 4,
        tableKind: 'guided',
        fixedFirstColumn: false,
        tableDescription:
          'Teststufen-Tabelle: Unit-Test, Integrationstest, Systemtest, Abnahmetest — je mit Kurzbeschreibung und projektkonkretem Beispiel.',
        gradingHint: 'Je vollständige Zeile (Stufe + Beschreibung + Beispiel) 1/4 der Punkte. Bei fehlerhafter Zuordnung Teilpunkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie 3 weitere Inhalte, die in einem Testkonzept enthalten sein sollten.',
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
        prompt: 'Erläutern Sie den Unterschied zwischen symmetrischer und asymmetrischer Verschlüsselung.',
        points: [5, 7],
        operator: 'erlaeutern',
        gradingHint: 'Symm.: ein Schlüssel für beide Seiten. Asymm.: Public+Private-Key. Beide Aspekte = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie das Prinzip der hybriden Verschlüsselung am Beispiel des TLS-Handshakes und nennen Sie den Grund für den hybriden Ansatz.',
        points: [5, 7],
        operator: 'erlaeutern',
        gradingHint: 'Asymm. zum Schlüsselaustausch + symm. für Nutzdaten + Performance-Grund. Kernidee = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie, wie mithilfe einer lokalen Certificate Authority die Authentizität von Diensten sichergestellt werden kann.',
        points: [3, 4],
        operator: 'beschreiben',
        gradingHint: 'CA signiert Zertifikate + Clients prüfen Signatur + Widerrufsprüfung = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie je einen Vor- und einen Nachteil einer zentralen Rechteverwaltung (Identity Provider / SSO).',
        points: [4, 6],
        operator: 'nennen',
        gradingHint: 'Je Vor-/Nachteil halbe Punkte. Bsp. Vorteil: zentrale Übersicht. Nachteil: Single Point of Failure.',
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
        prompt: 'Beschreiben Sie, was eine CI/CD-Pipeline ist und bei welchen Ereignissen sie typischerweise ausgelöst wird.',
        points: [3, 4],
        operator: 'beschreiben',
        gradingHint: 'Automatisierte Abfolge bei Commit/Tag/PR. Kernidee + Trigger = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 4 Vorteile einer CI/CD-Pipeline für die Entwicklung bei {{UNTERNEHMEN}}.',
        points: [8, 10],
        operator: 'nennen',
        gradingHint: 'Je Vorteil 1/4 der Punkte. Z.B. automatische Tests, einheitliche Deploys, Rollback, weniger manueller Zugriff.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, wie ein Rollback bei einer defekten Deployment-Version aussehen kann.',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint: 'Alte Pipeline erneut ausführen / vorherigen Container deployen / Git-Tag zurücksetzen = volle Punkte.',
      },
    ],
  },

  // OOP / Entwurfsmuster (S25 Aufgabe 4)
  {
    id: 't1_oop_entwurf',
    weight: 5,
    topicKeywords: ['OOP', 'Entwurfsmuster', 'Factory', 'Singleton', 'Observer', 'abstrakt', 'Interface'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie das Factory-Entwurfsmuster in 3 Stichpunkten.',
        points: 6,
        operator: 'beschreiben',
        cascade: true,
        gradingHint: 'Je Stichpunkt 2P: Erzeugung über Basisklasse / Konstruktor-Aufruf in Methode / Überschreiben in Unterklassen.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, welche Voraussetzung die erzeugten Klassen erfüllen müssen, damit das Factory-Muster funktioniert.',
        points: 3,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint: 'Gemeinsame Basisklasse ODER gemeinsames Interface = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie die Besonderheiten einer abstrakten Klasse (mindestens 3 Aspekte).',
        points: [5, 7],
        operator: 'erlaeutern',
        gradingHint: 'Mind. 1 abstrakte Methode / nicht instanziierbar / vollständig def. Methoden erlaubt / Attribute erlaubt.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie ein weiteres Entwurfsmuster und beschreiben Sie dessen Zweck.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint: 'Singleton/Observer/Strategy/Adapter — je mit Kurzbeschreibung = volle Punkte.',
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
        prompt: 'Berechnen Sie den Gesamtaufwand bzw. die Gesamtkosten für das beschriebene Teilprojekt. Zeigen Sie den Rechenweg und geben Sie das Ergebnis mit Einheit an.',
        points: [10, 15],
        operator: 'berechnen',
        gradingHint: 'Rechenweg 50% / korrektes Ergebnis 50%. Bei Folgefehlern nur Ausgangsfehler abziehen.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, welchen Einfluss eine Verlängerung eines kritischen Vorgangs um einen Tag auf den Projektendtermin hat.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint: 'Kritischer Pfad → direkte Verschiebung. Nicht-kritisch → Pufferzeit. Korrekte Antwort je nach Kontext.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 2 Kostenfaktoren, die in der Praxis oft unterschätzt werden.',
        points: [4, 5],
        operator: 'nennen',
        gradingHint: 'Je Kostenfaktor (Einarbeitung, Meetings, Testaufwand, ...) halbe Punkte.',
      },
    ],
  },
];

// ─── TEIL 2 REZEPTE ──────────────────────────────────────────────────────────

const RECIPES_TEIL2: TaskRecipe[] = [
  // SQL SELECT mit JOIN — meistgenutzte Form
  {
    id: 't2_sql_join',
    weight: 10,
    topicKeywords: ['SQL', 'JOIN', 'SELECT'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie den Zweck eines JOIN und nennen Sie mindestens 2 JOIN-Arten.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint: 'Verknüpfung von Tabellen + INNER/LEFT/RIGHT/FULL = volle Punkte.',
      },
      {
        taskType: 'sql',
        prompt: 'Formulieren Sie eine SQL-SELECT-Abfrage mit einem JOIN über mindestens zwei Tabellen für das beschriebene Szenario. Geben Sie nur das SQL-Statement an.',
        points: [12, 16],
        operator: 'entwerfen',
        gradingHint: 'Syntax 20% / korrekte Tabellen+Spalten 30% / JOIN-Bedingung 30% / WHERE/ORDER 20%.',
      },
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie, wie die Abfrage optimiert werden könnte (mindestens 2 Ansätze).',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint: 'Je Ansatz halbe Punkte: Index, WHERE-Filter, nur benötigte Spalten, LIMIT, ...',
      },
    ],
  },

  // SQL GROUP BY / Aggregation
  {
    id: 't2_sql_groupby',
    weight: 7,
    topicKeywords: ['SQL', 'GROUP BY', 'Aggregation', 'Aggregat'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 3 Aggregatfunktionen und erläutern Sie jeweils kurz ihren Zweck.',
        points: 6,
        operator: 'nennen',
        cascade: true,
        gradingHint: 'COUNT, SUM, AVG, MIN, MAX — je 2P für Name + korrekte Beschreibung.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie den Unterschied zwischen WHERE und HAVING.',
        points: 3,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint: 'WHERE: Zeilenfilter vor Aggregation. HAVING: Filter nach Aggregation.',
      },
      {
        taskType: 'sql',
        prompt: 'Formulieren Sie eine SQL-Abfrage mit GROUP BY und mindestens einer Aggregatfunktion für das Szenario. Ergänzen Sie bei Bedarf HAVING.',
        points: [12, 16],
        operator: 'entwerfen',
        gradingHint: 'GROUP BY korrekt 30% / Aggregatfunktion 30% / WHERE+HAVING 20% / Ergebnismenge 20%.',
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
        prompt: 'Erläutern Sie den Unterschied zwischen DDL und DML und nennen Sie jeweils ein Beispiel.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint: 'DDL=Struktur (CREATE/ALTER/DROP), DML=Daten (SELECT/INSERT/UPDATE/DELETE). Beispiele beider Gruppen.',
      },
      {
        taskType: 'sql',
        prompt: 'Schreiben Sie ein CREATE TABLE-Statement inkl. Primärschlüssel, Fremdschlüssel und passenden Datentypen für das Szenario.',
        points: [13, 17],
        operator: 'entwerfen',
        gradingHint: 'Tabellenname+Spalten 30%, Datentypen 20%, PK 20%, FK 20%, NOT NULL/weitere Constraints 10%.',
      },
      {
        taskType: 'table',
        prompt: 'Geben Sie für 3 der definierten Attribute den passenden Datentyp an.',
        points: [3, 4],
        operator: 'nennen',
        tableColumns: ['Attribut', 'Datentyp'],
        tableRowCount: 3,
        tableKind: 'guided',
        tableDescription:
          'Datentyp-Tabelle: je Zeile 1 konkretes Attribut aus dem Szenario und der passende SQL-Datentyp (Integer, VarChar, Date, Boolean, ...).',
        gradingHint: 'Je korrekte Zeile 1/3 der Punkte. VarChar/String/Text als Synonyme akzeptieren.',
      },
    ],
  },

  // Pseudocode-Fehler finden + korrigieren (W22/23 Aufgabe 2)
  {
    id: 't2_pseudocode_debug',
    weight: 7,
    topicKeywords: ['Pseudocode', 'Rekursion', 'Algorithmus', 'Fehler'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Im questionText ist ein Pseudocode-Fragment (mit Zeilennummern) gegeben. Führen Sie den Code für 2 konkrete Testfälle gedanklich aus und geben Sie das erwartete und das tatsächliche Ergebnis in einer Tabelle an.',
        points: [4, 6],
        operator: 'identifizieren',
        gradingHint: 'Je Testfall (Eingabe+Erwartet+Tatsächlich) halbe Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Benennen Sie den Fehler im Code (Zeile + Art des Fehlers) und korrigieren Sie ihn.',
        points: [4, 6],
        operator: 'identifizieren',
        gradingHint: '50% für korrekte Fehlerbeschreibung (mit Zeilenbezug), 50% für korrekte Korrektur.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie den Begriff Anweisungsüberdeckung und nennen Sie die Anzahl der für den Code notwendigen Testfälle.',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint: 'Jede Anweisung mind. 1× ausgeführt + konkrete Zahl für den gegebenen Code.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie je einen Vor- und einen Nachteil rekursiver Lösungen.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint: 'Vorteil: Eleganz / Lesbarkeit. Nachteil: Speicherbedarf / Stack Overflow.',
      },
    ],
  },

  // Pseudocode entwerfen
  {
    id: 't2_pseudocode_entwurf',
    weight: 6,
    topicKeywords: ['Pseudocode', 'Algorithmus', 'Sortier', 'Such'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie den Algorithmus in eigenen Worten (Ablauf, Bedingungen, Schleifenstruktur).',
        points: [5, 7],
        operator: 'beschreiben',
        gradingHint: 'Kernschritte + mindestens eine Abbruchbedingung = volle Punkte.',
      },
      {
        taskType: 'pseudocode',
        prompt: 'Implementieren Sie den beschriebenen Algorithmus als Pseudocode mit BEGIN/END, IF/ELSE und Schleife.',
        points: [12, 16],
        operator: 'entwerfen',
        gradingHint: 'Struktur 30% / Kontrollfluss 30% / Korrektheit 40%. Syntaktische Variationen zulässig.',
      },
      {
        taskType: 'freitext',
        prompt: 'Bewerten Sie die Komplexität Ihres Algorithmus in O-Notation und begründen Sie kurz.',
        points: [3, 5],
        operator: 'berechnen',
        gradingHint: 'Korrekte O-Notation + kurze Herleitung = volle Punkte.',
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
        prompt: 'Berechnen Sie den Speicherbedarf für das beschriebene Datenvolumen. Zeigen Sie den Rechenweg vollständig. Geben Sie das Ergebnis in einer passenden Einheit (KiB/MiB/GiB) an.',
        points: [10, 14],
        operator: 'berechnen',
        gradingHint: 'Rechenweg 60% / korrektes Ergebnis 40%. Rundungsdifferenzen akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie den Unterschied zwischen KB/MB/GB (dezimal) und KiB/MiB/GiB (binär).',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint: 'Dezimal: 1000er-Schritte. Binär: 1024er-Schritte. Beide Konzepte = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 2 Möglichkeiten, den Speicherbedarf des beschriebenen Datentyps zu reduzieren.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint: 'Kompression, geringere Auflösung, effizientere Kodierung, Delta-Encoding — je 1 Ansatz halbe Punkte.',
      },
    ],
  },

  // OOP Codebeispiel (Vererbung/Polymorphismus)
  {
    id: 't2_oop_code',
    weight: 6,
    topicKeywords: ['OOP', 'Vererbung', 'Polymorphismus', 'Klasse', 'Interface', 'generisch'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie den Begriff Polymorphismus und geben Sie ein einfaches Codebeispiel (Pseudocode reicht).',
        points: [5, 7],
        operator: 'erlaeutern',
        gradingHint: 'Definition + Beispiel mit Methoden-Überschreibung = volle Punkte.',
      },
      {
        taskType: 'pseudocode',
        prompt: 'Schreiben Sie eine Methode, die eine Liste von Objekten einer gegebenen Basisklasse nach einem Attribut sortiert. Pseudocode reicht.',
        points: [10, 14],
        operator: 'entwerfen',
        gradingHint: 'Listenverarbeitung 30% / Vergleichslogik 30% / Sortieralgorithmus 30% / Rückgabe 10%. Typkonflikte beachten.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, was eine generische Klasse ist und wann ihr Einsatz sinnvoll ist.',
        points: [3, 5],
        operator: 'erlaeutern',
        gradingHint: 'Typparametrisiert + Wiederverwendbarkeit = volle Punkte.',
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
        prompt: 'Erstellen Sie das relationale Datenmodell in Tabellenform für das beschriebene Szenario (mindestens 3 Tabellen).',
        points: [12, 16],
        operator: 'entwerfen',
        tableColumns: ['Tabellenname', 'Attribute (PK, FK, Datentyp)', 'Beziehung'],
        tableRowCount: 4,
        tableKind: 'guided',
        tableDescription:
          'Datenmodell-Tabelle: je Zeile 1 Tabelle mit Name, Attributen (PK/FK markiert, Datentyp) und Beziehungsangaben (z.B. 1:n zu kunde).',
        gradingHint: 'Je Tabelle mit allen Attributen 1P, je PK 1P, je FK 1P, je Beziehung mit Kardinalität 1P. Alternative Strukturen akzeptieren.',
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
        prompt: 'Erläutern Sie, welche Normalform Ihr Modell erfüllt (1NF/2NF/3NF) und begründen Sie kurz.',
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
        gradingHint: 'Je Eigenschaft Bedeutung 1P, Beispiel 1P. Sinngemäße Erläuterungen akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, welche Probleme entstehen können, wenn die Isolation-Eigenschaft verletzt wird.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint: 'Lost Update / Dirty Read / Non-Repeatable Read / Phantom Read — je Phänomen Teilpunkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie einen konkreten Mechanismus, mit dem Datenbanksysteme Isolation sicherstellen.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint: 'Sperrverfahren (Locks) / MVCC / Transactional Isolation Levels — jeweils = volle Punkte.',
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
        prompt: 'Erläutern Sie den Unterschied zwischen „wohlgeformt" und „gültig" bei XML-Dokumenten.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint: 'Wohlgeformt = XML-Regeln eingehalten. Gültig = zusätzlich DTD/Schema erfüllt. Beide Konzepte = volle Punkte.',
      },
      {
        taskType: 'table',
        prompt: 'Im questionText ist ein fehlerhaftes XML-Dokument mit Zeilennummern gegeben. Tragen Sie die Fehler mit Zeile, Beschreibung und Fehlerart (Wohlgeformtheit/Gültigkeit) in die Tabelle ein.',
        points: [10, 14],
        operator: 'identifizieren',
        tableColumns: ['Zeile', 'Beschreibung', 'Fehlerart (Wohlgeformt/Gültig)'],
        tableRowCount: 5,
        tableKind: 'guided',
        tableDescription:
          'XML-Fehlertabelle: je Zeile 1 Fehler mit Zeilennummer + kurzer Beschreibung + Fehlerart.',
        gradingHint: 'Je vollständige Zeile (alle 3 Spalten korrekt) 2P. Teilpunkte bei 2 von 3 Spalten.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, wofür eine DTD in XML verwendet wird.',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint: 'Vokabular + Grammatik festlegen + Dokumentinstanz-Validierung = volle Punkte.',
      },
    ],
  },

  // UML-Sequenz / Klassendiagramm zu Code
  {
    id: 't2_uml_sequenz',
    weight: 4,
    containsDiagram: true,
    topicKeywords: ['Sequenzdiagramm', 'UML', 'Klassendiagramm'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie den Ablauf in eigenen Worten und identifizieren Sie die beteiligten Objekte/Klassen.',
        points: [5, 7],
        operator: 'beschreiben',
        gradingHint: 'Je korrekt identifiziertes Objekt Teilpunkte.',
      },
      {
        taskType: 'plantuml',
        prompt: 'Erstellen Sie ein UML-Sequenzdiagramm des Ablaufs mit Lebenslinien, synchronen/asynchronen Nachrichten und Rückgaben.',
        points: [13, 17],
        operator: 'entwerfen',
        diagramType: 'uml_sequence',
        gradingHint: 'Je Lifeline 1P, je Nachricht 1P, Rückgaben 2P, korrekte Reihenfolge 3P.',
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
        prompt: 'Formuliere eine IHK-typische Wissensfrage als Single-Choice (genau 4 Optionen A–D, nur EINE korrekt).',
        points: 4,
        operator: 'identifizieren',
        gradingHint: 'Binäre Bewertung: richtig = volle Punkte, falsch = 0. Teilpunkte gibt es bei MC nicht.',
      },
      {
        taskType: 'freitext',
        prompt: 'Berechnen oder erläutern Sie den beschriebenen Sachverhalt kurz.',
        points: 6,
        operator: 'erlaeutern',
        gradingHint: 'Fachlich korrekte Antwort = volle Punkte. Bei Berechnung Rechenweg nicht zwingend.',
      },
    ],
  },
  {
    id: 't3_mcmulti_freitext',
    weight: 20,
    subtasks: [
      {
        taskType: 'mc_multi',
        prompt: 'Formuliere eine IHK-typische Mehrfachauswahlfrage (4 Optionen A–D, 2 oder 3 korrekt).',
        points: 5,
        operator: 'identifizieren',
        gradingHint: 'Je korrekt markierter Option Teilpunkte, je falsch markierter Abzug (nie negativ).',
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
        prompt: 'Formuliere eine thematisch passende Single-Choice-Frage (4 Optionen A–D, 1 korrekt).',
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
        prompt: 'Formuliere eine IHK-typische Wissensfrage als Single-Choice (4 Optionen A–D, 1 korrekt).',
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
        prompt: 'Formuliere eine IHK-typische Wissensfrage als Single-Choice (4 Optionen A–D, 1 korrekt).',
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
function selectRecipe(
  part: ExamPart,
  topic: string,
  avoidDiagram: boolean,
): TaskRecipe {
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

function buildSubtaskSchema(
  spec: SubtaskSpec,
  label: string,
  points: number,
): string {
  switch (spec.taskType) {
    case 'mc':
      return `{"label":"${label}","taskType":"mc","questionText":"FRAGE?","points":${points},"mcOptions":[{"id":"A","text":"Antwort A"},{"id":"B","text":"Antwort B"},{"id":"C","text":"Antwort C"},{"id":"D","text":"Antwort D"}],"expectedAnswer":{"correctOption":"X","explanation":"Begründung"}}`;
    case 'mc_multi':
      return `{"label":"${label}","taskType":"mc_multi","questionText":"FRAGE?","points":${points},"mcOptions":[{"id":"A","text":"Aussage A"},{"id":"B","text":"Aussage B"},{"id":"C","text":"Aussage C"},{"id":"D","text":"Aussage D"}],"expectedAnswer":{"correctOptions":["A","C"],"explanation":"Begründung"}}`;
    case 'sql':
      return `{"label":"${label}","taskType":"sql","questionText":"FRAGE mit Tabellenstruktur(en) im Text","points":${points},"expectedAnswer":{"solutionSql":"SELECT ...;","keyElements":["SELECT","JOIN"],"gradingHint":"${(spec.gradingHint ?? '').replace(/"/g, "'")}"}}`;
    case 'table': {
      const ffc = spec.fixedFirstColumn && spec.fixedFirstColumnValues
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
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
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
  const system = `Du bist IHK-Prüfungsersteller für ${specialtyLabel} AP2. Antworte NUR mit gültigem JSON, kein Markdown.

WICHTIGE REGELN:
- Platzhalter {{UNTERNEHMEN}}, {{BRANCHE}}, {{PRODUKT}}, {{MITARBEITER}} dürfen im questionText verwendet werden — sie werden beim Prüfungsstart ersetzt.
- In "expectedAnswer" und "explanation" dürfen KEINE {{PLATZHALTER}} stehen. Formulieren Sie dort szenario-neutral.
- Sprache: Deutsch. Stil: knapp, sachlich, IHK-typisch.
- Die Fragen müssen konkret und prüfungsreif sein — kein "erkläre allgemein X", sondern "Erläutern Sie, wie X im Kontext der Anwendung funktioniert".

MULTIPLE-CHOICE EINZELAUSWAHL (mc):
- Genau 4 konkrete Antwortoptionen (A, B, C, D). Alle Optionen plausibel formuliert.
- "correctOption": genau einer der Buchstaben (A/B/C/D), variiere die Position.
- "explanation": kurze Begründung, warum diese Option richtig ist (ohne {{PLATZHALTER}}).

MULTIPLE-CHOICE MEHRFACHAUSWAHL (mc_multi):
- Genau 4 konkrete Aussagen (A, B, C, D).
- "correctOptions": Array mit 2 oder 3 Buchstaben (NIE 0, NIE 4).
- "explanation": kurz, warum diese Aussagen zutreffen (ohne {{PLATZHALTER}}).

SQL-AUFGABEN (sql):
- questionText MUSS die benötigten Tabellenstrukturen textuell enthalten, z.B. "Tabelle mitarbeiter(id PK, name, abteilung_id FK)".
- "solutionSql": beispielhafte Musterlösung (kein Markdown).
- "keyElements": Liste der Pflicht-Bausteine, z.B. ["SELECT mit JOIN", "WHERE name = ..."].
- "gradingHint": wird aus dem Rezept übernommen, NICHT verändern.

TABELLEN (table):
- "columns": konkrete themenspezifische Spaltennamen. Bei flexible/guided: anpassen. Bei fixed: Vorgabe nicht ändern.
- "exampleRow": EINE vollständig ausgefüllte Musterzeile (Anzahl Einträge = Anzahl Spalten).
- "firstColumnValues": nur wenn erste Spalte vorbelegt sein soll (Bei "fixed" ist das Pflicht).
- "keyPoints" in expectedAnswer: 2–4 inhaltliche Musterlösungs-Stichpunkte.

PLANTUML / ER (plantuml):
- "expectedElements": mind. 3 konkret zu erwartende Elemente (z.B. bei ER "Entität Kunde", "Beziehung 1:n Kunde-Bestellung").

OPERATOREN (Prüfungsdimension):
- "nennen" → Stichworte reichen, Kürze akzeptiert
- "beschreiben" → Sachverhalt in eigenen Worten, 2–3 Sätze
- "erklären"/"erläutern" → mit Begründung, 3–5 Sätze
- "berechnen" → Rechenweg + Ergebnis mit Einheit
- "entwerfen" → konkrete Umsetzung (Code/Diagramm/Tabelle)
- "vergleichen" → Gegenüberstellung mit Kriterien
- "identifizieren" → Fehler/Elemente finden und benennen

AUSGABE: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne umgebenden Text.`;

  const user = `Thema: "${topic}"

Erstelle eine Prüfungsaufgabe aus ${recipe.subtasks.length} Unteraufgaben:

${subtaskInstructions}

Gib folgendes JSON zurück. Ersetze FRAGE durch den konkreten IHK-typischen Aufgabentext und die Platzhalter in mcOptions, expectedAnswer etc. durch echte Inhalte:
{"topicArea":"${topic}","pointsValue":${totalPoints},"difficulty":"medium","subtasks":[${schemas.join(',')}]}`;

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
    st.expectedAnswer.explanation = (st.expectedAnswer.explanation as string).replace(/\{\{[A-Z_]+\}\}/g, '');
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
  const raw = String(st.expectedAnswer?.correctOption ?? '').toUpperCase().trim();
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
  const normalised = rawList.map((v) => String(v).toUpperCase().trim()).filter((v) => validIds.has(v));
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
    st.expectedAnswer.gradingHint = 'Bewertung nach SQL-Syntax, korrekten Tabellen-/Spaltenbezügen und Ergebnismenge.';
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
      expectedAnswer: { keyPoints: [], ...(spec.gradingHint ? { gradingHint: spec.gradingHint } : {}) },
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
        task = await generateOneTask(part, topic, serverApiKey!, avoidDiagram, serverMeta!, specialty);
        warnings.push({
          topic,
          source: 'server_ai',
          message: `„${topic}": ${userMeta?.label ?? 'KI'} fehlgeschlagen (${truncate(userError ?? 'Fehler')}). Server-KI (${serverMeta!.label}) eingesprungen.`,
        });
      } catch (err) {
        serverError = err instanceof Error ? err.message : String(err);
        console.warn(`[generator] "${topic}" Server-AI fehlgeschlagen: ${serverError.slice(0, 120)}`);
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

    const hasDiagram = task.subtasks.some((st) => st.taskType === 'plantuml' || st.taskType === 'diagram_upload');
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
