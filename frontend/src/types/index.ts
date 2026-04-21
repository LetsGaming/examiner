export type ExamPart = "teil_1" | "teil_2" | "teil_3";
export type TaskType =
  | "freitext"
  | "pseudocode"
  | "mc"
  | "plantuml"
  | "diagram_upload"
  | "table";
export type DiagramType =
  | "uml_class"
  | "uml_sequence"
  | "uml_use_case"
  | "uml_activity"
  | "er";
export type SessionStatus = "in_progress" | "submitted" | "graded";
export type IhkGrade =
  | "sehr_gut"
  | "gut"
  | "befriedigend"
  | "ausreichend"
  | "mangelhaft"
  | "ungenuegend";

export const IHK_GRADE_LABELS: Record<IhkGrade, string> = {
  sehr_gut: "Sehr gut (1)",
  gut: "Gut (2)",
  befriedigend: "Befriedigend (3)",
  ausreichend: "Ausreichend (4)",
  mangelhaft: "Mangelhaft (5)",
  ungenuegend: "Ungenügend (6)",
};
export const IHK_GRADE_COLORS: Record<IhkGrade, string> = {
  sehr_gut: "success",
  gut: "primary",
  befriedigend: "secondary",
  ausreichend: "warning",
  mangelhaft: "danger",
  ungenuegend: "danger",
};

export interface McOption {
  id: string;
  text: string;
}

export interface TableConfig {
  columns: string[];
  rows: string[][];
  rowCount: number;
  fixedFirstColumn?: boolean;
}

// ─── Unteraufgabe (a, b, c …) ────────────────────────────────────────────────
export interface SubTask {
  id: string;
  label: string; // 'a', 'b', 'c' …
  taskType: TaskType;
  questionText: string;
  points: number;
  diagramType?: DiagramType;
  expectedElements?: string[];
  mcOptions?: McOption[];
  tableConfig?: TableConfig;
}

// ─── Hauptaufgabe ─────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  position: number;
  topicArea?: string;
  maxPoints: number;
  subtasks: SubTask[]; // immer mind. 1 Eintrag
}

export interface ExamTemplate {
  id: string;
  title: string;
  year?: number;
  part: ExamPart;
  scenarioName?: string;
  scenarioDescription?: string;
  maxPoints: number;
  durationMinutes: number;
  tasks: Task[];
}

export interface CriterionScore {
  criterion: string;
  awarded: number;
  max: number;
  comment: string;
}

export interface AiEvaluation {
  id?: string;
  answerId: string;
  awardedPoints: number;
  maxPoints: number;
  percentageScore: number;
  ihkGrade: IhkGrade;
  feedbackText: string;
  criterionScores: CriterionScore[];
  keyMistakes: string[];
  improvementHints: string[];
  detectedElements?: string[];
  missingElements?: string[];
  notationErrors?: string[];
  modelUsed: string;
  createdAt?: string;
}

export interface Answer {
  id: string;
  sessionId: string;
  subtaskId: string; // Antwort ist jetzt an SubTask gebunden
  textValue: string;
  selectedMcOption: string | null;
  diagramImagePath?: string;
  answeredAt?: string;
  evaluation?: AiEvaluation;
}

export interface ExamSession {
  id: string;
  userId: string;
  examTemplateId: string;
  examTemplate?: ExamTemplate;
  startedAt: string;
  submittedAt?: string;
  status: SessionStatus;
  totalScore?: number;
  ihkGrade?: IhkGrade;
  answers: Answer[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
