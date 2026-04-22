export type ExamPart = 'teil_1' | 'teil_2' | 'teil_3';
export type Specialty = 'fiae' | 'fisi';
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
export type SessionStatus = 'in_progress' | 'submitted' | 'graded';
export type IhkGrade =
  | 'sehr_gut'
  | 'gut'
  | 'befriedigend'
  | 'ausreichend'
  | 'mangelhaft'
  | 'ungenuegend';

export interface TableConfig {
  columns: string[];
  rows: string[][];
  rowCount: number;
  fixedFirstColumn?: boolean;
  /** Optional: konkrete Werte für die erste Spalte wenn fixedFirstColumn === true.
   *  Wenn nicht gesetzt, nutzt das Frontend ggf. generische Label aus der Row. */
  fixedFirstColumnValues?: string[];
  /** Optional: eine bereits vollständig ausgefüllte Beispielzeile zur Veranschaulichung.
   *  Wird im Frontend als Musterzeile gekennzeichnet und ist nicht editierbar. */
  exampleRow?: string[];
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
