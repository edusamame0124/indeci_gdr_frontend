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
  /** P3 — Fecha de reunión de retroalimentación final (ISO yyyy-MM-dd). RPE 068-2020 Art. 33-39. */
  fechaReunionRetroFinal: string | null;
  /** P3 — Fecha límite para solicitar confirmación (+5 días hábiles). RPE 068-2020 Art. 41. */
  plazoSolicitudConfirmacion: string | null;
  /** P3 — Días hábiles restantes para solicitar confirmación (0 = vencido). */
  diasHabilesRestantesConfirmacion: number | null;
  details: ScoreDetail[];
}

/** P3 — Registro de la reunión de retroalimentación final. */
export interface RetroFinalUpsertRequest {
  fechaReunionRetroFinal: string;
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

/** Respuesta de POST /evaluacion-final/{id}/notificar (alineado al backend). */
export interface QualificationMailNotifyResponse {
  estado: string;
  codigoPlantilla: string;
}
