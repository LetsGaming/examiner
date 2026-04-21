import type {
  AiEvaluation,
  ExamPart,
  TaskType,
  DiagramType,
  IhkGrade,
  CriterionScore,
} from "../types/index.js";

const OPENAI_API_BASE = "https://api.openai.com/v1/chat/completions";
// gpt-4o-mini: best accuracy/cost ratio — ~$0.15/1M input tokens
const MODEL_TEXT = "gpt-4o-mini";
const MODEL_VISION = "gpt-4o-mini"; // vision included in gpt-4o-mini

const PART_DESCRIPTIONS: Record<ExamPart, string> = {
  teil_1:
    "Planen eines Softwareproduktes (Anforderungsanalyse, Projektplanung, UML-Modellierung, Qualitätssicherung)",
  teil_2:
    "Entwicklung und Umsetzung von Softwarealgorithmen (Programmierung, Datenbanken, Pseudocode, Komplexität)",
  teil_3:
    "Wirtschafts- und Sozialkunde (Arbeitsrecht, Ausbildungsrecht, Wirtschaft, Soziales)",
};

const DIAGRAM_TYPE_LABELS: Record<DiagramType, string> = {
  uml_class: "UML-Klassendiagramm",
  uml_sequence: "UML-Sequenzdiagramm",
  uml_use_case: "UML-Use-Case-Diagramm",
  uml_activity: "UML-Aktivitätsdiagramm",
  er: "Entity-Relationship-Diagramm",
};

export interface AssessAnswerParams {
  taskType: TaskType;
  examPart: ExamPart;
  questionText: string;
  expectedAnswer: Record<string, unknown>;
  studentAnswer: string;
  maxPoints: number;
  topicArea?: string;
}

export interface AnalyzeDiagramParams {
  diagramType: DiagramType;
  taskDescription: string;
  expectedElements: string[];
  maxPoints: number;
  plantUmlCode?: string;
  imageBase64?: string;
  imageMediaType?: string;
}

function buildSystemPrompt(examPart: ExamPart): string {
  return `Du bist ein erfahrener, strenger und fairer IHK-Prüfer für den Ausbildungsberuf Fachinformatiker für Anwendungsentwicklung (FIAE).
Aktueller Prüfungsbereich: ${PART_DESCRIPTIONS[examPart]}

IHK-NOTENSCHEMA (Pflichtanwendung):
- 92–100 % → sehr_gut
- 81–91 %  → gut
- 67–80 %  → befriedigend
- 50–66 %  → ausreichend
- 30–49 %  → mangelhaft
- 0–29 %   → ungenuegend

BEWERTUNGSREGELN:
1. Anteilige Punktvergabe je Kriterium — kein binäres Alles-oder-Nichts ohne explizite Aufgabenanweisung.
2. Sinngemäß korrekte Antworten werden akzeptiert; Fachbegriffe müssen jedoch richtig verwendet sein.
3. Pseudocode: Bewertest du Logik und algorithmische Korrektheit, nicht syntaktische Sprachen-Konformität.
4. Falsche Kernaussagen reduzieren Punkte auch dann, wenn sie mit korrekten Inhalten vermischt sind.
5. Sei konstruktiv — Feedback soll dem Lernenden konkret helfen, seine Schwächen zu beheben.

AUSGABE: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Text davor oder danach, keine Markdown-Backticks.`;
}

function buildUserPrompt(params: AssessAnswerParams): string {
  return `AUFGABENSTELLUNG:
${params.questionText}

MAXIMALPUNKTE: ${params.maxPoints}

ERWARTUNGSHORIZONT (vertraulich — nicht für Prüfling):
${JSON.stringify(params.expectedAnswer, null, 2)}

ANTWORT DES PRÜFLINGS:
"""
${params.studentAnswer}
"""

Bewerte die Antwort und gib ausschließlich dieses JSON zurück:
{
  "awardedPoints": <integer 0–${params.maxPoints}>,
  "percentageScore": <integer 0–100>,
  "ihkGrade": <"sehr_gut"|"gut"|"befriedigend"|"ausreichend"|"mangelhaft"|"ungenuegend">,
  "feedbackText": "<2–4 konstruktive Sätze auf Deutsch>",
  "criterionScores": [
    { "criterion": "<Name>", "awarded": <n>, "max": <n>, "comment": "<1 Satz>" }
  ],
  "keyMistakes": ["<Fehler 1>"],
  "improvementHints": ["<Tipp 1>"]
}`;
}

function buildDiagramTextPrompt(params: AnalyzeDiagramParams): string {
  return `Du analysierst ein ${DIAGRAM_TYPE_LABELS[params.diagramType]} im Rahmen einer FIAE AP2-Prüfung.

AUFGABENSTELLUNG:
${params.taskDescription}

MAXIMALPUNKTE: ${params.maxPoints}

ERWARTETE ELEMENTE:
${params.expectedElements.map((e, i) => `${i + 1}. ${e}`).join("\n")}

${params.plantUmlCode ? `PLANTUML-CODE DES PRÜFLINGS:\n\`\`\`plantuml\n${params.plantUmlCode}\n\`\`\`` : "Das Diagramm ist als Bild beigefügt. Erkenne und bewerte alle sichtbaren Elemente."}

Bewertungskriterien:
1. Syntaktische Korrektheit der UML/ER-Notation (${Math.round(params.maxPoints * 0.25)}P)
2. Vollständigkeit aller geforderten Elemente (${Math.round(params.maxPoints * 0.35)}P)
3. Semantische Korrektheit der Beziehungen/Multiplizitäten (${Math.round(params.maxPoints * 0.25)}P)
4. Lesbarkeit und sinnvolle Benennung (${Math.round(params.maxPoints * 0.15)}P)

Antworte AUSSCHLIESSLICH mit diesem JSON:
{
  "awardedPoints": <integer 0–${params.maxPoints}>,
  "percentageScore": <integer 0–100>,
  "ihkGrade": <"sehr_gut"|"gut"|"befriedigend"|"ausreichend"|"mangelhaft"|"ungenuegend">,
  "feedbackText": "<2–4 Sätze>",
  "criterionScores": [
    { "criterion": "<Name>", "awarded": <n>, "max": <n>, "comment": "<1 Satz>" }
  ],
  "detectedElements": ["<erkanntes Element>"],
  "missingElements": ["<fehlendes Element>"],
  "notationErrors": ["<Fehler>"],
  "keyMistakes": [],
  "improvementHints": []
}`;
}

async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string,
  imageBase64?: string,
  imageMediaType?: string,
): Promise<string> {
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" } };

  const contentParts: ContentPart[] = [];
  if (imageBase64 && imageMediaType) {
    // detail: 'low' = 85 tokens flat fee — cheapest vision option
    contentParts.push({
      type: "image_url",
      image_url: {
        url: `data:${imageMediaType};base64,${imageBase64}`,
        detail: "low",
      },
    });
  }
  contentParts.push({ type: "text", text: prompt });

  const body = {
    model,
    messages: [{ role: "user", content: contentParts }],
    temperature: 0.1,
    max_tokens: 2048,
    response_format: { type: "json_object" }, // guaranteed JSON — no markdown fences
  };

  const response = await fetch(OPENAI_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Fehler ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (data.error) throw new Error(`OpenAI Fehler: ${data.error.message}`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Keine Antwort von OpenAI erhalten.");
  return text;
}

function parseLlmJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function deriveIhkGrade(percent: number): IhkGrade {
  if (percent >= 92) return "sehr_gut";
  if (percent >= 81) return "gut";
  if (percent >= 67) return "befriedigend";
  if (percent >= 50) return "ausreichend";
  if (percent >= 30) return "mangelhaft";
  return "ungenuegend";
}

function gradeMcAnswer(
  selectedOptionId: string,
  expectedAnswer: Record<string, unknown>,
  maxPoints: number,
): Omit<AiEvaluation, "id" | "answerId" | "createdAt"> {
  const correctOptionId = expectedAnswer.correctOptionId as string;
  const explanation = (expectedAnswer.explanation as string) ?? "";
  const isCorrect = selectedOptionId === correctOptionId;
  const awarded = isCorrect ? maxPoints : 0;
  const percent = isCorrect ? 100 : 0;

  return {
    awardedPoints: awarded,
    maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText: isCorrect
      ? `Richtig! ${explanation}`
      : `Leider falsch. Die korrekte Antwort wäre Option "${correctOptionId}". ${explanation}`,
    criterionScores: [
      {
        criterion: "Korrekte Antwort",
        awarded,
        max: maxPoints,
        comment: isCorrect ? "Richtig" : "Falsch",
      },
    ],
    keyMistakes: isCorrect
      ? []
      : [`Falsche Option "${selectedOptionId}" gewählt`],
    improvementHints: isCorrect ? [] : [explanation],
    modelUsed: "local_mc_evaluation",
  };
}

async function assessTableAnswer(
  params: AssessAnswerParams,
  apiKey: string,
): Promise<Omit<AiEvaluation, "id" | "answerId" | "createdAt">> {
  // Tabellen-Antwort kommt als JSON-String: [["Zelle1","Zelle2"],["Zelle3","Zelle4"]]
  let parsedRows: string[][] = [];
  try {
    parsedRows = JSON.parse(params.studentAnswer);
  } catch {
    /* leer */
  }

  const expectedConfig = params.expectedAnswer as Record<string, unknown>;
  const expectedRows = (expectedConfig.rows as string[][]) ?? [];
  const columns = (expectedConfig.columns as string[]) ?? [];

  // Tabelleninhalt als lesbaren Text für die KI aufbereiten
  const header = columns.join(" | ");
  const separator = columns.map(() => "---").join(" | ");
  const formatRows = (rows: string[][]) =>
    rows.map((row) => row.join(" | ")).join("");

  const studentTable =
    parsedRows.length > 0
      ? `${header}
${separator}
${formatRows(parsedRows)}`
      : "(keine Angabe)";

  const expectedTable =
    expectedRows.length > 0
      ? `${header}
${separator}
${formatRows(expectedRows)}`
      : "(kein Erwartungshorizont hinterlegt)";

  const prompt = `${buildSystemPrompt(params.examPart)}

AUFGABENSTELLUNG:
${params.questionText}

MAXIMALPUNKTE: ${params.maxPoints}

ERWARTUNGSHORIZONT (vertraulich):
${expectedTable}
Hinweis: ${(expectedConfig.gradingHint as string) ?? "Sinngemäß korrekte Antworten akzeptieren. Je vollständiger und präziser, desto mehr Punkte."}

ANTWORT DES PRÜFLINGS (Tabelle):
${studentTable}

Bewerte die ausgefüllte Tabelle. Berücksichtige:
1. Inhaltliche Korrektheit der Einträge (${Math.round(params.maxPoints * 0.6)}P)
2. Vollständigkeit — alle Felder ausgefüllt (${Math.round(params.maxPoints * 0.25)}P)
3. Präzision der Fachbegriffe (${Math.round(params.maxPoints * 0.15)}P)

Gib ausschließlich dieses JSON zurück:
{
  "awardedPoints": <integer 0-${params.maxPoints}>,
  "percentageScore": <integer 0-100>,
  "ihkGrade": <"sehr_gut"|"gut"|"befriedigend"|"ausreichend"|"mangelhaft"|"ungenuegend">,
  "feedbackText": "<2-4 konstruktive Sätze auf Deutsch>",
  "criterionScores": [
    { "criterion": "<n>", "awarded": <n>, "max": <n>, "comment": "<1 Satz>" }
  ],
  "keyMistakes": ["<Fehler>"],
  "improvementHints": ["<Tipp>"]
}`;

  const raw = await callOpenAI(prompt, apiKey, MODEL_TEXT);
  const parsed = parseLlmJson(raw) as Record<string, unknown>;

  const awarded = Math.min(
    Math.max(Math.round(Number(parsed.awardedPoints) || 0), 0),
    params.maxPoints,
  );
  const percent = Math.round((awarded / params.maxPoints) * 100);

  return {
    awardedPoints: awarded,
    maxPoints: params.maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText: String(parsed.feedbackText ?? ""),
    criterionScores: (parsed.criterionScores as CriterionScore[]) ?? [],
    keyMistakes: (parsed.keyMistakes as string[]) ?? [],
    improvementHints: (parsed.improvementHints as string[]) ?? [],
    modelUsed: MODEL_TEXT,
  };
}

export async function assessFreitext(
  params: AssessAnswerParams,
  apiKey: string,
): Promise<Omit<AiEvaluation, "id" | "answerId" | "createdAt">> {
  if (params.taskType === "table") {
    return assessTableAnswer(params, apiKey);
  }
  if (params.taskType === "mc") {
    return gradeMcAnswer(
      params.studentAnswer,
      params.expectedAnswer,
      params.maxPoints,
    );
  }

  const systemPrompt = buildSystemPrompt(params.examPart);
  const userPrompt = buildUserPrompt(params);
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const raw = await callOpenAI(fullPrompt, apiKey, MODEL_TEXT);
  const parsed = parseLlmJson(raw) as Record<string, unknown>;

  const awarded = Math.min(
    Math.max(Math.round(Number(parsed.awardedPoints) || 0), 0),
    params.maxPoints,
  );
  const percent = Math.round((awarded / params.maxPoints) * 100);

  return {
    awardedPoints: awarded,
    maxPoints: params.maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText: String(parsed.feedbackText ?? ""),
    criterionScores: (parsed.criterionScores as CriterionScore[]) ?? [],
    keyMistakes: (parsed.keyMistakes as string[]) ?? [],
    improvementHints: (parsed.improvementHints as string[]) ?? [],
    modelUsed: MODEL_TEXT,
  };
}

export async function analyzeDiagram(
  params: AnalyzeDiagramParams,
  apiKey: string,
): Promise<Omit<AiEvaluation, "id" | "answerId" | "createdAt">> {
  const prompt = buildDiagramTextPrompt(params);

  const raw = await callOpenAI(
    prompt,
    apiKey,
    MODEL_VISION,
    params.imageBase64,
    params.imageMediaType,
  );
  const parsed = parseLlmJson(raw) as Record<string, unknown>;

  const awarded = Math.min(
    Math.max(Math.round(Number(parsed.awardedPoints) || 0), 0),
    params.maxPoints,
  );
  const percent = Math.round((awarded / params.maxPoints) * 100);

  return {
    awardedPoints: awarded,
    maxPoints: params.maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText: String(parsed.feedbackText ?? ""),
    criterionScores: (parsed.criterionScores as CriterionScore[]) ?? [],
    detectedElements: (parsed.detectedElements as string[]) ?? [],
    missingElements: (parsed.missingElements as string[]) ?? [],
    notationErrors: (parsed.notationErrors as string[]) ?? [],
    keyMistakes: (parsed.keyMistakes as string[]) ?? [],
    improvementHints: (parsed.improvementHints as string[]) ?? [],
    modelUsed: MODEL_VISION,
  };
}
