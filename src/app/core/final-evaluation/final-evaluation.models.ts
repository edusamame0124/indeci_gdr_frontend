export type QualitativeRatingCode =
  | 'BUEN_RENDIMIENTO'
  | 'SUJETO_OBSERVACION'
  | 'DISTINGUIDO'
  | 'DESAPROBADO'
  | 'NO_CALIFICABLE';

export const QUALITATIVE_RATING_LABELS: Record<QualitativeRatingCode, string> = {
  BUEN_RENDIMIENTO: 'Buen rendimiento',
  SUJETO_OBSERVACION: 'Rendimiento sujeto a observación',
  DISTINGUIDO: 'Rendimiento distinguido',
  DESAPROBADO: 'Desaprobado',
  NO_CALIFICABLE: 'No calificable'
};

export interface FinalEvaluationSummary {
  assignmentId: number;
  evaluatedId: number;
  evaluatedName: string;
  evaluatorName: string;
  cycleName: string;
  evaluationId: number | null;
  consolidatedScore: number | null;
  qualitativeRatingCode: QualitativeRatingCode | null;
  qualitativeRatingLabel: string | null;
  segmentCode: string | null;
  segmentName: string | null;
  status: string;
}

export interface ScoreDetail {
  goalId: number;
  goalTitle: string;
  indicatorName: string;
  expectedValue: number;
  weight: number;
  achievedValue: number | null;
  scoreValue: number | null;
  detailComment: string | null;
}

export interface FinalEvaluationDetail {
  evaluationId: number | null;
  assignmentId: number;
  evaluatedId: number;
  evaluatedName: string;
  evaluatorName: string;
  cycleName: string;
  consolidatedScore: number | null;
  qualitativeRatingCode: QualitativeRatingCode | null;
  qualitativeRatingLabel: string | null;
  segmentCode: string | null;
  segmentName: string | null;
  status: string;
  evaluationComment: string | null;
  details: ScoreDetail[];
}

export interface ResultSummary {
  resultId: number;
  assignmentId: number;
  evaluatedId: number;
  evaluatedName: string;
  evaluatorName: string;
  cycleName: string;
  consolidatedScore: number;
  qualitativeRatingCode: QualitativeRatingCode | null;
  qualitativeRatingLabel: string | null;
  segmentCode: string | null;
  segmentName: string | null;
  status: string;
}

export interface FinalEvaluationUpsertRequest {
  assignmentId: number;
  evaluationComment: string | null;
  details: {
    goalId: number;
    achievedValue: number;
    detailComment: string | null;
  }[];
}
