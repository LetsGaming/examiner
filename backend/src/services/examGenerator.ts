/**
 * examGenerator.ts — AI-powered IHK exam task generation.
 *
 * Generates structured exam tasks via three-tier fallback:
 *   1. User's configured AI provider
 *   2. Server-configured AI provider (if distinct)
 *   3. Static placeholder task (always succeeds, lower quality)
 *
 * Topics and scenarios live in ./topics.ts and ./scenarios.ts.
 * Templates mirror real IHK AP2 question distributions from Winter 2023/24.
 */
import type { ExamPart, TaskType, DiagramType, TableConfig, Specialty } from '../types/index.js';
import { callAiProvider } from './aiService.js';
import type { ProviderMeta } from '../routes/settingsRoutes.js';
import { getTopics } from './topics.js';
import { SCENARIOS, applyScenario } from './scenarios.js';
export { SCENARIOS, applyScenario };

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface GeneratedSubTask {
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
  difficulty: "easy" | "medium" | "hard";
  subtasks: GeneratedSubTask[];
}

// ─── Minimaler OpenAI-Aufruf ──────────────────────────────────────────────────
// Jede Anfrage generiert EINE Aufgabe mit EINER oder ZWEI Unteraufgaben.
// Kleine Antworten = robustes JSON, kein Truncation-Problem.

/**
 * Provider-agnostic call for task generation.
 * Combines system + user prompt into a single message (all providers support that).
 * The meta object determines which API/model is actually called.
 */
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  _maxTokens = 800,
  meta?: ProviderMeta,
): Promise<string> {
  // Combine system + user prompt — works across all providers
  const combined = `${systemPrompt}\n\n${userPrompt}`;
  if (meta) {
    return callAiProvider(combined, apiKey, meta);
  }
  // Legacy fallback if called without meta (should not happen in normal flow)
  throw new Error(
    "Kein AI-Provider konfiguriert. Bitte in den Einstellungen einen API-Key hinterlegen.",
  );
}

// ─── JSON sicher parsen ───────────────────────────────────────────────────────

function safeParseTask(raw: string): GeneratedTask | null {
  try {
    const obj = JSON.parse(raw);
    // Validierung: Pflichtfelder vorhanden?
    if (
      typeof obj.topicArea === "string" &&
      typeof obj.pointsValue === "number" &&
      Array.isArray(obj.subtasks) &&
      obj.subtasks.length > 0
    ) {
      return obj as GeneratedTask;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Aufgaben-Templates basierend auf echter IHK-Prüfungsanalyse ─────────────
//
// Analyse der echten Prüfungen Winter 2023/24:
//
// TEIL 1 (Planung, 4 Aufgaben à ~25P):
//   Aufgabenformen in Häufigkeit:
//   - Freitext/Erläuterung (nennen, beschreiben, erläutern)  ~55%
//   - Tabellen ausfüllen (Stakeholder, ACID, Vergleiche)     ~20%
//   - UML-Diagramm zeichnen (Aktivität, Use-Case, ER)        ~15%
//   - Zuordnung / strukturierte Liste                         ~10%
//   → UML maximal 1× pro Prüfung, meistens als letzter Teil einer Aufgabe
//
// TEIL 2 (Entwicklung, 4 Aufgaben à ~25P):
//   - Freitext (Konzepte, Erklärungen, ACID, Vergleiche)     ~30%
//   - SQL (SELECT, JOIN, GROUP BY, UPDATE)                    ~25%
//   - Pseudocode / Algorithmus                               ~20%
//   - UML-Diagramm (Sequenz, Klasse, relationales Modell)    ~15%
//   - Berechnung (Speicher, Kosten, Kennzahlen)              ~10%
//   → SQL und Pseudocode dominieren, UML maximal 1× pro Prüfung
//
// TEIL 3 (WiSo, 30 Aufgaben):
//   - Multiple Choice (Einzelauswahl)                        ~70%
//   - Freitext / Berechnung                                  ~20%
//   - Reihenfolge / Zuordnung                                ~10%
//   → Kein UML, kein Pseudocode, kein Code

// ─── Template-Definition ─────────────────────────────────────────────────────

interface TaskTemplate {
  typeA: TaskType;
  typeB: TaskType;
  tableSide?: "a" | "b"; // welche Unteraufgabe ist eine Tabelle
  /** Spaltenvorschlag an die KI — darf kontextuell verfeinert werden. Nur bei tableKind === "fixed-columns" ist es bindend. */
  tableColumns?: string[];
  tableRowCount?: number; // Anzahl auszufüllender Zeilen
  fixedFirstColumn?: boolean; // erste Spalte vorausgefüllt
  /** Bindende Werte für die erste Spalte (z.B. ACID: ["Atomicity","Consistency","Isolation","Durability"]). */
  fixedFirstColumnValues?: string[];
  /** Wie frei darf die KI die Spalten gestalten? 
   *  - "flexible": KI darf Spalten komplett umbenennen/austauschen passend zum Thema
   *  - "guided":   KI nimmt die vorgegebenen Spalten als Basis, darf sie aber an den konkreten Themenkontext anpassen
   *  - "fixed":    Spalten sind bindend (für Template-semantisch notwendige Fälle wie ACID) */
  tableKind?: "flexible" | "guided" | "fixed";
  /** Kurze semantische Beschreibung der Tabelle für die KI (z.B. "Stakeholder-Tabelle: Rolle, Interesse, Einfluss"). */
  tableDescription?: string;
  diagramTypeB?: DiagramType;
  weight: number; // relative Häufigkeit (höher = öfter gewählt)
  promptA: string; // Aufgabenform für Unteraufgabe a
  promptB: string; // Aufgabenform für Unteraufgabe b
  ptsA: number;
  ptsB: number;
}

// Gewichtete Templates für Teil 1 — exakt nach echter IHK-Verteilung
const TEMPLATES_TEIL1: TaskTemplate[] = [
  // Freitext + Freitext — häufigste Form (~40%)
  {
    typeA: "freitext",
    typeB: "freitext",
    weight: 40,
    promptA:
      "Nennen und erläutern Sie 3 Aspekte/Punkte zu folgendem Thema (je 2P). Stichworte reichen.",
    promptB:
      "Beschreiben Sie Maßnahmen, Vorteile oder Risiken. Begründen Sie Ihre Aussagen.",
    ptsA: 12,
    ptsB: 10,
  },

  // Freitext + Tabellen-Beispiele aufzählen (~20%)
  // Wichtig: beides ist Freitext — keine "Tabelle ausfüllen"-Formulierung, damit
  // der Prüfling nicht eine Tabelle erwartet wo nur Fließtext kommt.
  {
    typeA: "freitext",
    typeB: "freitext",
    weight: 20,
    promptA:
      "Erläutern Sie den Begriff/das Konzept im Kontext von {{UNTERNEHMEN}}. (3–4 Sätze)",
    promptB:
      "Nennen Sie 3 Beispiele und erläutern Sie diese jeweils in 1–2 Sätzen.",
    ptsA: 10,
    ptsB: 12,
  },

  // Freitext + UML (~15%) — nur 1× pro Prüfung erlaubt, wird durch Pool-Kontrolle gesteuert
  {
    typeA: "freitext",
    typeB: "plantuml",
    weight: 15,
    diagramTypeB: "uml_activity",
    promptA:
      "Erläutern Sie die Anforderungen und Ziele im Kontext von {{UNTERNEHMEN}}.",
    promptB:
      "Erstellen Sie ein UML-Aktivitätsdiagramm für den beschriebenen Ablauf.",
    ptsA: 10,
    ptsB: 15,
  },

  // User Story / Anforderungsanalyse (~15%)
  {
    typeA: "freitext",
    typeB: "freitext",
    weight: 15,
    promptA:
      "Nennen Sie 3 Stakeholder und deren jeweiliges Interesse am Projekt bei {{UNTERNEHMEN}}. Je Stakeholder 1–2 Sätze.",
    promptB:
      'Formulieren Sie 2 User Stories nach dem Schema "Als <Rolle> möchte ich <Ziel>, damit <Nutzen>".',
    ptsA: 9,
    ptsB: 13,
  },

  // Konzept erklären + Darstellungsform begründen (~5%)
  {
    typeA: "freitext",
    typeB: "freitext",
    weight: 5,
    promptA:
      "Beschreiben Sie das Konzept und nennen Sie 2 konkrete Ziele, die {{UNTERNEHMEN}} damit verfolgt.",
    promptB:
      "Entscheiden Sie sich für eine geeignete UI-Darstellungsform und begründen Sie Ihre Wahl in 3–4 Sätzen.",
    ptsA: 8,
    ptsB: 14,
  },

  // ── Tabellen-Aufgaben (~20%) ─────────────────────────────────────────────
  // Echte IHK: Stakeholder-Tabelle, ACID-Tabelle, Vergleichstabellen, Zuordnungen

  // Stakeholder-Analyse als Tabelle
  {
    typeA: "table",
    typeB: "freitext",
    weight: 7,
    tableSide: "a",
    tableColumns: ["Stakeholder", "Interesse", "Einfluss (hoch/mittel/gering)"],
    tableRowCount: 3,
    fixedFirstColumn: false,
    tableKind: "guided",
    tableDescription:
      "Stakeholder-Analyse: je Zeile ein konkreter Stakeholder des Projekts (Rolle/Person), dessen Interesse am Projekt, und dessen Einfluss.",
    promptA:
      "Nennen Sie 3 Stakeholder des Projekts bei {{UNTERNEHMEN}} und beschreiben Sie deren Interesse und Einfluss.",
    promptB:
      "Erläutern Sie, wie Widerstände eines der genannten Stakeholder überwunden werden können.",
    ptsA: 9,
    ptsB: 9,
  },

  // Vergleichstabelle (z.B. Vorgehensmodelle, Datenbanktypen)
  {
    typeA: "freitext",
    typeB: "table",
    weight: 7,
    tableSide: "b",
    tableColumns: ["Kriterium", "Option A", "Option B"],
    tableRowCount: 4,
    fixedFirstColumn: true,
    tableKind: "flexible",
    tableDescription:
      "Vergleichstabelle: Spalten sind das Vergleichskriterium + zwei konkrete Vergleichsobjekte. Ersetze 'Option A' und 'Option B' durch die realen Namen (z.B. 'Scrum' vs 'Wasserfall', 'MySQL' vs 'MongoDB'). Erste Spalte enthält 4 konkrete, themenrelevante Kriterien (z.B. 'Planungsaufwand', 'Flexibilität bei Änderungen'). Spaltennamen dürfen komplett neu gesetzt werden.",
    promptA:
      "Erläutern Sie den Unterschied zwischen den beiden Konzepten im Kontext von {{UNTERNEHMEN}}.",
    promptB:
      "Füllen Sie die Vergleichstabelle aus. Die Vergleichskriterien sind vorgegeben, tragen Sie die Ausprägungen für beide Optionen ein.",
    ptsA: 8,
    ptsB: 14,
  },

  // Testkonzept / Qualitätssicherung als Tabelle
  {
    typeA: "freitext",
    typeB: "table",
    weight: 6,
    tableSide: "b",
    tableColumns: ["Teststufe", "Beschreibung", "Beispiel"],
    tableRowCount: 3,
    fixedFirstColumn: false,
    tableKind: "guided",
    tableDescription:
      "Teststufen-Tabelle: je Zeile eine Teststufe (z.B. Unit-Test, Integrationstest, Systemtest, Abnahmetest) mit Kurzbeschreibung und konkretem Beispiel aus dem Szenario.",
    promptA:
      "Beschreiben Sie die Notwendigkeit eines Testkonzepts für das Projekt bei {{UNTERNEHMEN}}.",
    promptB:
      "Füllen Sie die Tabelle aus: Nennen Sie 3 Teststufen mit Beschreibung und einem konkreten Beispiel.",
    ptsA: 8,
    ptsB: 14,
  },
];

// Gewichtete Templates für Teil 2 — exakt nach echter IHK-Verteilung
// SQL ist eigenständiger TaskType (nicht mehr pseudocode-getarnt).
// Gewichtung: SQL ~40%, Pseudocode ~20%, Freitext ~20%, Tabelle ~12%, UML ~8%
const TEMPLATES_TEIL2: TaskTemplate[] = [
  // ── SQL-Aufgaben (~40%) ──────────────────────────────────────────────────
  // SELECT + JOIN (~12%)
  {
    typeA: "freitext",
    typeB: "sql",
    weight: 12,
    promptA:
      "Erläutern Sie das Datenbankkonzept und nennen Sie 2 Vorteile für {{UNTERNEHMEN}}.",
    promptB:
      "Formulieren Sie eine SQL-SELECT-Abfrage mit einem JOIN über zwei Tabellen für das beschriebene Szenario. Geben Sie nur das SQL-Statement an.",
    ptsA: 8,
    ptsB: 17,
  },

  // SELECT + GROUP BY / HAVING / Aggregation (~10%)
  {
    typeA: "freitext",
    typeB: "sql",
    weight: 10,
    promptA:
      "Beschreiben Sie, welche Aggregatfunktionen SQL anbietet und wofür sie eingesetzt werden.",
    promptB:
      "Formulieren Sie eine SQL-SELECT-Abfrage mit GROUP BY und einer Aggregatfunktion (COUNT, SUM, AVG, MIN oder MAX) für das beschriebene Szenario. Ergänzen Sie bei Bedarf eine HAVING-Bedingung.",
    ptsA: 8,
    ptsB: 17,
  },

  // CREATE TABLE (DDL) (~8%)
  {
    typeA: "freitext",
    typeB: "sql",
    weight: 8,
    promptA:
      "Erläutern Sie den Unterschied zwischen DDL und DML anhand je eines Beispiels.",
    promptB:
      "Schreiben Sie ein CREATE TABLE Statement inklusive Primär- und Fremdschlüsselangabe sowie passender Datentypen und NOT NULL Constraints für das beschriebene Szenario.",
    ptsA: 8,
    ptsB: 17,
  },

  // UPDATE / DELETE (DML Mutation) (~5%)
  {
    typeA: "freitext",
    typeB: "sql",
    weight: 5,
    promptA:
      "Erläutern Sie, warum bei UPDATE- und DELETE-Anweisungen eine WHERE-Klausel unverzichtbar ist. Nennen Sie ein Risiko.",
    promptB:
      "Formulieren Sie ein UPDATE- oder DELETE-Statement mit WHERE-Bedingung für das beschriebene Szenario.",
    ptsA: 8,
    ptsB: 17,
  },

  // Relationales Modell + passende SQL-Abfrage (~5%)
  {
    typeA: "freitext",
    typeB: "sql",
    weight: 5,
    promptA:
      "Erstellen Sie ein relationales Datenbankmodell (Tabellen mit Attributen, PK und FK) in Textform.",
    promptB:
      "Schreiben Sie eine SQL-SELECT-Abfrage, die die unter a) erstellten Tabellen verknüpft.",
    ptsA: 14,
    ptsB: 11,
  },

  // ── Pseudocode / Algorithmus (~20%) ──────────────────────────────────────
  {
    typeA: "freitext",
    typeB: "pseudocode",
    weight: 20,
    promptA:
      "Beschreiben Sie den Algorithmus in eigenen Worten (Ablauf, Bedingungen, Schleife).",
    promptB:
      "Implementieren Sie den Algorithmus als Pseudocode. Verwenden Sie BEGIN/END, IF/ELSE, FOR/WHILE.",
    ptsA: 8,
    ptsB: 17,
  },

  // ── Freitext + Freitext (Konzept, Berechnung, Analyse) (~12%) ────────────
  {
    typeA: "freitext",
    typeB: "freitext",
    weight: 12,
    promptA:
      "Erläutern Sie das Konzept und erklären Sie 2 Eigenschaften/Merkmale im Kontext von {{UNTERNEHMEN}}.",
    promptB:
      "Berechnen Sie den Speicherbedarf oder Aufwand für das beschriebene Szenario. Zeigen Sie den Rechenweg.",
    ptsA: 10,
    ptsB: 15,
  },

  // ── UML (~8%) — nur 1× pro Prüfung erlaubt ───────────────────────────────
  {
    typeA: "freitext",
    typeB: "plantuml",
    weight: 8,
    diagramTypeB: "uml_sequence",
    promptA:
      "Erläutern Sie den beschriebenen Ablauf und identifizieren Sie die beteiligten Klassen/Objekte.",
    promptB:
      "Erstellen Sie ein UML-Sequenzdiagramm für den beschriebenen Ablauf.",
    ptsA: 8,
    ptsB: 17,
  },

  // ── Tabellen-Aufgaben (~12%) ─────────────────────────────────────────────
  // ACID / Datenbankeigenschaften als Tabelle
  {
    typeA: "table",
    typeB: "freitext",
    weight: 6,
    tableSide: "a",
    tableColumns: ["Eigenschaft", "Bedeutung", "Beispiel"],
    tableRowCount: 4,
    fixedFirstColumn: true,
    fixedFirstColumnValues: ["Atomicity", "Consistency", "Isolation", "Durability"],
    tableKind: "fixed",
    tableDescription:
      "ACID-Tabelle: erste Spalte enthält fest die vier ACID-Eigenschaften (Atomicity, Consistency, Isolation, Durability). Spalten 2 und 3 sind 'Bedeutung' und 'Beispiel'. Spaltennamen NICHT ändern.",
    promptA:
      "Erläutern Sie die vier ACID-Eigenschaften. Die Eigenschaftsnamen sind vorgegeben.",
    promptB:
      "Erklären Sie, welche Probleme entstehen können, wenn eine der ACID-Eigenschaften verletzt wird.",
    ptsA: 12,
    ptsB: 10,
  },

  // Relationales Datenbankmodell als Tabelle + SQL
  {
    typeA: "table",
    typeB: "sql",
    weight: 6,
    tableSide: "a",
    tableColumns: ["Tabellenname", "Attribute (PK, FK)", "Beziehung zu anderen Tabellen"],
    tableRowCount: 4,
    fixedFirstColumn: false,
    tableKind: "guided",
    tableDescription:
      "Relationales Datenmodell: je Zeile eine Tabelle des Datenmodells mit Namen, Attributen (inkl. Primärschlüssel und Fremdschlüsseln) und Beziehung zu anderen Tabellen (z.B. '1:n zu bestellung').",
    promptA:
      "Erstellen Sie ein relationales Datenbankmodell in Tabellenform für das beschriebene Szenario.",
    promptB:
      "Schreiben Sie eine SQL-SELECT-Abfrage, die auf dem obigen Modell basiert und mindestens einen JOIN enthält.",
    ptsA: 12,
    ptsB: 10,
  },
];

// Gewichtete Templates für Teil 3 — WiSo
const TEMPLATES_TEIL3: TaskTemplate[] = [
  // MC (Einzelauswahl) + Freitext (~30%)
  {
    typeA: "mc",
    typeB: "freitext",
    weight: 30,
    promptA:
      "Welche der folgenden Aussagen trifft zu? (Genau 4 Antwortoptionen A–D, nur EINE ist korrekt)",
    promptB: "Berechnen oder erläutern Sie den beschriebenen Sachverhalt.",
    ptsA: 4,
    ptsB: 6,
  },

  // MC (Mehrfachauswahl) + Freitext (~20%)
  {
    typeA: "mc_multi",
    typeB: "freitext",
    weight: 20,
    promptA:
      "Welche der folgenden Aussagen treffen zu? (4 Antwortoptionen A–D, MEHRERE können korrekt sein — typisch 2 oder 3)",
    promptB: "Begründen Sie Ihre Auswahl mit einem Beispiel.",
    ptsA: 5,
    ptsB: 5,
  },

  // Freitext + MC (Einzelauswahl) (~20%)
  {
    typeA: "freitext",
    typeB: "mc",
    weight: 20,
    promptA: "Nennen Sie 2–3 Aspekte oder Unterschiede und begründen Sie kurz.",
    promptB:
      "Welche Aussage trifft auf den beschriebenen Fall zu? (Genau 4 Antwortoptionen A–D, nur EINE ist korrekt)",
    ptsA: 6,
    ptsB: 4,
  },

  // MC (Einzelauswahl) + MC (Mehrfachauswahl) (~15%)
  {
    typeA: "mc",
    typeB: "mc_multi",
    weight: 15,
    promptA:
      "Welche der folgenden Aussagen ist korrekt? (Genau 4 Antwortoptionen A–D, nur EINE ist korrekt)",
    promptB:
      "Welche der folgenden Maßnahmen/Antworten treffen zu? (4 Antwortoptionen A–D, MEHRERE können korrekt sein)",
    ptsA: 4,
    ptsB: 6,
  },

  // MC (Mehrfachauswahl) allein groß gewichtet (~15%)
  {
    typeA: "mc_multi",
    typeB: "mc",
    weight: 15,
    promptA:
      "Welche der folgenden Aussagen treffen zu? (4 Antwortoptionen A–D, MEHRERE korrekt)",
    promptB:
      "Welche Aussage trifft zu? (Genau 4 Antwortoptionen A–D, nur EINE korrekt)",
    ptsA: 6,
    ptsB: 4,
  },
];

// ─── Gewichtete Zufallsauswahl ────────────────────────────────────────────────

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ─── Eine Aufgabe generieren ──────────────────────────────────────────────────
// Struktur (taskType, Punkte, Diagrammtyp) wird vom Backend vorgegeben.
// Die KI liefert NUR Fragetext, keyPoints und MC-Optionen.

// Baut die Tabellen-spezifischen Anweisungen für den KI-Prompt.
// Je nach tableKind mehr oder weniger restriktiv.
function buildTableSchemaHint(
  tpl: TaskTemplate,
  kind: "flexible" | "guided" | "fixed",
): string {
  const cols = tpl.tableColumns ?? [];
  const rowCount = tpl.tableRowCount ?? 3;
  const descr = tpl.tableDescription
    ? `  Semantik: ${tpl.tableDescription}\n`
    : "";
  if (kind === "fixed") {
    const fixedVals = tpl.fixedFirstColumnValues
      ? `  "firstColumnValues": ${JSON.stringify(tpl.fixedFirstColumnValues)} (BINDEND, genau so übernehmen)\n`
      : "";
    return `  TabellenSPALTEN (BINDEND, nicht ändern): ${JSON.stringify(cols)}
  Zeilenzahl: ${rowCount}
${fixedVals}${descr}  "exampleRow": liefere EINE vollständig ausgefüllte Beispielzeile (${cols.length} Einträge, alle Zellen befüllt, konkret auf das Szenario bezogen).`;
  }
  if (kind === "guided") {
    return `  Spalten-Vorschlag: ${JSON.stringify(cols)} — darf an das Thema angepasst werden (konkretere Namen sind erwünscht), Anzahl (${cols.length}) bleibt erhalten.
  Zeilenzahl: ${rowCount}
${descr}  "exampleRow": liefere EINE vollständig ausgefüllte Beispielzeile mit ${cols.length} Einträgen — alle Zellen befüllt, konkret auf das Szenario bezogen, inhaltlich korrekt.`;
  }
  // flexible
  return `  Spalten-Richtung: ${JSON.stringify(cols)} — ERSETZE abstrakte Namen wie "Option A"/"Option B"/"Kriterium" durch konkrete, themenspezifische Bezeichnungen (z.B. bei Scrum-vs-Wasserfall: ["Vergleichsmerkmal", "Scrum", "Wasserfall"]). Anzahl Spalten (${cols.length}) bleibt gleich.
  Zeilenzahl: ${rowCount}
${descr}  "exampleRow": liefere EINE vollständig ausgefüllte Beispielzeile mit ${cols.length} Einträgen — alle Zellen befüllt, konkret, inhaltlich korrekt.`;
}

async function generateOneTask(
  part: ExamPart,
  topic: string,
  apiKey: string,
  forceNoUml = false, // verhindert UML wenn bereits eine UML-Aufgabe im Pool
  meta?: ProviderMeta,
  specialty: Specialty = "fiae",
): Promise<GeneratedTask> {
  const isWiso = part === "teil_3";

  // Template auswählen — bei forceNoUml UML-Templates herausfiltern
  let templates =
    part === "teil_1"
      ? TEMPLATES_TEIL1
      : part === "teil_2"
        ? TEMPLATES_TEIL2
        : TEMPLATES_TEIL3;

  if (forceNoUml) {
    const filtered = templates.filter(
      (t) => t.typeB !== "plantuml" && t.typeA !== "plantuml",
    );
    if (filtered.length > 0) templates = filtered;
  }

  const tpl = pickWeighted(templates);

  // Diagrammtyp für UML-Aufgaben: Topic-basiert sinnvoll wählen
  let diagramType: DiagramType = tpl.diagramTypeB ?? "uml_activity";
  if (tpl.typeB === "plantuml") {
    if (part === "teil_1") {
      if (topic.includes("ER") || topic.includes("Datenbank"))
        diagramType = "uml_class";
      else if (topic.includes("Use-Case") || topic.includes("Anforderung"))
        diagramType = "uml_use_case";
      else diagramType = "uml_activity";
    } else {
      if (topic.includes("Klasse") || topic.includes("OOP"))
        diagramType = "uml_class";
      else diagramType = "uml_sequence";
    }
  }

  // System-Prompt: minimal und explizit
  const specialtyLabel = specialty === "fisi" ? "FISI" : "FIAE";
  const system = `Du bist IHK-Prüfungsersteller für ${specialtyLabel} AP2. Antworte NUR mit gültigem JSON, kein Markdown.
Platzhalter für Fragetext: {{UNTERNEHMEN}}, {{BRANCHE}}, {{PRODUKT}}, {{MITARBEITER}}.
Sprache: Deutsch. Stil: knapp, sachlich, IHK-typisch (nennen/erläutern/beschreiben/berechnen).

WICHTIG für Multiple-Choice-Einzelauswahl (taskType "mc"):
- Erstelle 4 Antwortoptionen (A, B, C, D) mit KONKRETEM Inhalt — kein "..." oder Platzhaltertext.
- Setze "correctOption" auf den Buchstaben der TATSÄCHLICH korrekten Antwort (A, B, C oder D).
- "correctOption" darf NUR einer dieser Werte sein: "A", "B", "C" oder "D".
- Variiere die Position der richtigen Antwort — nicht immer A oder B.
- "explanation" erklärt kurz WARUM diese Option korrekt ist. Keine {{PLATZHALTER}} in explanation.

WICHTIG für Multiple-Choice-Mehrfachauswahl (taskType "mc_multi"):
- Erstelle 4 Antwortoptionen (A, B, C, D) mit KONKRETEM Inhalt.
- "correctOptions" ist ein ARRAY von Buchstaben, typisch 2 oder 3 Einträge. NIE 0 Einträge, NIE alle 4.
- Beispiel: "correctOptions": ["A", "C"] oder ["B", "C", "D"].
- Variiere die Anzahl korrekter Antworten zwischen 2 und 3.
- "explanation" erklärt kurz WARUM genau diese Optionen korrekt sind (und warum die anderen nicht).

WICHTIG für SQL-Aufgaben (taskType "sql"):
- questionText MUSS die notwendigen Tabellenstrukturen textuell enthalten, sodass der Prüfling weiß welche Tabellen und Spalten existieren. Format: "Tabelle mitarbeiter(id PK, name, abteilung_id FK, gehalt)".
- "expectedAnswer.solutionSql" enthält eine beispielhafte Musterlösung als SQL-Statement (kein Markdown, kein Backtick).
- "expectedAnswer.keyElements" ist ein Array mit den Pflicht-Bausteinen der Lösung, z.B. ["SELECT mit JOIN", "WHERE abteilung = 'IT'", "ORDER BY name"].
- "expectedAnswer.gradingHint" beschreibt kurz, worauf geachtet wird (Syntax, korrekte Tabellenbezüge, Ergebnismenge).

WICHTIG für Tabellen-Aufgaben (taskType "table"):
- "columns" enthält KONKRETE, themenspezifische Spaltennamen. Bei "flexible" Tabellen: benenne die Spalten so dass sie die reale Aufgabe beschreiben (z.B. statt "Option A"/"Option B" die echten Vergleichsobjekte wie "Scrum" und "Wasserfall"; statt "Kriterium" gegebenenfalls "Vergleichsmerkmal"). Bei "guided" Tabellen: nimm die Vorschlagsspalten als Basis und verfeinere sie auf das konkrete Szenario. Bei "fixed" Tabellen: Spalten sind bindend und dürfen NICHT verändert werden.
- "exampleRow" ist EINE vollständig ausgefüllte Beispielzeile zur Veranschaulichung der Aufgabe. Alle Zellen müssen befüllt sein, inhaltlich korrekt, und konkret auf das Szenario bezogen. Beispiel bei Stakeholder: ["Projektleiter", "Termingerechte Fertigstellung", "hoch"]. Die Anzahl der Einträge MUSS der Anzahl der Spalten entsprechen.
- "firstColumnValues" ist nur relevant wenn die erste Spalte vorbelegt sein soll. Array mit so vielen Einträgen wie Zeilen (z.B. ["Atomicity","Consistency","Isolation","Durability"]). Nur bei expliziter Anweisung ausfüllen, sonst weglassen.
- "keyPoints" in expectedAnswer ist eine kurze Liste mit 2-4 inhaltlichen Musterlösungs-Stichpunkten (was zumindest enthalten sein sollte).`;

  // Schemata je nach Template-Typen aufbauen
  // TableConfig aufbauen — nur Skelett, finale Spalten/Beispielzeile kommen von der KI
  // (außer bei tableKind === "fixed")
  const tableKind = tpl.tableKind ?? (tpl.tableColumns ? "guided" : "flexible");
  function buildSkeletonTableConfig(side: "a" | "b"): TableConfig | null {
    if (tpl.tableSide !== side || !tpl.tableColumns) return null;
    const rowCount = tpl.tableRowCount ?? 3;
    const columns = tpl.tableColumns.slice();
    const rows: string[][] = Array.from({ length: rowCount }, () =>
      columns.map(() => ""),
    );
    return {
      columns,
      rows,
      rowCount,
      fixedFirstColumn: tpl.fixedFirstColumn ?? false,
      fixedFirstColumnValues: tpl.fixedFirstColumnValues,
    };
  }

  const tableConfigA = buildSkeletonTableConfig("a");
  const tableConfigB = buildSkeletonTableConfig("b");

  // Schema-Bausteine für die KI: bei "fixed" werden Spalten/fixedFirstColumnValues
  // bindend mitgegeben, sonst bekommt die KI nur Vorschläge und soll sie verfeinern.
  const tableSchemaHintA = tpl.typeA === "table"
    ? buildTableSchemaHint(tpl, tableKind)
    : "";
  const tableSchemaHintB = tpl.typeB === "table"
    ? buildTableSchemaHint(tpl, tableKind)
    : "";

  const schemaA =
    tpl.typeA === "mc"
      ? `{"label":"a","taskType":"mc","questionText":"FRAGE?","points":${tpl.ptsA},"mcOptions":[{"id":"A","text":"Konkrete Antwort A"},{"id":"B","text":"Konkrete Antwort B"},{"id":"C","text":"Konkrete Antwort C"},{"id":"D","text":"Konkrete Antwort D"}],"expectedAnswer":{"correctOption":"X","explanation":"Begründung warum X korrekt ist"}}`
      : tpl.typeA === "mc_multi"
        ? `{"label":"a","taskType":"mc_multi","questionText":"FRAGE?","points":${tpl.ptsA},"mcOptions":[{"id":"A","text":"Konkrete Aussage A"},{"id":"B","text":"Konkrete Aussage B"},{"id":"C","text":"Konkrete Aussage C"},{"id":"D","text":"Konkrete Aussage D"}],"expectedAnswer":{"correctOptions":["A","C"],"explanation":"Begründung warum diese Optionen korrekt sind"}}`
        : tpl.typeA === "sql"
          ? `{"label":"a","taskType":"sql","questionText":"FRAGE mit Tabellenstruktur(en)","points":${tpl.ptsA},"expectedAnswer":{"solutionSql":"SELECT ... FROM ... WHERE ...;","keyElements":["SELECT","JOIN","WHERE"],"gradingHint":"Syntax, korrekte Tabellen und Joins, richtige WHERE-Bedingung"}}`
          : tpl.typeA === "table"
            ? `{"label":"a","taskType":"table","questionText":"FRAGE","points":${tpl.ptsA},"tableConfigProposed":{"columns":["Spalte1","Spalte2","Spalte3"],"exampleRow":["Beispielwert 1","Beispielwert 2","Beispielwert 3"]${tpl.fixedFirstColumn ? `,"firstColumnValues":${JSON.stringify(tpl.fixedFirstColumnValues ?? [])}` : ""}},"expectedAnswer":{"keyPoints":["Musterinhalt 1","Musterinhalt 2"]}}`
            : `{"label":"a","taskType":"freitext","questionText":"FRAGE","points":${tpl.ptsA},"expectedAnswer":{"keyPoints":["Punkt 1","Punkt 2"]}}`;

  const schemaB =
    tpl.typeB === "mc"
      ? `{"label":"b","taskType":"mc","questionText":"FRAGE?","points":${tpl.ptsB},"mcOptions":[{"id":"A","text":"Konkrete Antwort A"},{"id":"B","text":"Konkrete Antwort B"},{"id":"C","text":"Konkrete Antwort C"},{"id":"D","text":"Konkrete Antwort D"}],"expectedAnswer":{"correctOption":"X","explanation":"Begründung warum X korrekt ist"}}`
      : tpl.typeB === "mc_multi"
        ? `{"label":"b","taskType":"mc_multi","questionText":"FRAGE?","points":${tpl.ptsB},"mcOptions":[{"id":"A","text":"Konkrete Aussage A"},{"id":"B","text":"Konkrete Aussage B"},{"id":"C","text":"Konkrete Aussage C"},{"id":"D","text":"Konkrete Aussage D"}],"expectedAnswer":{"correctOptions":["A","C"],"explanation":"Begründung warum diese Optionen korrekt sind"}}`
        : tpl.typeB === "sql"
          ? `{"label":"b","taskType":"sql","questionText":"FRAGE mit Tabellenstruktur(en)","points":${tpl.ptsB},"expectedAnswer":{"solutionSql":"SELECT ... FROM ... WHERE ...;","keyElements":["SELECT","JOIN","WHERE"],"gradingHint":"Syntax, korrekte Tabellen und Joins, richtige WHERE-Bedingung"}}`
          : tpl.typeB === "plantuml"
            ? `{"label":"b","taskType":"plantuml","questionText":"FRAGE","points":${tpl.ptsB},"diagramType":"${diagramType}","expectedElements":["Element1","Element2","Element3"],"expectedAnswer":{"keyPoints":[]}}`
            : tpl.typeB === "pseudocode"
              ? `{"label":"b","taskType":"pseudocode","questionText":"FRAGE","points":${tpl.ptsB},"expectedAnswer":{"keyPoints":["Schritt 1","Schritt 2"]}}`
              : tpl.typeB === "table"
                ? `{"label":"b","taskType":"table","questionText":"FRAGE","points":${tpl.ptsB},"tableConfigProposed":{"columns":["Spalte1","Spalte2","Spalte3"],"exampleRow":["Beispielwert 1","Beispielwert 2","Beispielwert 3"]${tpl.fixedFirstColumn ? `,"firstColumnValues":${JSON.stringify(tpl.fixedFirstColumnValues ?? [])}` : ""}},"expectedAnswer":{"keyPoints":["Musterinhalt 1","Musterinhalt 2"]}}`
                : `{"label":"b","taskType":"freitext","questionText":"FRAGE","points":${tpl.ptsB},"expectedAnswer":{"keyPoints":["Punkt 1","Punkt 2"]}}`;

  const totalPts = tpl.ptsA + tpl.ptsB;

  // Tabellen-spezifische Anweisungen nur anhängen wenn nötig
  const tableInstructions = [
    tableSchemaHintA ? `Unteraufgabe a (Tabelle):\n${tableSchemaHintA}` : "",
    tableSchemaHintB ? `Unteraufgabe b (Tabelle):\n${tableSchemaHintB}` : "",
  ].filter(Boolean).join("\n\n");

  const user = `Thema: "${topic}"
Unternehmen-Kontext: {{UNTERNEHMEN}} (Branche: {{BRANCHE}}, Produkt: {{PRODUKT}}, ${tpl.ptsA + tpl.ptsB > 15 ? "größeres Unternehmen" : "kleineres Unternehmen"} mit {{MITARBEITER}} Mitarbeitern)

Unteraufgabe a (${tpl.ptsA}P): ${tpl.promptA}
Unteraufgabe b (${tpl.ptsB}P): ${tpl.promptB}
${tableInstructions ? "\n" + tableInstructions + "\n" : ""}
Gib genau dieses JSON zurück. Ersetze dabei:
- FRAGE durch eine konkrete IHK-typische Fragestellung
- Bei "mc": "Konkrete Antwort X" durch echte Antwortoptionen, "X" in correctOption durch den Buchstaben der tatsächlich richtigen Option (A/B/C/D), "Begründung..." durch eine kurze Erklärung ohne {{PLATZHALTER}}
- Bei "mc_multi": 4 echte Aussagen als Optionen, correctOptions als Array mit 2 oder 3 Buchstaben (z.B. ["A","C"] oder ["B","C","D"]), Begründung ohne {{PLATZHALTER}}
- Bei "sql": questionText enthält konkrete Tabellenstrukturen (Name + Spalten + PK/FK), solutionSql ist eine ausführbare Musterlösung, keyElements listet die erwarteten SQL-Bausteine
- Bei "table": tableConfigProposed enthält columns (konkret, themenspezifisch) und exampleRow (eine ausgefüllte Musterzeile mit der gleichen Anzahl Einträge wie Spalten). Der questionText darf auf die Tabelle verweisen (z.B. "Füllen Sie die Tabelle aus. Eine Beispielzeile ist vorgegeben.").
{"topicArea":"${topic}","pointsValue":${totalPts},"difficulty":"medium","subtasks":[${schemaA},${schemaB}]}`;

  const raw = await callOpenAI(system, user, apiKey, isWiso ? 650 : 900, meta);
  const task = safeParseTask(raw);

  if (!task) {
    console.warn(
      `[generator] JSON-Parse fehlgeschlagen für "${topic}", nutze Fallback`,
    );
    return buildFallbackTask(part, topic, tpl);
  }

  // Harte Nachvalidierung — KI darf Struktur nicht ändern
  task.topicArea = topic;
  task.difficulty = task.difficulty ?? "medium";
  task.pointsValue = totalPts;

  for (let i = 0; i < task.subtasks.length; i++) {
    const st = task.subtasks[i];
    const expected = i === 0 ? tpl.typeA : tpl.typeB;
    // Typ erzwingen falls KI abgewichen ist
    st.taskType = expected;
    st.points = i === 0 ? tpl.ptsA : tpl.ptsB;

    if (expected === "table") {
      const skeleton = i === 0 ? tableConfigA : tableConfigB;
      if (skeleton) {
        // KI-Vorschlag aus tableConfigProposed übernehmen (falls vorhanden)
        const proposed = (st as unknown as Record<string, unknown>)
          .tableConfigProposed as Record<string, unknown> | undefined;
        let columns = skeleton.columns.slice();
        let exampleRow: string[] | undefined;
        let firstColumnValues: string[] | undefined = skeleton.fixedFirstColumnValues?.slice();

        if (proposed && typeof proposed === "object") {
          const proposedCols = proposed.columns as string[] | undefined;
          const proposedExample = proposed.exampleRow as string[] | undefined;
          const proposedFirst = proposed.firstColumnValues as string[] | undefined;

          // Spalten übernehmen — aber bei "fixed" verwerfen und Template-Werte erzwingen
          if (tableKind !== "fixed" &&
              Array.isArray(proposedCols) &&
              proposedCols.length === columns.length &&
              proposedCols.every(c => typeof c === "string" && c.trim().length > 0)) {
            columns = proposedCols.map(c => c.trim());
          }

          // Beispielzeile übernehmen — muss Länge der Spalten haben
          if (Array.isArray(proposedExample) &&
              proposedExample.length === columns.length &&
              proposedExample.every(c => typeof c === "string" && c.trim().length > 0)) {
            exampleRow = proposedExample.map(c => c.trim());
          }

          // Fixed first column values: bei "fixed" Template-Wert behalten, sonst übernehmen wenn valide
          if (tableKind !== "fixed" && tpl.fixedFirstColumn &&
              Array.isArray(proposedFirst) &&
              proposedFirst.length === skeleton.rowCount &&
              proposedFirst.every(v => typeof v === "string" && v.trim().length > 0)) {
            firstColumnValues = proposedFirst.map(v => v.trim());
          }
        }

        // Leere Zeilen-Matrix: bei fixedFirstColumn erste Spalte mit konkreten Werten füllen
        const rows: string[][] = Array.from({ length: skeleton.rowCount }, (_, ri) =>
          columns.map((_c, ci) => {
            if (ci === 0 && tpl.fixedFirstColumn && firstColumnValues && firstColumnValues[ri]) {
              return firstColumnValues[ri];
            }
            return "";
          })
        );

        st.tableConfig = {
          columns,
          rows,
          rowCount: skeleton.rowCount,
          fixedFirstColumn: tpl.fixedFirstColumn ?? false,
          fixedFirstColumnValues: firstColumnValues,
          exampleRow,
        };
      }
      // expectedAnswer mit Spalten/Beispielzeile anreichern für KI-Bewertung
      if (!st.expectedAnswer) st.expectedAnswer = {};
      st.expectedAnswer.columns = st.tableConfig?.columns ?? tpl.tableColumns ?? [];
      if (st.tableConfig?.exampleRow) {
        st.expectedAnswer.exampleRow = st.tableConfig.exampleRow;
      }
      st.expectedAnswer.gradingHint =
        "Tabelle: Je Zeile und Spalte sinngemäß korrekte Angabe akzeptieren. Die exampleRow ist nur Veranschaulichung — fehlende Wiederholung der Beispielzeile ist KEIN Fehler.";
      // Proposed-Feld aus dem Subtask-Objekt entfernen (nicht Teil des finalen Schemas)
      delete (st as unknown as Record<string, unknown>).tableConfigProposed;
    }
    if (expected === "plantuml") {
      st.diagramType = diagramType;
    }
    if (expected === "mc") {
      if (!st.mcOptions || st.mcOptions.length < 4) {
        st.mcOptions = [
          { id: "A", text: st.mcOptions?.[0]?.text ?? "Antwort A" },
          { id: "B", text: st.mcOptions?.[1]?.text ?? "Antwort B" },
          { id: "C", text: st.mcOptions?.[2]?.text ?? "Antwort C" },
          { id: "D", text: st.mcOptions?.[3]?.text ?? "Antwort D" },
        ];
      }
      // Strictly validate correctOption — must be one of the four option IDs.
      // The AI sometimes returns "undefined", null, or an invalid value as a placeholder.
      const validOptions = new Set(st.mcOptions.map((o) => o.id.toUpperCase()));
      const raw = String(st.expectedAnswer?.correctOption ?? "").toUpperCase().trim();
      const isValidOption = validOptions.has(raw);
      if (!isValidOption) {
        // Default to the option with id that matches index position from the schema hint
        const fallback = i === 0 ? "A" : "B";
        console.warn(
          `[generator] correctOption "${raw}" ist ungültig für Aufgabe "${topic}" — Fallback auf "${fallback}"`,
        );
        st.expectedAnswer = { ...st.expectedAnswer, correctOption: fallback };
      } else {
        // Normalise to uppercase
        st.expectedAnswer = { ...st.expectedAnswer, correctOption: raw };
      }
      // Strip any remaining {{PLACEHOLDER}} from the explanation field
      if (typeof st.expectedAnswer?.explanation === "string") {
        st.expectedAnswer.explanation = (st.expectedAnswer.explanation as string)
          .replace(/\{\{[A-Z_]+\}\}/g, "");
      }
    }
    if (expected === "mc_multi") {
      if (!st.mcOptions || st.mcOptions.length < 4) {
        st.mcOptions = [
          { id: "A", text: st.mcOptions?.[0]?.text ?? "Aussage A" },
          { id: "B", text: st.mcOptions?.[1]?.text ?? "Aussage B" },
          { id: "C", text: st.mcOptions?.[2]?.text ?? "Aussage C" },
          { id: "D", text: st.mcOptions?.[3]?.text ?? "Aussage D" },
        ];
      }
      // Validate correctOptions — must be an array of valid option IDs, length 1..n-1 (nicht alle 4).
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
        // Fallback: zwei Optionen zufällig-deterministisch wählen (A + C)
        console.warn(
          `[generator] correctOptions ungültig für Aufgabe "${topic}" — Fallback auf ["A","C"]`,
        );
        finalList = ["A", "C"];
      }
      st.expectedAnswer = { ...st.expectedAnswer, correctOptions: finalList };
      if (typeof st.expectedAnswer?.explanation === "string") {
        st.expectedAnswer.explanation = (st.expectedAnswer.explanation as string)
          .replace(/\{\{[A-Z_]+\}\}/g, "");
      }
    }
    if (expected === "sql") {
      // Ensure solutionSql, keyElements and gradingHint exist (for AI-based evaluation)
      if (!st.expectedAnswer) st.expectedAnswer = {};
      if (typeof st.expectedAnswer.solutionSql !== "string" || !st.expectedAnswer.solutionSql.trim()) {
        st.expectedAnswer.solutionSql = "-- Musterlösung nicht verfügbar";
      }
      if (!Array.isArray(st.expectedAnswer.keyElements)) {
        st.expectedAnswer.keyElements = [];
      }
      if (typeof st.expectedAnswer.gradingHint !== "string") {
        st.expectedAnswer.gradingHint = "Bewertung: SQL-Syntax, korrekte Tabellen- und Spaltenbezüge, passende WHERE/JOIN-Bedingungen, erwartete Ergebnismenge.";
      }
    }
  }

  // WiSo: keine UML/Pseudocode/SQL erlaubt — nur Freitext und MC
  if (isWiso) {
    for (const st of task.subtasks) {
      if (
        st.taskType !== "freitext" &&
        st.taskType !== "mc" &&
        st.taskType !== "mc_multi"
      ) {
        st.taskType = "freitext";
      }
    }
  }

  return task;
}

// ─── Fallback-Aufgabe (wenn KI versagt) ──────────────────────────────────────

function buildFallbackTask(
  part: ExamPart,
  topic: string,
  tpl?: TaskTemplate,
): GeneratedTask {
  const isWiso = part === "teil_3";
  const t =
    tpl ??
    (isWiso
      ? TEMPLATES_TEIL3[0]
      : part === "teil_1"
        ? TEMPLATES_TEIL1[0]
        : TEMPLATES_TEIL2[0]);

  function fallbackOptions() {
    return [
      { id: "A", text: "Aussage A" },
      { id: "B", text: "Aussage B" },
      { id: "C", text: "Aussage C" },
      { id: "D", text: "Aussage D" },
    ];
  }
  function fallbackExpected(type: TaskType, defaultCorrect: string) {
    if (type === "mc") return { correctOption: defaultCorrect, explanation: "" };
    if (type === "mc_multi") return { correctOptions: ["A", "C"], explanation: "" };
    if (type === "sql")
      return {
        solutionSql: "-- Musterlösung nicht verfügbar",
        keyElements: [],
        gradingHint: "Bewertung nach SQL-Syntax und sinngemäßer Korrektheit.",
      };
    return { keyPoints: [], minKeyPointsRequired: 2 };
  }
  function fallbackTableConfig(side: "a" | "b"): TableConfig | undefined {
    if (t.tableSide !== side || !t.tableColumns) return undefined;
    const rowCount = t.tableRowCount ?? 3;
    const columns = t.tableColumns.slice();
    const firstCol = t.fixedFirstColumnValues;
    const rows: string[][] = Array.from({ length: rowCount }, (_, ri) =>
      columns.map((_c, ci) =>
        ci === 0 && t.fixedFirstColumn && firstCol && firstCol[ri]
          ? firstCol[ri]
          : ""
      )
    );
    return {
      columns,
      rows,
      rowCount,
      fixedFirstColumn: t.fixedFirstColumn ?? false,
      fixedFirstColumnValues: firstCol,
    };
  }

  return {
    topicArea: topic,
    pointsValue: t.ptsA + t.ptsB,
    difficulty: "medium",
    subtasks: [
      {
        label: "a",
        taskType: t.typeA,
        questionText: isWiso
          ? `Welche Aussage zum Thema „${topic}" trifft zu?`
          : t.typeA === "table"
            ? `Füllen Sie die folgende Tabelle zum Thema „${topic}" aus.`
            : `Erläutern Sie das Thema „${topic}" im Kontext von {{UNTERNEHMEN}}.`,
        points: t.ptsA,
        mcOptions:
          t.typeA === "mc" || t.typeA === "mc_multi"
            ? fallbackOptions()
            : undefined,
        tableConfig: t.typeA === "table" ? fallbackTableConfig("a") : undefined,
        expectedAnswer: fallbackExpected(t.typeA, "A"),
      },
      {
        label: "b",
        taskType: t.typeB,
        questionText: t.typeB === "table"
          ? `Füllen Sie die folgende Tabelle zum Thema „${topic}" aus.`
          : `Nennen Sie Vor- und Nachteile im Zusammenhang mit „${topic}" bei {{UNTERNEHMEN}}.`,
        points: t.ptsB,
        diagramType:
          t.typeB === "plantuml"
            ? (t.diagramTypeB ?? "uml_activity")
            : undefined,
        mcOptions:
          t.typeB === "mc" || t.typeB === "mc_multi"
            ? fallbackOptions()
            : undefined,
        tableConfig: t.typeB === "table" ? fallbackTableConfig("b") : undefined,
        expectedAnswer: fallbackExpected(t.typeB, "B"),
      },
    ],
  };
}

// ─── Hauptexport ──────────────────────────────────────────────────────────────
// Generiert `count` Aufgaben einzeln (je 1 API-Call), robust und token-sparend.
// UML-Kontrolle: maximal 1 UML-Aufgabe pro Batch (spiegelt echte IHK-Prüfung wider).

export type TaskSource = "user_ai" | "server_ai" | "fallback";

export interface TaskWarning {
  topic: string;
  /** Which tier ultimately produced the task. */
  source: TaskSource;
  /** Human-readable message shown to the user. */
  message: string;
}

export interface GeneratePoolResult {
  tasks: GeneratedTask[];
  /**
   * One entry per topic where something went less than perfectly:
   *  - source "server_ai"  → user AI failed, server AI took over (task still high-quality)
   *  - source "fallback"   → both AIs failed, placeholder task used (low-quality)
   */
  warnings: TaskWarning[];
}

/**
 * Generate tasks with a three-tier fallback per topic:
 *   1. User AI  (userApiKey + userMeta)
 *   2. Server AI  (serverApiKey + serverMeta) — only if different from user AI
 *   3. Fallback placeholder  — last resort, always produces a warning
 *
 * Pass serverApiKey/serverMeta as null if no server key is configured.
 */
export async function generateTasksForPool(
  part: ExamPart,
  count: number,
  userApiKey: string,
  userMeta?: ProviderMeta,
  serverApiKey?: string | null,
  serverMeta?: ProviderMeta | null,
  specialty: Specialty = "fiae",
): Promise<GeneratePoolResult> {
  const topics = pickRandom(getTopics(part, specialty), count);
  const tasks: GeneratedTask[] = [];
  const warnings: TaskWarning[] = [];
  let umlCount = 0;
  const MAX_UML_PER_BATCH = 1;

  // Whether the server key is actually different from the user key
  const hasDistinctServerKey =
    !!serverApiKey &&
    !!serverMeta &&
    (serverApiKey !== userApiKey || serverMeta.id !== userMeta?.id);

  for (const topic of topics) {
    const forceNoUml = umlCount >= MAX_UML_PER_BATCH;
    let task: GeneratedTask | null = null;
    let userError: string | null = null;
    let serverError: string | null = null;

    // ── Tier 1: User AI ────────────────────────────────────────────────────
    if (userMeta) {
      try {
        task = await generateOneTask(
          part,
          topic,
          userApiKey,
          forceNoUml,
          userMeta,
          specialty,
        );
      } catch (err) {
        userError = err instanceof Error ? err.message : String(err);
        console.warn(
          `[generator] "${topic}" — User-AI fehlgeschlagen (${userMeta.label}): ${userError.slice(0, 120)}`,
        );
      }
    }

    // ── Tier 2: Server AI (only if user AI failed and a distinct key exists) ─
    if (!task && hasDistinctServerKey) {
      try {
        task = await generateOneTask(
          part,
          topic,
          serverApiKey!,
          forceNoUml,
          serverMeta!,
          specialty,
        );
        // User AI failed but server AI succeeded — warn but still a good task
        warnings.push({
          topic,
          source: "server_ai",
          message: `„${topic}": ${userMeta?.label ?? "KI"} nicht verfügbar (${truncate(userError ?? "Fehler")}). Server-KI (${serverMeta!.label}) wurde verwendet.`,
        });
        console.info(
          `[generator] "${topic}" — Server-AI (${serverMeta!.label}) eingesprungen.`,
        );
      } catch (err) {
        serverError = err instanceof Error ? err.message : String(err);
        console.warn(
          `[generator] "${topic}" — Server-AI fehlgeschlagen (${serverMeta!.label}): ${serverError.slice(0, 120)}`,
        );
      }
    }

    // ── Tier 3: Fallback placeholder ───────────────────────────────────────
    if (!task) {
      const templates = (
        part === "teil_1"
          ? TEMPLATES_TEIL1
          : part === "teil_2"
            ? TEMPLATES_TEIL2
            : TEMPLATES_TEIL3
      ).filter(
        (t) =>
          !forceNoUml || (t.typeA !== "plantuml" && t.typeB !== "plantuml"),
      );
      task = buildFallbackTask(
        part,
        topic,
        pickWeighted(templates.length ? templates : TEMPLATES_TEIL1),
      );

      const bothFailed = hasDistinctServerKey && serverError;
      warnings.push({
        topic,
        source: "fallback",
        message: bothFailed
          ? `„${topic}": Alle KI-Anbieter fehlgeschlagen. Platzhalteraufgabe verwendet (niedrige Qualität). User-KI: ${truncate(userError ?? "–")} | Server-KI: ${truncate(serverError ?? "–")}`
          : `„${topic}": KI nicht verfügbar (${truncate(userError ?? "Kein Provider konfiguriert")}). Platzhalteraufgabe verwendet (niedrige Qualität).`,
      });
      console.warn(`[generator] "${topic}" — Fallback-Platzhalter eingefügt.`);
    }

    const hasUml = task.subtasks.some(
      (st) => st.taskType === "plantuml" || st.taskType === "diagram_upload",
    );
    if (hasUml) umlCount++;
    tasks.push(task);
  }

  return { tasks, warnings };
}

function truncate(s: string, max = 100): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
