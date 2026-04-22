export type ExamPart = 'teil_1' | 'teil_2' | 'teil_3';
export type Specialty = 'fiae' | 'fisi';
export type TaskType =
  | 'freitext'
  | 'pseudocode'
  | 'mc'
  | 'plantuml'
  | 'diagram_upload'
  | 'table';
export type DiagramType =
  | 'uml_class'
  | 'uml_sequence'
  | 'uml_use_case'
  | 'uml_activity'
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
