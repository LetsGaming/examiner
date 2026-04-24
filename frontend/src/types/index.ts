export type ExamPart = 'teil_1' | 'teil_2' | 'teil_3';
export type Specialty = 'fiae' | 'fisi';
export type TaskKind = 'diagram' | 'calc' | 'sql' | 'code' | 'table' | 'text';
export type SessionStatus = 'in_progress' | 'submitted' | 'graded' | 'practice';
export type TaskType =
  | 'freitext'
  | 'pseudocode'
  | 'sql'
  | 'mc'
  | 'mc_multi'
  | 'plantuml'
  | 'diagram_upload'
  | 'table';
export type DiagramType =
  | 'uml_class'
  | 'uml_sequence'
  | 'uml_use_case'
  | 'uml_activity'
  | 'uml_state'
  | 'er';

export type IhkGrade =
  | 'sehr_gut'
  | 'gut'
  | 'befriedigend'
  | 'ausreichend'
  | 'mangelhaft'
  | 'ungenuegend';

// ─── Display constants ────────────────────────────────────────────────────────

export const IHK_GRADE_LABELS: Record<IhkGrade, string> = {
  sehr_gut: 'Sehr gut (1)',
  gut: 'Gut (2)',
  befriedigend: 'Befriedigend (3)',
  ausreichend: 'Ausreichend (4)',
  mangelhaft: 'Mangelhaft (5)',
  ungenuegend: 'Ungenügend (6)',
};

export const PART_LABELS: Record<ExamPart, string> = {
  teil_1: 'Teil 1 — Planen',
  teil_2: 'Teil 2 — Entwicklung',
  teil_3: 'Teil 3 — WiSo',
};

export const PART_LABELS_FISI: Record<ExamPart, string> = {
  teil_1: 'Teil 1 — IT-Systeme',
  teil_2: 'Teil 2 — Netzwerke',
  teil_3: 'Teil 3 — WiSo',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  freitext: 'Freitext',
  pseudocode: 'Pseudocode',
  sql: 'SQL',
  mc: 'Multiple Choice',
  mc_multi: 'Multiple Choice (Mehrfach)',
  plantuml: 'PlantUML',
  diagram_upload: 'Diagramm-Upload',
  table: 'Tabelle',
};

export const TASK_TYPE_SHORT: Record<TaskType, string> = {
  freitext: 'Text',
  pseudocode: 'Code',
  sql: 'SQL',
  mc: 'MC',
  mc_multi: 'MC+',
  plantuml: 'UML',
  diagram_upload: 'Upload',
  table: 'Tabelle',
};

// ─── Domain interfaces ────────────────────────────────────────────────────────

export interface McOption {
  id: string;
  text: string;
}

export interface TableConfig {
  columns: string[];
  rows: string[][];
  rowCount: number;
  fixedFirstColumn?: boolean;
  /** Optional: konkrete Werte für die erste Spalte wenn fixedFirstColumn === true. */
  fixedFirstColumnValues?: string[];
  /** Optional: bereits ausgefüllte Beispielzeile zur Veranschaulichung. */
  exampleRow?: string[];
}

export interface SubTask {
  id: string;
  label: string;
  taskType: TaskType;
  questionText: string;
  points: number;
  diagramType?: DiagramType;
  expectedElements?: string[];
  mcOptions?: McOption[];
  tableConfig?: TableConfig;
}

export interface Task {
  id: string;
  position: number;
  topicArea?: string;
  maxPoints: number;
  subtasks: SubTask[];
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
  subtaskId: string;
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

// ─── Pool / home types ────────────────────────────────────────────────────────

export interface PoolPartStatus {
  part: ExamPart;
  total: number;
  canAssemble: boolean;
  sufficient: boolean;
}

export interface TaskWarning {
  topic: string;
  source: 'user_ai' | 'server_ai' | 'fallback';
  message: string;
}

export interface AiSettings {
  provider: string;
  providers: ProviderInfo[];
  hasKey: boolean;
  keySource: 'user' | 'env' | 'none';
  keyMasked: string | null;
  updatedAt: string | null;
}

export interface ProviderInfo {
  id: string;
  label: string;
  keyHint: string;
  docsUrl: string;
  textModel: string;
  visionModel: string;
}

// ─── Stats types (Feature 1) ──────────────────────────────────────────────────

export interface TopicPerformance {
  topicArea: string;
  part: ExamPart;
  attempts: number;
  avgPercentage: number;
  lastAttemptAt: string;
}

export interface KindPerformance {
  taskKind: TaskKind;
  avgPercentage: number;
  attempts: number;
}

export interface TimelineEntry {
  date: string;
  part: ExamPart;
  percentage: number;
  sessionId: string;
}

export interface MyStats {
  totalExams: number;
  examsByPart: Record<ExamPart, number>;
  averageScoreByPart: Record<ExamPart, number>;
  averageScoreTimeline: TimelineEntry[];
  topicPerformance: TopicPerformance[];
  kindPerformance: KindPerformance[];
  currentStreak: number;
}

// ─── History types (Feature 6) ────────────────────────────────────────────────

export interface SessionListItem {
  id: string;
  part: ExamPart;
  specialty: string;
  title: string;
  scenarioName: string | null;
  startedAt: string;
  submittedAt: string | null;
  status: SessionStatus;
  totalScore: number | null;
  maxPoints: number;
  ihkGrade: IhkGrade | null;
  isPractice: boolean;
  isReview: boolean;
}

// ─── Extended SubTask with expectedAnswer (Feature 4) ────────────────────────

export interface ExpectedAnswer {
  keyPoints?: string[];
  explanation?: string;
  correctOption?: string;
  correctOptions?: string[];
  solutionSql?: string;
  exampleRow?: string[];
  expectedElements?: string[];
  [key: string]: unknown;
}

export interface SubTaskWithAnswer extends SubTask {
  expectedAnswer?: ExpectedAnswer;
}

// ─── Admin types ──────────────────────────────────────────────────────────────

export interface AdminPoolTask {
  id: string;
  topic_area: string;
  task_kind: string;
  points_value: number;
  difficulty: string;
  times_used: number;
  created_at: string;
  source: string;
  admin_note: string | null;
  subtask_count: number;
}

export interface AdminSubtask {
  id: string;
  label: string;
  task_type: TaskType;
  question_text: string;
  expected_answer: Record<string, unknown> | string;
  points: number;
  diagram_type?: string;
  expected_elements?: string[];
  mc_options?: McOption[];
  table_config?: TableConfig | null;
  position: number;
}

export interface AdminTaskDetail extends AdminPoolTask {
  part: ExamPart;
  specialty: string;
  subtasks: AdminSubtask[];
  usageHistory: { title: string; started_at: string; status: string; ihk_grade: string | null }[];
}

export interface AdminPoolStats {
  parts: {
    part: ExamPart;
    total: number;
    kindDistribution: { task_kind: string; n: number }[];
    difficultyDistribution: { difficulty: string; n: number }[];
    mostUsedTasks: AdminPoolTask[];
    neverUsedCount: number;
    newestTasks: AdminPoolTask[];
  }[];
  totals: { tasks: number; sessions: number; users: number };
}

export interface AdminHealthIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  detail?: unknown;
}

export interface AdminHealth {
  score: number;
  issues: AdminHealthIssue[];
}

export interface AdminUser {
  id: string;
  email: string;
  is_admin: number;
  created_at: string;
  session_count: number;
}

export interface AdminGenerateResult {
  generated: number;
  failed: number;
  taskIds?: string[];
}
