import type {
  ExamPart,
  TaskType,
  DiagramType,
  TableConfig,
} from "../types/index.js";

const OPENAI_API_BASE = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

// ─── Themen ───────────────────────────────────────────────────────────────────

const TOPICS: Record<ExamPart, string[]> = {
  teil_1: [
    "Stakeholder-Analyse",
    "Anforderungsanalyse",
    "User Stories & INVEST",
    "Use-Case-Diagramme",
    "Aktivitätsdiagramme",
    "Scrum & Agile",
    "Testkonzept & Teststrategie",
    "Green-IT & Nachhaltigkeit",
    "DSGVO & Datenschutz",
    "ER-Diagramme",
    "Change Management",
    "Lastenheft & Pflichtenheft",
    "Qualitätssicherung",
    "Cloud-Computing",
    "UX/UI & Benutzeroberflächen",
    "Klassendiagramme",
    "Risikomanagement",
    "Projektplanung & Meilensteine",
  ],
  teil_2: [
    "Sequenzdiagramme",
    "Relationales Datenbankmodell",
    "SQL SELECT & JOIN",
    "SQL GROUP BY & Aggregation",
    "SQL UPDATE & DELETE",
    "Pseudocode & Algorithmen",
    "Sortieralgorithmen",
    "Suchalgorithmen",
    "Rekursion",
    "Datenstrukturen",
    "Speicherbedarf & Datenkodierung",
    "JSON & NoSQL",
    "OOP-Vererbung",
    "OOP-Polymorphismus",
    "Klassendiagramme",
    "Komplexitätsanalyse",
    "REST-APIs",
    "Netzwerktechnik",
    "IT-Sicherheit & Verschlüsselung",
  ],
  teil_3: [
    "Kündigungsrecht",
    "Probezeit & Ausbildungsrecht",
    "Sozialversicherung",
    "Lohn & Gehaltsabrechnung",
    "Betriebsrat & Mitbestimmung",
    "Gesellschaftsformen",
    "Handelsregister",
    "Tarifvertrag",
    "Jugendarbeitsschutz",
    "Wirtschaftlichkeitsrechnung",
    "Markt & Wettbewerb",
    "Nachhaltigkeit",
    "Mutterschutz & Elternzeit",
    "Berufsausbildung & BBiG",
    "Arbeitsvertrag",
  ],
};

// ─── Szenarien ────────────────────────────────────────────────────────────────

export const SCENARIOS = [
  {
    name: "SmartLogistik GmbH",
    branche: "Logistik",
    produkt: "Sendungsverfolgungsapp",
    mitarbeiter: "280",
    description:
      "Die SmartLogistik GmbH ist ein mittelständisches Logistikunternehmen mit 280 Mitarbeitern. Es transportiert täglich über 5.000 Pakete und entwickelt eine mobile App für Fahrer sowie ein Kundenportal zur Sendungsverfolgung.",
  },
  {
    name: "MediCare Systems AG",
    branche: "Gesundheitswesen",
    produkt: "Patientenverwaltungssoftware",
    mitarbeiter: "150",
    description:
      "Die MediCare Systems AG entwickelt eine Cloud-Lösung für eine Krankenhausgruppe mit 8 Standorten: Patientendaten, Termine, Behandlungshistorien und Abrechnungen, DSGVO-konform.",
  },
  {
    name: "EduTech Solutions GmbH",
    branche: "E-Learning",
    produkt: "Online-Lernplattform",
    mitarbeiter: "60",
    description:
      "Die EduTech Solutions GmbH betreibt eine Lernplattform für 15.000 Nutzer und entwickelt adaptive Lernpfade, Gamification und KI-Empfehlungen. Agile Entwicklung mit Scrum.",
  },
  {
    name: "GreenEnergy Corp GmbH",
    branche: "Erneuerbare Energien",
    produkt: "Smart-Home-App",
    mitarbeiter: "45",
    description:
      "Die GreenEnergy Corp GmbH vertreibt Solaranlagen mit Heimspeichern und entwickelt eine App, mit der Kunden Energieverbrauch einsehen und Geräte steuern können.",
  },
  {
    name: "RetailPro GmbH",
    branche: "E-Commerce",
    produkt: "Warenwirtschaftssystem",
    mitarbeiter: "320",
    description:
      "Die RetailPro GmbH betreibt 35 Filialen und einen Online-Shop. Ein neues Warenwirtschaftssystem soll Echtzeit-Bestände, automatische Nachbestellung und Kassenintegration liefern.",
  },
  {
    name: "FinTech Solutions AG",
    branche: "Finanzdienstleistungen",
    produkt: "Mobile-Banking-App",
    mitarbeiter: "90",
    description:
      "Die FinTech Solutions AG entwickelt eine Banking-App mit Kontoführung, Überweisungen, Budgetplaner und Investment-Funktionen sowie 2FA und PSD2-Compliance.",
  },
  {
    name: "CityConnect GmbH",
    branche: "Smart City",
    produkt: "Bürger-App",
    mitarbeiter: "75",
    description:
      "Die CityConnect GmbH entwickelt für 12 Kommunen eine Bürger-App für digitale Verwaltungsleistungen, ÖPNV-Echtzeitdaten und Meldung von Infrastrukturmängeln.",
  },
  {
    name: "AutoTech Dynamics AG",
    branche: "Automotive",
    produkt: "Flottenmanagement-Software",
    mitarbeiter: "200",
    description:
      "Die AutoTech Dynamics AG entwickelt eine Cloud-Plattform für Flottenmanagement mit GPS-Ortung, Fahrtenbuch, Wartungsplanung und CO₂-Reporting.",
  },
  {
    name: "FreshFood AG",
    branche: "Lebensmittel-Logistik",
    produkt: "Digitales Bestellportal",
    mitarbeiter: "180",
    description:
      "Die FreshFood AG beliefert 800 Restaurants und digitalisiert Bestellportal, Tourenplanung und Lagersteuerung.",
  },
  {
    name: "TravelTech GmbH",
    branche: "Tourismus",
    produkt: "Reisebuchungsplattform",
    mitarbeiter: "55",
    description:
      "Die TravelTech GmbH entwickelt eine Reisebuchungsplattform mit KI-Empfehlungen, dynamischer Preisgestaltung und Bewertungssystem.",
  },
];

export type Scenario = (typeof SCENARIOS)[0];

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

export function applyScenario(text: string, s: Scenario): string {
  return text
    .replace(/\{\{UNTERNEHMEN\}\}/g, s.name)
    .replace(/\{\{BRANCHE\}\}/g, s.branche)
    .replace(/\{\{PRODUKT\}\}/g, s.produkt)
    .replace(/\{\{MITARBEITER\}\}/g, s.mitarbeiter);
}

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

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  maxTokens = 800,
): Promise<string> {
  const response = await fetch(OPENAI_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok)
    throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Keine Antwort von OpenAI");
  return text;
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
  tableColumns?: string[]; // Spaltenüberschriften
  tableRowCount?: number; // Anzahl auszufüllender Zeilen
  fixedFirstColumn?: boolean; // erste Spalte vorausgefüllt
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

  // Freitext + Tabelle ausfüllen (~20%)
  {
    typeA: "freitext",
    typeB: "freitext",
    weight: 20,
    promptA:
      "Erläutern Sie den Begriff/das Konzept im Kontext von {{UNTERNEHMEN}}. (3–4 Sätze)",
    promptB:
      "Füllen Sie die folgende Tabelle aus: Nennen Sie 3 Beispiele mit je Bezeichnung und Erklärung (Tabellenformat im Text).",
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
      "Nennen Sie 3 Stakeholder und deren jeweiliges Interesse am Projekt bei {{UNTERNEHMEN}}. (Tabellenformat)",
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
    tableColumns: ["Stakeholder", "Interesse", "Einfluss"],
    tableRowCount: 3,
    fixedFirstColumn: false,
    promptA:
      "Nennen Sie 3 Stakeholder des Projekts bei {{UNTERNEHMEN}} und beschreiben Sie deren Interesse und Einfluss (Tabelle ausfüllen).",
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
    promptA:
      "Erläutern Sie den Unterschied zwischen den beiden Konzepten im Kontext von {{UNTERNEHMEN}}.",
    promptB:
      "Füllen Sie die Vergleichstabelle aus. Die Kriterien sind vorgegeben, tragen Sie die Ausprägungen für beide Optionen ein.",
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
    promptA:
      "Beschreiben Sie die Notwendigkeit eines Testkonzepts für das Projekt bei {{UNTERNEHMEN}}.",
    promptB:
      "Füllen Sie die Tabelle aus: Nennen Sie 3 Teststufen mit Beschreibung und einem konkreten Beispiel.",
    ptsA: 8,
    ptsB: 14,
  },
];

// Gewichtete Templates für Teil 2 — exakt nach echter IHK-Verteilung
const TEMPLATES_TEIL2: TaskTemplate[] = [
  // SQL schreiben (~25%)
  {
    typeA: "freitext",
    typeB: "pseudocode",
    weight: 25,
    promptA:
      "Erläutern Sie das Datenbankkonzept und nennen Sie 2 Vorteile für {{UNTERNEHMEN}}.",
    promptB:
      "Schreiben Sie eine SQL-Abfrage (SELECT/JOIN/GROUP BY/UPDATE) für das beschriebene Szenario. Verwende SQL-Syntax.",
    ptsA: 8,
    ptsB: 17,
  },

  // Pseudocode / Algorithmus (~20%)
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

  // Freitext + Freitext (Konzept, Berechnung, Analyse) (~25%)
  {
    typeA: "freitext",
    typeB: "freitext",
    weight: 25,
    promptA:
      "Erläutern Sie das Konzept und erklären Sie 2 Eigenschaften/Merkmale im Kontext von {{UNTERNEHMEN}}.",
    promptB:
      "Berechnen Sie den Speicherbedarf oder Aufwand für das beschriebene Szenario. Zeigen Sie den Rechenweg.",
    ptsA: 10,
    ptsB: 15,
  },

  // Relationales Datenbankmodell (~15%)
  {
    typeA: "freitext",
    typeB: "freitext",
    weight: 15,
    promptA:
      "Erstellen Sie ein relationales Datenbankmodell (Tabellen mit Attributen, PK und FK) in Textform.",
    promptB:
      "Schreiben Sie eine SQL-Abfrage, die die unter a) erstellten Tabellen verknüpft.",
    ptsA: 14,
    ptsB: 11,
  },

  // UML (~10%) — nur 1× pro Prüfung erlaubt
  {
    typeA: "freitext",
    typeB: "plantuml",
    weight: 10,
    diagramTypeB: "uml_sequence",
    promptA:
      "Erläutern Sie den beschriebenen Ablauf und identifizieren Sie die beteiligten Klassen/Objekte.",
    promptB:
      "Erstellen Sie ein UML-Sequenzdiagramm für den beschriebenen Ablauf.",
    ptsA: 8,
    ptsB: 17,
  },

  // ── Tabellen-Aufgaben (~15%) ─────────────────────────────────────────────
  // Echte IHK: ACID-Tabelle, Datenbankmodell in Tabellenform, Komplexitätstabellen

  // ACID / Datenbankeigenschaften als Tabelle
  {
    typeA: "table",
    typeB: "freitext",
    weight: 8,
    tableSide: "a",
    tableColumns: ["Eigenschaft", "Bedeutung", "Beispiel"],
    tableRowCount: 4,
    fixedFirstColumn: true,
    promptA:
      "Erläutern Sie die vier ACID-Eigenschaften. Die Eigenschaftsnamen sind vorgegeben.",
    promptB:
      "Erklären Sie, welche Probleme entstehen können, wenn eine der ACID-Eigenschaften verletzt wird.",
    ptsA: 12,
    ptsB: 10,
  },

  // Relationales Datenbankmodell als Tabelle
  {
    typeA: "table",
    typeB: "pseudocode",
    weight: 7,
    tableSide: "a",
    tableColumns: ["Tabellenname", "Attribute (PK, FK)", "Beziehung"],
    tableRowCount: 4,
    fixedFirstColumn: false,
    promptA:
      "Erstellen Sie ein relationales Datenbankmodell in Tabellenform für das beschriebene Szenario.",
    promptB:
      "Schreiben Sie eine SQL-SELECT-Abfrage, die auf dem obigen Modell basiert.",
    ptsA: 12,
    ptsB: 10,
  },
];

// Gewichtete Templates für Teil 3 — WiSo
const TEMPLATES_TEIL3: TaskTemplate[] = [
  // MC + Freitext (~50%)
  {
    typeA: "mc",
    typeB: "freitext",
    weight: 50,
    promptA:
      "Welche der folgenden Aussagen trifft zu? (Genau 4 Antwortoptionen A–D)",
    promptB: "Berechnen oder erläutern Sie den beschriebenen Sachverhalt.",
    ptsA: 4,
    ptsB: 6,
  },

  // Freitext + MC (~30%)
  {
    typeA: "freitext",
    typeB: "mc",
    weight: 30,
    promptA: "Nennen Sie 2–3 Aspekte oder Unterschiede und begründen Sie kurz.",
    promptB:
      "Welche Aussage trifft auf den beschriebenen Fall zu? (Genau 4 Antwortoptionen A–D)",
    ptsA: 6,
    ptsB: 4,
  },

  // MC + MC (~20%)
  {
    typeA: "mc",
    typeB: "mc",
    weight: 20,
    promptA:
      "Welche der folgenden Aussagen ist korrekt? (Genau 4 Antwortoptionen A–D)",
    promptB:
      "Welche der folgenden Maßnahmen/Antworten trifft zu? (Genau 4 Antwortoptionen A–D)",
    ptsA: 5,
    ptsB: 5,
  },
];

// ─── Gewichtete Zufallsauswahl ────────────────────────────────────────────────

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

async function generateOneTask(
  part: ExamPart,
  topic: string,
  apiKey: string,
  forceNoUml = false, // verhindert UML wenn bereits eine UML-Aufgabe im Pool
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
  const system = `Du bist IHK-Prüfungsersteller für FIAE AP2. Antworte NUR mit gültigem JSON, kein Markdown.
Platzhalter für Fragetext: {{UNTERNEHMEN}}, {{BRANCHE}}, {{PRODUKT}}, {{MITARBEITER}}.
Sprache: Deutsch. Stil: knapp, sachlich, IHK-typisch (nennen/erläutern/beschreiben/berechnen).`;

  // Schemata je nach Template-Typen aufbauen
  // TableConfig für Tabellen-Aufgaben aufbauen
  function buildTableConfig(side: "a" | "b"): TableConfig | null {
    if (tpl.tableSide !== side || !tpl.tableColumns) return null;
    const rowCount = tpl.tableRowCount ?? 3;
    const rows: string[][] = Array.from({ length: rowCount }, (_, i) => {
      if (tpl.fixedFirstColumn) {
        // Erste Spalte mit Platzhalter vorausgefüllt, Rest leer
        return tpl.tableColumns!.map((col, ci) =>
          ci === 0 ? `${col} ${i + 1}` : "",
        );
      }
      return tpl.tableColumns!.map(() => "");
    });
    return {
      columns: tpl.tableColumns,
      rows,
      rowCount,
      fixedFirstColumn: tpl.fixedFirstColumn ?? false,
    };
  }

  const tableConfigA = buildTableConfig("a");
  const tableConfigB = buildTableConfig("b");

  const schemaA =
    tpl.typeA === "mc"
      ? `{"label":"a","taskType":"mc","questionText":"FRAGE?","points":${tpl.ptsA},"mcOptions":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"expectedAnswer":{"correctOption":"A","explanation":"..."}}`
      : tpl.typeA === "table"
        ? `{"label":"a","taskType":"table","questionText":"FRAGE","points":${tpl.ptsA},"expectedAnswer":{"columns":${JSON.stringify(tpl.tableColumns ?? [])},"keyPoints":["Musterlösung Zeile 1","Musterlösung Zeile 2"]}}`
        : `{"label":"a","taskType":"freitext","questionText":"FRAGE","points":${tpl.ptsA},"expectedAnswer":{"keyPoints":["Punkt 1","Punkt 2"]}}`;

  const schemaB =
    tpl.typeB === "mc"
      ? `{"label":"b","taskType":"mc","questionText":"FRAGE?","points":${tpl.ptsB},"mcOptions":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"expectedAnswer":{"correctOption":"B","explanation":"..."}}`
      : tpl.typeB === "plantuml"
        ? `{"label":"b","taskType":"plantuml","questionText":"FRAGE","points":${tpl.ptsB},"diagramType":"${diagramType}","expectedElements":["Element1","Element2","Element3"],"expectedAnswer":{"keyPoints":[]}}`
        : tpl.typeB === "pseudocode"
          ? `{"label":"b","taskType":"pseudocode","questionText":"FRAGE","points":${tpl.ptsB},"expectedAnswer":{"keyPoints":["Schritt 1","Schritt 2"]}}`
          : tpl.typeB === "table"
            ? `{"label":"b","taskType":"table","questionText":"FRAGE","points":${tpl.ptsB},"expectedAnswer":{"columns":${JSON.stringify(tpl.tableColumns ?? [])},"keyPoints":["Musterlösung Zeile 1","Musterlösung Zeile 2"]}}`
            : `{"label":"b","taskType":"freitext","questionText":"FRAGE","points":${tpl.ptsB},"expectedAnswer":{"keyPoints":["Punkt 1","Punkt 2"]}}`;

  const totalPts = tpl.ptsA + tpl.ptsB;

  const user = `Thema: "${topic}"
Unternehmen-Kontext: {{UNTERNEHMEN}} (Branche: {{BRANCHE}}, Produkt: {{PRODUKT}})

Unteraufgabe a (${tpl.ptsA}P): ${tpl.promptA}
Unteraufgabe b (${tpl.ptsB}P): ${tpl.promptB}

Gib genau dieses JSON zurück (ersetze FRAGE durch konkrete IHK-typische Fragestellung):
{"topicArea":"${topic}","pointsValue":${totalPts},"difficulty":"medium","subtasks":[${schemaA},${schemaB}]}`;

  const raw = await callOpenAI(system, user, apiKey, isWiso ? 650 : 750);
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
      const tc = i === 0 ? tableConfigA : tableConfigB;
      if (tc) st.tableConfig = tc;
      // expectedAnswer mit Spalten anreichern für KI-Bewertung
      if (!st.expectedAnswer) st.expectedAnswer = {};
      st.expectedAnswer.columns = tpl.tableColumns ?? [];
      st.expectedAnswer.gradingHint =
        "Tabelle: Je Zeile und Spalte sinngemäß korrekte Angabe akzeptieren.";
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
      if (!st.expectedAnswer?.correctOption) {
        st.expectedAnswer = { ...st.expectedAnswer, correctOption: "A" };
      }
    }
  }

  // WiSo: keine UML/Pseudocode erlaubt
  if (isWiso) {
    for (const st of task.subtasks) {
      if (st.taskType !== "freitext" && st.taskType !== "mc") {
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
          : `Erläutern Sie das Thema „${topic}" im Kontext von {{UNTERNEHMEN}}.`,
        points: t.ptsA,
        mcOptions:
          t.typeA === "mc"
            ? [
                { id: "A", text: "Aussage A" },
                { id: "B", text: "Aussage B" },
                { id: "C", text: "Aussage C" },
                { id: "D", text: "Aussage D" },
              ]
            : undefined,
        expectedAnswer:
          t.typeA === "mc"
            ? { correctOption: "A", explanation: "" }
            : { keyPoints: [], minKeyPointsRequired: 2 },
      },
      {
        label: "b",
        taskType: t.typeB,
        questionText: `Nennen Sie Vor- und Nachteile im Zusammenhang mit „${topic}" bei {{UNTERNEHMEN}}.`,
        points: t.ptsB,
        diagramType:
          t.typeB === "plantuml"
            ? (t.diagramTypeB ?? "uml_activity")
            : undefined,
        mcOptions:
          t.typeB === "mc"
            ? [
                { id: "A", text: "Aussage A" },
                { id: "B", text: "Aussage B" },
                { id: "C", text: "Aussage C" },
                { id: "D", text: "Aussage D" },
              ]
            : undefined,
        expectedAnswer:
          t.typeB === "mc"
            ? { correctOption: "B", explanation: "" }
            : { keyPoints: [], minKeyPointsRequired: 2 },
      },
    ],
  };
}

// ─── Hauptexport ──────────────────────────────────────────────────────────────
// Generiert `count` Aufgaben einzeln (je 1 API-Call), robust und token-sparend.
// UML-Kontrolle: maximal 1 UML-Aufgabe pro Batch (spiegelt echte IHK-Prüfung wider).

export async function generateTasksForPool(
  part: ExamPart,
  count: number,
  apiKey: string,
): Promise<GeneratedTask[]> {
  const topics = pickRandom(TOPICS[part], count);
  const results: GeneratedTask[] = [];
  let umlCount = 0;
  const MAX_UML_PER_BATCH = 1; // echte Prüfung: max 1 UML-Aufgabe

  for (const topic of topics) {
    const forceNoUml = umlCount >= MAX_UML_PER_BATCH;
    try {
      const task = await generateOneTask(part, topic, apiKey, forceNoUml);
      // Prüfe ob diese Aufgabe UML enthält
      const hasUml = task.subtasks.some(
        (st) => st.taskType === "plantuml" || st.taskType === "diagram_upload",
      );
      if (hasUml) umlCount++;
      results.push(task);
    } catch (err) {
      console.warn(
        `[generator] Aufgabe "${topic}" fehlgeschlagen, nutze Fallback:`,
        err,
      );
      // Fallback ohne UML wenn bereits genug UML vorhanden
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
      results.push(
        buildFallbackTask(
          part,
          topic,
          pickWeighted(
            templates.length
              ? templates
              : part === "teil_1"
                ? TEMPLATES_TEIL1
                : TEMPLATES_TEIL2,
          ),
        ),
      );
    }
  }

  return results;
}
