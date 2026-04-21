import type { ExamPart, TaskType, DiagramType } from '../types/index.js'

const OPENAI_API_BASE = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

// ─── Themen ───────────────────────────────────────────────────────────────────

const TOPICS: Record<ExamPart, string[]> = {
  teil_1: [
    'Stakeholder-Analyse', 'Anforderungsanalyse', 'User Stories & INVEST',
    'Use-Case-Diagramme', 'Aktivitätsdiagramme', 'Scrum & Agile',
    'Testkonzept & Teststrategie', 'Green-IT & Nachhaltigkeit',
    'DSGVO & Datenschutz', 'ER-Diagramme', 'Change Management',
    'Lastenheft & Pflichtenheft', 'Qualitätssicherung', 'Cloud-Computing',
    'UX/UI & Benutzeroberflächen', 'Klassendiagramme', 'Risikomanagement',
    'Projektplanung & Meilensteine',
  ],
  teil_2: [
    'Sequenzdiagramme', 'Relationales Datenbankmodell', 'SQL SELECT & JOIN',
    'SQL GROUP BY & Aggregation', 'SQL UPDATE & DELETE', 'Pseudocode & Algorithmen',
    'Sortieralgorithmen', 'Suchalgorithmen', 'Rekursion',
    'Datenstrukturen', 'Speicherbedarf & Datenkodierung',
    'JSON & NoSQL', 'OOP-Vererbung', 'OOP-Polymorphismus',
    'Klassendiagramme', 'Komplexitätsanalyse', 'REST-APIs',
    'Netzwerktechnik', 'IT-Sicherheit & Verschlüsselung',
  ],
  teil_3: [
    'Kündigungsrecht', 'Probezeit & Ausbildungsrecht', 'Sozialversicherung',
    'Lohn & Gehaltsabrechnung', 'Betriebsrat & Mitbestimmung',
    'Gesellschaftsformen', 'Handelsregister', 'Tarifvertrag',
    'Jugendarbeitsschutz', 'Wirtschaftlichkeitsrechnung',
    'Markt & Wettbewerb', 'Nachhaltigkeit', 'Mutterschutz & Elternzeit',
    'Berufsausbildung & BBiG', 'Arbeitsvertrag',
  ],
}

// ─── Szenarien ────────────────────────────────────────────────────────────────

export const SCENARIOS = [
  { name: 'SmartLogistik GmbH',    branche: 'Logistik',               produkt: 'Sendungsverfolgungsapp',       mitarbeiter: '280', description: 'Die SmartLogistik GmbH ist ein mittelständisches Logistikunternehmen mit 280 Mitarbeitern. Es transportiert täglich über 5.000 Pakete und entwickelt eine mobile App für Fahrer sowie ein Kundenportal zur Sendungsverfolgung.' },
  { name: 'MediCare Systems AG',   branche: 'Gesundheitswesen',       produkt: 'Patientenverwaltungssoftware', mitarbeiter: '150', description: 'Die MediCare Systems AG entwickelt eine Cloud-Lösung für eine Krankenhausgruppe mit 8 Standorten: Patientendaten, Termine, Behandlungshistorien und Abrechnungen, DSGVO-konform.' },
  { name: 'EduTech Solutions GmbH',branche: 'E-Learning',             produkt: 'Online-Lernplattform',         mitarbeiter: '60',  description: 'Die EduTech Solutions GmbH betreibt eine Lernplattform für 15.000 Nutzer und entwickelt adaptive Lernpfade, Gamification und KI-Empfehlungen. Agile Entwicklung mit Scrum.' },
  { name: 'GreenEnergy Corp GmbH', branche: 'Erneuerbare Energien',   produkt: 'Smart-Home-App',               mitarbeiter: '45',  description: 'Die GreenEnergy Corp GmbH vertreibt Solaranlagen mit Heimspeichern und entwickelt eine App, mit der Kunden Energieverbrauch einsehen und Geräte steuern können.' },
  { name: 'RetailPro GmbH',        branche: 'E-Commerce',             produkt: 'Warenwirtschaftssystem',       mitarbeiter: '320', description: 'Die RetailPro GmbH betreibt 35 Filialen und einen Online-Shop. Ein neues Warenwirtschaftssystem soll Echtzeit-Bestände, automatische Nachbestellung und Kassenintegration liefern.' },
  { name: 'FinTech Solutions AG',  branche: 'Finanzdienstleistungen', produkt: 'Mobile-Banking-App',           mitarbeiter: '90',  description: 'Die FinTech Solutions AG entwickelt eine Banking-App mit Kontoführung, Überweisungen, Budgetplaner und Investment-Funktionen sowie 2FA und PSD2-Compliance.' },
  { name: 'CityConnect GmbH',      branche: 'Smart City',             produkt: 'Bürger-App',                   mitarbeiter: '75',  description: 'Die CityConnect GmbH entwickelt für 12 Kommunen eine Bürger-App für digitale Verwaltungsleistungen, ÖPNV-Echtzeitdaten und Meldung von Infrastrukturmängeln.' },
  { name: 'AutoTech Dynamics AG',  branche: 'Automotive',             produkt: 'Flottenmanagement-Software',   mitarbeiter: '200', description: 'Die AutoTech Dynamics AG entwickelt eine Cloud-Plattform für Flottenmanagement mit GPS-Ortung, Fahrtenbuch, Wartungsplanung und CO₂-Reporting.' },
  { name: 'FreshFood AG',          branche: 'Lebensmittel-Logistik',  produkt: 'Digitales Bestellportal',      mitarbeiter: '180', description: 'Die FreshFood AG beliefert 800 Restaurants und digitalisiert Bestellportal, Tourenplanung und Lagersteuerung.' },
  { name: 'TravelTech GmbH',       branche: 'Tourismus',              produkt: 'Reisebuchungsplattform',       mitarbeiter: '55',  description: 'Die TravelTech GmbH entwickelt eine Reisebuchungsplattform mit KI-Empfehlungen, dynamischer Preisgestaltung und Bewertungssystem.' },
]

export type Scenario = typeof SCENARIOS[0]

function pickRandom<T>(arr: T[], n: number): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, n) }

export function applyScenario(text: string, s: Scenario): string {
  return text
    .replace(/\{\{UNTERNEHMEN\}\}/g, s.name)
    .replace(/\{\{BRANCHE\}\}/g,     s.branche)
    .replace(/\{\{PRODUKT\}\}/g,     s.produkt)
    .replace(/\{\{MITARBEITER\}\}/g, s.mitarbeiter)
}

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface GeneratedSubTask {
  label:             string
  taskType:          TaskType
  questionText:      string
  points:            number
  diagramType?:      DiagramType
  expectedElements?: string[]
  mcOptions?:        { id: string; text: string }[]
  expectedAnswer:    Record<string, unknown>
}

export interface GeneratedTask {
  topicArea:   string
  pointsValue: number
  difficulty:  'easy' | 'medium' | 'hard'
  subtasks:    GeneratedSubTask[]
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  })
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`)
  const data = await response.json() as { choices?: { message?: { content?: string } }[] }
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Keine Antwort von OpenAI')
  return text
}

// ─── JSON sicher parsen ───────────────────────────────────────────────────────

function safeParseTask(raw: string): GeneratedTask | null {
  try {
    const obj = JSON.parse(raw)
    // Validierung: Pflichtfelder vorhanden?
    if (
      typeof obj.topicArea === 'string' &&
      typeof obj.pointsValue === 'number' &&
      Array.isArray(obj.subtasks) &&
      obj.subtasks.length > 0
    ) {
      return obj as GeneratedTask
    }
    return null
  } catch {
    return null
  }
}

// ─── Eine Aufgabe generieren ──────────────────────────────────────────────────
// Backend bestimmt die Struktur; KI liefert nur Fragetext und Inhalte.

async function generateOneTask(
  part: ExamPart,
  topic: string,
  apiKey: string,
): Promise<GeneratedTask> {

  const isWiso = part === 'teil_3'

  // System-Prompt: kompakt, konstant, wird gecacht
  const system = isWiso
    ? `Du bist IHK-Prüfungsersteller für FIAE AP2 WiSo. Erstelle Aufgaben auf Deutsch.
Platzhalter in Texten: {{UNTERNEHMEN}}, {{BRANCHE}}, {{MITARBEITER}}.
Erlaubte taskType: "freitext", "mc". KEIN plantuml, pseudocode, diagram_upload.
Bei "mc": genau 4 Optionen mit id A/B/C/D. Antworte NUR mit JSON.`
    : part === 'teil_1'
    ? `Du bist IHK-Prüfungsersteller für FIAE AP2 Teil 1 (Planung). Erstelle Aufgaben auf Deutsch.
Platzhalter: {{UNTERNEHMEN}}, {{BRANCHE}}, {{PRODUKT}}, {{MITARBEITER}}.
Erlaubte taskType: "freitext", "plantuml", "diagram_upload". KEIN "mc", KEIN "pseudocode".
Antworte NUR mit JSON.`
    : `Du bist IHK-Prüfungsersteller für FIAE AP2 Teil 2 (Entwicklung). Erstelle Aufgaben auf Deutsch.
Platzhalter: {{UNTERNEHMEN}}, {{BRANCHE}}, {{PRODUKT}}, {{MITARBEITER}}.
Erlaubte taskType: "freitext", "pseudocode", "plantuml", "diagram_upload". KEIN "mc".
Antworte NUR mit JSON.`

  // User-Prompt: nur das Thema + minimales Schema
  // Das Schema ist explizit klein gehalten — Backend füllt den Rest
  const schema = isWiso
    ? `{"topicArea":"...","pointsValue":10,"difficulty":"medium","subtasks":[{"label":"a","taskType":"freitext","questionText":"...","points":5,"expectedAnswer":{"keyPoints":["..."]}},{"label":"b","taskType":"mc","questionText":"...","points":5,"mcOptions":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"expectedAnswer":{"correctOption":"A"}}]}`
    : `{"topicArea":"...","pointsValue":22,"difficulty":"medium","subtasks":[{"label":"a","taskType":"freitext","questionText":"...","points":12,"expectedAnswer":{"keyPoints":["..."]}},{"label":"b","taskType":"plantuml","questionText":"...","points":10,"diagramType":"uml_activity","expectedElements":["..."]}]}`

  const user = `Thema: ${topic}
Erstelle eine Hauptaufgabe mit 2 Unteraufgaben (a und b).
${isWiso ? 'WiSo-Regel: Unteraufgabe a = freitext, Unteraufgabe b = mc mit 4 Optionen.\nGesamtpunkte: 8–15.' : part === 'teil_1' ? 'Teil1-Regel: a = freitext, b = plantuml oder diagram_upload.\nGesamtpunkte: 18–28.' : 'Teil2-Regel: a = freitext oder pseudocode, b = plantuml oder freitext.\nGesamtpunkte: 18–28.'}
Verwende Platzhalter in Fragetexten.
Schema: ${schema}`

  const maxTok = isWiso ? 600 : 700
  const raw = await callOpenAI(system, user, apiKey, maxTok)
  const task = safeParseTask(raw)

  if (!task) {
    // Fallback: Minimale Aufgabe ohne KI-Fehler
    console.warn(`[generator] JSON-Parse fehlgeschlagen für Thema "${topic}", nutze Fallback`)
    return buildFallbackTask(part, topic)
  }

  // Sicherstellen dass topicArea gesetzt ist
  task.topicArea = task.topicArea || topic
  task.difficulty = task.difficulty || 'medium'

  // WiSo: harte Validierung der Typen
  if (isWiso) {
    task.subtasks = task.subtasks.filter(st => st.taskType === 'freitext' || st.taskType === 'mc')
    for (const st of task.subtasks) {
      if (st.taskType === 'mc' && (!st.mcOptions || st.mcOptions.length < 4)) {
        st.mcOptions = [
          { id: 'A', text: st.mcOptions?.[0]?.text ?? 'Antwort A' },
          { id: 'B', text: st.mcOptions?.[1]?.text ?? 'Antwort B' },
          { id: 'C', text: st.mcOptions?.[2]?.text ?? 'Antwort C' },
          { id: 'D', text: st.mcOptions?.[3]?.text ?? 'Antwort D' },
        ]
      }
    }
    if (task.subtasks.length === 0) return buildFallbackTask(part, topic)
  }

  // Punkte plausibel machen
  const minP = isWiso ? 8 : 18
  const maxP = isWiso ? 15 : 28
  if (task.pointsValue < minP || task.pointsValue > maxP) {
    task.pointsValue = isWiso ? 10 : 22
    // Punkte auf Subtasks verteilen
    const per = Math.floor(task.pointsValue / task.subtasks.length)
    const rem = task.pointsValue - per * task.subtasks.length
    task.subtasks.forEach((st, i) => { st.points = per + (i === 0 ? rem : 0) })
  }

  return task
}

// ─── Fallback-Aufgabe (wenn KI versagt) ──────────────────────────────────────

function buildFallbackTask(part: ExamPart, topic: string): GeneratedTask {
  const isWiso = part === 'teil_3'
  return {
    topicArea:   topic,
    pointsValue: isWiso ? 10 : 22,
    difficulty:  'medium',
    subtasks: isWiso ? [
      {
        label: 'a', taskType: 'freitext',
        questionText: `Erläutern Sie zwei wichtige Aspekte des Themas „${topic}" im Kontext der {{UNTERNEHMEN}}.`,
        points: 5,
        expectedAnswer: { keyPoints: [], minKeyPointsRequired: 2 },
      },
      {
        label: 'b', taskType: 'mc',
        questionText: `Welche Aussage zum Thema „${topic}" trifft zu?`,
        points: 5,
        mcOptions: [
          { id: 'A', text: 'Aussage A' }, { id: 'B', text: 'Aussage B' },
          { id: 'C', text: 'Aussage C' }, { id: 'D', text: 'Aussage D' },
        ],
        expectedAnswer: { correctOption: 'A', explanation: 'Bitte korrekte Option nachtragen.' },
      },
    ] : [
      {
        label: 'a', taskType: 'freitext',
        questionText: `Beschreiben Sie das Thema „${topic}" im Kontext des Projekts bei {{UNTERNEHMEN}}.`,
        points: 12,
        expectedAnswer: { keyPoints: [], minKeyPointsRequired: 2 },
      },
      {
        label: 'b', taskType: 'freitext',
        questionText: `Nennen Sie Vor- und Nachteile des Einsatzes von „${topic}" bei {{UNTERNEHMEN}}.`,
        points: 10,
        expectedAnswer: { keyPoints: [], minKeyPointsRequired: 2 },
      },
    ],
  }
}

// ─── Hauptexport ──────────────────────────────────────────────────────────────
// Generiert `count` Aufgaben einzeln (je 1 API-Call), robust und token-sparend.

export async function generateTasksForPool(
  part: ExamPart,
  count: number,
  apiKey: string,
): Promise<GeneratedTask[]> {
  const topics = pickRandom(TOPICS[part], count)
  const results: GeneratedTask[] = []

  // Sequenziell: kein Rate-Limit-Problem, einfaches Error-Handling
  for (const topic of topics) {
    try {
      const task = await generateOneTask(part, topic, apiKey)
      results.push(task)
    } catch (err) {
      console.warn(`[generator] Aufgabe "${topic}" fehlgeschlagen, nutze Fallback:`, err)
      results.push(buildFallbackTask(part, topic))
    }
  }

  return results
}
