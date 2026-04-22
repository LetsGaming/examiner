import type {
  AiEvaluation,
  ExamPart,
  TaskType,
  DiagramType,
  IhkGrade,
  CriterionScore,
} from "../types/index.js";
// No provider constants here — all model/URL config lives in settingsRoutes.PROVIDERS

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
  /** Formatted scenario context string, e.g. "Unternehmenskontext: TravelTech GmbH — ..." */
  scenarioContext?: string;
  /** MC option IDs in the order they were presented — required for mc_multi scoring */
  mcOptionIds?: string[];
}

export interface AnalyzeDiagramParams {
  diagramType: DiagramType;
  taskDescription: string;
  expectedElements: string[];
  maxPoints: number;
  plantUmlCode?: string;
  imageBase64?: string;
  imageMediaType?: string;
  /** Formatted scenario context string */
  scenarioContext?: string;
}

function buildSystemPrompt(examPart: ExamPart, scenarioContext?: string): string {
  const scenarioLine = scenarioContext
    ? `\nPRÜFUNGSKONTEXT: ${scenarioContext}\nAlle Aufgaben beziehen sich auf dieses Unternehmen. Berücksichtige den Kontext bei der Bewertung.\n`
    : "";
  return `Du bist ein erfahrener, strenger und fairer IHK-Prüfer für den Ausbildungsberuf Fachinformatiker für Anwendungsentwicklung (FIAE).
Aktueller Prüfungsbereich: ${PART_DESCRIPTIONS[examPart]}
${scenarioLine}
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

/**
 * Strip any unresolved {{PLACEHOLDER}} tokens before text reaches the LLM.
 * These appear in expectedAnswer fields when the AI generated content before
 * scenario values were assigned. They confuse the grading model.
 */
function stripPlaceholders(text: string): string {
  return text.replace(/\{\{[A-Z_]+\}\}/g, "");
}

function buildUserPrompt(params: AssessAnswerParams): string {
  const questionText = stripPlaceholders(params.questionText);
  const expectedAnswerJson = stripPlaceholders(JSON.stringify(params.expectedAnswer, null, 2));
  return `AUFGABENSTELLUNG:
${questionText}

MAXIMALPUNKTE: ${params.maxPoints}

ERWARTUNGSHORIZONT (vertraulich — nicht für Prüfling):
${expectedAnswerJson}

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

/**
 * SQL-spezifischer Bewertungsprompt.
 * Unterscheidet explizit zwischen syntaktischer Korrektheit und semantischer
 * Korrektheit (richtige Tabellen/Spalten, richtige JOIN-Bedingungen, richtige
 * Ergebnismenge). Sinngemäß äquivalente Lösungen werden akzeptiert.
 */
function buildUserPromptSql(params: AssessAnswerParams): string {
  const questionText = stripPlaceholders(params.questionText);
  const expected = params.expectedAnswer as Record<string, unknown>;
  const solutionSql = stripPlaceholders(String(expected.solutionSql ?? ""));
  const keyElements = Array.isArray(expected.keyElements)
    ? (expected.keyElements as string[]).map(stripPlaceholders).join(", ")
    : "";
  const gradingHint = stripPlaceholders(String(expected.gradingHint ?? ""));

  const syntaxP = Math.max(1, Math.round(params.maxPoints * 0.2));
  const schemaP = Math.max(1, Math.round(params.maxPoints * 0.3));
  const logicP = Math.max(1, Math.round(params.maxPoints * 0.35));
  const resultP = Math.max(1, params.maxPoints - syntaxP - schemaP - logicP);

  return `Du bewertest eine SQL-Aufgabe.

AUFGABENSTELLUNG:
${questionText}

MAXIMALPUNKTE: ${params.maxPoints}

MUSTERLÖSUNG (SQL, vertraulich):
\`\`\`sql
${solutionSql || "-- nicht angegeben"}
\`\`\`

PFLICHT-BAUSTEINE: ${keyElements || "(keine spezifischen Bausteine vorgegeben)"}
BEWERTUNGSHINWEIS: ${gradingHint || "Standard-SQL-Bewertung"}

ANTWORT DES PRÜFLINGS (SQL):
\`\`\`sql
${params.studentAnswer}
\`\`\`

BEWERTUNGSKRITERIEN (Punkte strikt anwenden):
1. Syntaktische Korrektheit (${syntaxP}P) — gültiges SQL, keine fehlenden Keywords.
2. Korrekte Tabellen- und Spaltenbezüge (${schemaP}P) — verwendet die richtigen Tabellen aus der Aufgabe, korrekte Spaltennamen.
3. Logische Korrektheit (${logicP}P) — richtige JOIN-Bedingungen, WHERE-Prädikate, GROUP BY/HAVING, korrekte Aggregatfunktionen, Subqueries wenn nötig.
4. Erwartete Ergebnismenge (${resultP}P) — das Statement liefert genau die angeforderten Daten (nicht zu viel, nicht zu wenig).

AKZEPTIERE:
- Sinngemäß äquivalente Formulierungen (INNER JOIN vs. impliziter Join, Aliase, case-insensitive Keywords, Zeilenumbrüche).
- Verschiedene korrekte Lösungswege mit identischem Ergebnis.

BESTRAFE:
- Fehlende JOIN-Bedingung (führt zu kartesischem Produkt).
- Fehlende WHERE-Klausel bei UPDATE/DELETE (kritischer Fehler).
- Aggregatfunktion ohne GROUP BY bei gleichzeitiger Auswahl nicht-aggregierter Spalten.
- Falsche Spaltennamen oder Tabellen die nicht in der Aufgabe stehen.

Gib AUSSCHLIESSLICH dieses JSON zurück:
{
  "awardedPoints": <integer 0–${params.maxPoints}>,
  "percentageScore": <integer 0–100>,
  "ihkGrade": <"sehr_gut"|"gut"|"befriedigend"|"ausreichend"|"mangelhaft"|"ungenuegend">,
  "feedbackText": "<2–4 konstruktive Sätze auf Deutsch>",
  "criterionScores": [
    { "criterion": "Syntax", "awarded": <n>, "max": ${syntaxP}, "comment": "<1 Satz>" },
    { "criterion": "Tabellen/Spalten", "awarded": <n>, "max": ${schemaP}, "comment": "<1 Satz>" },
    { "criterion": "Logik (JOINs/WHERE/GROUP BY)", "awarded": <n>, "max": ${logicP}, "comment": "<1 Satz>" },
    { "criterion": "Ergebnismenge", "awarded": <n>, "max": ${resultP}, "comment": "<1 Satz>" }
  ],
  "keyMistakes": ["<Fehler 1>"],
  "improvementHints": ["<Tipp 1>"]
}`;
}

function buildDiagramTextPrompt(params: AnalyzeDiagramParams): string {
  const scenarioLine = params.scenarioContext ? `\nKONTEXT: ${params.scenarioContext}\n` : "";
  const taskDescription = stripPlaceholders(params.taskDescription);
  return `Du analysierst ein ${DIAGRAM_TYPE_LABELS[params.diagramType]} im Rahmen einer FIAE AP2-Prüfung.
${scenarioLine}
AUFGABENSTELLUNG:
${taskDescription}

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

// ─── Provider call implementations ───────────────────────────────────────────

/**
 * OpenAI-compatible call (also used for Mistral & Groq which share the same API shape).
 * Sends JSON-mode request; supports optional vision via image_url content part.
 */
async function callOpenAICompat(
  prompt: string,
  apiKey: string,
  apiBase: string,
  model: string,
  imageBase64?: string,
  imageMediaType?: string,
): Promise<string> {
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" } };

  const contentParts: ContentPart[] = [];
  if (imageBase64 && imageMediaType) {
    contentParts.push({
      type: "image_url",
      image_url: {
        url: `data:${imageMediaType};base64,${imageBase64}`,
        detail: "low",
      },
    });
  }
  contentParts.push({ type: "text", text: prompt });

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: contentParts }],
    temperature: 0.1,
    max_tokens: 2048,
  };
  // JSON-mode is supported by OpenAI & Groq, but not Mistral vision — only set for text
  if (!imageBase64) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(apiBase, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `${apiBase} Fehler ${response.status}: ${await response.text()}`,
    );

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (data.error) throw new Error(`API Fehler: ${data.error.message}`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Leere Antwort vom Modell erhalten.");
  return text;
}

/** Anthropic Messages API — supports vision via base64 image blocks. */
async function callAnthropic(
  prompt: string,
  apiKey: string,
  model: string,
  imageBase64?: string,
  imageMediaType?: string,
): Promise<string> {
  type Block =
    | { type: "text"; text: string }
    | {
        type: "image";
        source: { type: "base64"; media_type: string; data: string };
      };

  const content: Block[] = [];
  if (imageBase64 && imageMediaType) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
    });
  }
  content.push({ type: "text", text: prompt });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    }),
  });
  if (!response.ok)
    throw new Error(
      `Anthropic Fehler ${response.status}: ${await response.text()}`,
    );

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
    error?: { message?: string };
  };
  if (data.error) throw new Error(`Anthropic Fehler: ${data.error.message}`);
  const text = data?.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Leere Antwort von Anthropic erhalten.");
  return text;
}

/** Google Gemini generateContent API — supports inline image data. */
async function callGoogle(
  prompt: string,
  apiKey: string,
  model: string,
  imageBase64?: string,
  imageMediaType?: string,
): Promise<string> {
  type Part =
    | { text: string }
    | { inline_data: { mime_type: string; data: string } };

  const parts: Part[] = [];
  if (imageBase64 && imageMediaType) {
    parts.push({
      inline_data: { mime_type: imageMediaType, data: imageBase64 },
    });
  }
  parts.push({ text: prompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(
      `Google Gemini Fehler ${response.status}: ${await response.text()}`,
    );

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (data.error) throw new Error(`Gemini Fehler: ${data.error.message}`);
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  if (!text) throw new Error("Leere Antwort von Gemini erhalten.");
  return text;
}

/**
 * Unified dispatcher — the ONLY place in the codebase that fires external AI requests.
 * The apiKey is always decrypted server-side by resolveAiConfig; it never originates
 * from the request body and cannot be forwarded to any other external destination.
 */
export async function callAiProvider(
  prompt: string,
  apiKey: string,
  meta: import("../routes/settingsRoutes.js").ProviderMeta,
  imageBase64?: string,
  imageMediaType?: string,
): Promise<string> {
  const model = imageBase64 ? meta.visionModel : meta.textModel;

  switch (meta.id) {
    case "anthropic":
      return callAnthropic(prompt, apiKey, model, imageBase64, imageMediaType);
    case "google":
      return callGoogle(prompt, apiKey, model, imageBase64, imageMediaType);
    case "openai":
    case "mistral":
      return callOpenAICompat(
        prompt,
        apiKey,
        meta.apiBase,
        model,
        imageBase64,
        imageMediaType,
      );
    default: {
      // Exhaustiveness guard — TypeScript should catch this at compile time
      const _exhaustive: never = meta.id;
      throw new Error(`Unbekannter Provider: ${String(_exhaustive)}`);
    }
  }
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
  // Validate correctOption — must be one of A/B/C/D (generator enforces this, but guard here too)
  const VALID_MC_OPTIONS = new Set(["A", "B", "C", "D"]);
  const rawCorrect = String(
    (expectedAnswer.correctOption as string) ??
    (expectedAnswer.correctOptionId as string) ??
    ""
  ).toUpperCase().trim();
  const correctOptionId = VALID_MC_OPTIONS.has(rawCorrect) ? rawCorrect : "";

  const selected = (selectedOptionId ?? "").toUpperCase().trim();
  // Strip any residual {{PLACEHOLDER}} from the explanation before showing it
  const explanation = stripPlaceholders((expectedAnswer.explanation as string) ?? "");
  const isCorrect = selected !== "" && correctOptionId !== "" && selected === correctOptionId;
  const awarded = isCorrect ? maxPoints : 0;
  const percent = isCorrect ? 100 : 0;

  const wrongFeedback = correctOptionId
    ? `Leider falsch. Die korrekte Antwort ist Option "${correctOptionId}".${explanation ? " " + explanation : ""}`
    : `Leider falsch.${explanation ? " " + explanation : ""}`;

  return {
    awardedPoints: awarded,
    maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText: isCorrect ? `Richtig!${explanation ? " " + explanation : ""}` : wrongFeedback,
    criterionScores: [
      {
        criterion: "Korrekte Antwort",
        awarded,
        max: maxPoints,
        comment: isCorrect
          ? `Option ${selected} ist korrekt`
          : `Option ${selected} ist falsch${correctOptionId ? ` — korrekt wäre ${correctOptionId}` : ""}`,
      },
    ],
    keyMistakes: isCorrect
      ? []
      : [`Falsche Option "${selected}" gewählt${correctOptionId ? ` — korrekt wäre "${correctOptionId}"` : ""}`],
    improvementHints: isCorrect ? [] : explanation ? [explanation] : [],
    modelUsed: "local_mc_evaluation",
  };
}

/**
 * Grade a multi-select MC answer with partial credit.
 *
 * Scoring: for each option the student marks correctly (select=true when correct,
 * select=false when wrong), one "unit" is earned. Units are scaled to maxPoints.
 *
 * Formula: awarded = round( (correctlyMarked / totalOptions) * maxPoints )
 *
 * studentAnswer comes in as a JSON-stringified array like '["A","C"]',
 * or as a comma-separated fallback like "A,C".
 */
function gradeMcMultiAnswer(
  studentSelectionRaw: string,
  mcOptionIds: string[],
  expectedAnswer: Record<string, unknown>,
  maxPoints: number,
): Omit<AiEvaluation, "id" | "answerId" | "createdAt"> {
  // Parse student selection (JSON array preferred, fallback to comma-separated)
  let studentSelected: string[] = [];
  const trimmed = (studentSelectionRaw ?? "").trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        studentSelected = parsed.map((v) => String(v).toUpperCase().trim());
      }
    } catch {
      /* fall through */
    }
  } else if (trimmed) {
    studentSelected = trimmed
      .split(",")
      .map((v) => v.toUpperCase().trim())
      .filter(Boolean);
  }

  const allIds = mcOptionIds.map((id) => id.toUpperCase());
  const correctSet = new Set(
    Array.isArray(expectedAnswer.correctOptions)
      ? (expectedAnswer.correctOptions as unknown[]).map((v) =>
          String(v).toUpperCase().trim(),
        )
      : [],
  );
  const studentSet = new Set(studentSelected.filter((id) => allIds.includes(id)));

  // Count correct marks: for each option, did the student's inclusion match the truth?
  let correctMarks = 0;
  const wrongSelected: string[] = []; // marked but shouldn't be
  const missed: string[] = []; // should have been marked but wasn't
  for (const id of allIds) {
    const shouldBe = correctSet.has(id);
    const isSelected = studentSet.has(id);
    if (shouldBe === isSelected) {
      correctMarks++;
    } else if (isSelected && !shouldBe) {
      wrongSelected.push(id);
    } else if (!isSelected && shouldBe) {
      missed.push(id);
    }
  }

  const ratio = allIds.length > 0 ? correctMarks / allIds.length : 0;
  const awarded = Math.round(ratio * maxPoints);
  const percent = Math.round(ratio * 100);
  const isPerfect = correctMarks === allIds.length;

  const explanation = stripPlaceholders(
    (expectedAnswer.explanation as string) ?? "",
  );
  const correctList = Array.from(correctSet).sort().join(", ");
  const studentList = Array.from(studentSet).sort().join(", ") || "(keine)";

  let feedbackText: string;
  if (isPerfect) {
    feedbackText = `Richtig! Alle korrekten Optionen (${correctList}) wurden ausgewählt und keine falschen markiert.${explanation ? " " + explanation : ""}`;
  } else if (correctMarks === 0) {
    feedbackText = `Leider komplett daneben. Korrekte Auswahl wäre: ${correctList}. Du hast ausgewählt: ${studentList}.${explanation ? " " + explanation : ""}`;
  } else {
    feedbackText = `Teilweise korrekt (${correctMarks} von ${allIds.length} Optionen richtig eingeordnet). Erwartet: ${correctList}. Ausgewählt: ${studentList}.${explanation ? " " + explanation : ""}`;
  }

  const keyMistakes: string[] = [];
  if (wrongSelected.length) {
    keyMistakes.push(
      `Fälschlicherweise ausgewählt: ${wrongSelected.sort().join(", ")}`,
    );
  }
  if (missed.length) {
    keyMistakes.push(
      `Richtige Option(en) übersehen: ${missed.sort().join(", ")}`,
    );
  }

  return {
    awardedPoints: awarded,
    maxPoints,
    percentageScore: percent,
    ihkGrade: deriveIhkGrade(percent),
    feedbackText,
    criterionScores: [
      {
        criterion: "Korrekte Mehrfachauswahl",
        awarded,
        max: maxPoints,
        comment: `${correctMarks} von ${allIds.length} Optionen korrekt eingeordnet`,
      },
    ],
    keyMistakes,
    improvementHints: isPerfect ? [] : explanation ? [explanation] : [],
    modelUsed: "local_mc_multi_evaluation",
  };
}

async function assessTableAnswer(
  params: AssessAnswerParams,
  apiKey: string,
  meta: import("../routes/settingsRoutes.js").ProviderMeta,
): Promise<Omit<AiEvaluation, "id" | "answerId" | "createdAt">> {
  let parsedRows: string[][] = [];
  try {
    parsedRows = JSON.parse(params.studentAnswer);
  } catch {
    /* leer */
  }

  const expectedConfig = params.expectedAnswer as Record<string, unknown>;
  const expectedRows = (expectedConfig.rows as string[][]) ?? [];
  const columns = (expectedConfig.columns as string[]) ?? [];

  const header = columns.join(" | ");
  const separator = columns.map(() => "---").join(" | ");
  const formatRows = (rows: string[][]) =>
    rows.map((r) => r.join(" | ")).join("\n");

  const studentTable =
    parsedRows.length > 0
      ? `${header}\n${separator}\n${formatRows(parsedRows)}`
      : "(keine Angabe)";
  const expectedTable =
    expectedRows.length > 0
      ? `${header}\n${separator}\n${formatRows(expectedRows)}`
      : "(kein Erwartungshorizont hinterlegt)";

  const prompt = `${buildSystemPrompt(params.examPart, params.scenarioContext)}

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
  "criterionScores": [{ "criterion": "<n>", "awarded": <n>, "max": <n>, "comment": "<1 Satz>" }],
  "keyMistakes": ["<Fehler>"],
  "improvementHints": ["<Tipp>"]
}`;

  const raw = await callAiProvider(prompt, apiKey, meta);
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
    modelUsed: meta.textModel,
  };
}

export async function assessFreitext(
  params: AssessAnswerParams,
  apiKey: string,
  meta: import("../routes/settingsRoutes.js").ProviderMeta,
): Promise<Omit<AiEvaluation, "id" | "answerId" | "createdAt">> {
  if (params.taskType === "table")
    return assessTableAnswer(params, apiKey, meta);
  if (params.taskType === "mc")
    return gradeMcAnswer(
      params.studentAnswer,
      params.expectedAnswer,
      params.maxPoints,
    );
  if (params.taskType === "mc_multi")
    return gradeMcMultiAnswer(
      params.studentAnswer,
      params.mcOptionIds ?? ["A", "B", "C", "D"],
      params.expectedAnswer,
      params.maxPoints,
    );

  // SQL uses an SQL-specific prompt; everything else falls through to the generic freitext prompt.
  const userPrompt =
    params.taskType === "sql"
      ? buildUserPromptSql(params)
      : buildUserPrompt(params);
  const fullPrompt = `${buildSystemPrompt(params.examPart, params.scenarioContext)}\n\n${userPrompt}`;
  const raw = await callAiProvider(fullPrompt, apiKey, meta);
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
    modelUsed: meta.textModel,
  };
}

export async function analyzeDiagram(
  params: AnalyzeDiagramParams,
  apiKey: string,
  meta: import("../routes/settingsRoutes.js").ProviderMeta,
): Promise<Omit<AiEvaluation, "id" | "answerId" | "createdAt">> {
  const prompt = buildDiagramTextPrompt(params);
  const raw = await callAiProvider(
    prompt,
    apiKey,
    meta,
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
    modelUsed: meta.visionModel,
  };
}
