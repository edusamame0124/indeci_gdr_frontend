export interface FinalEvaluationSummary {
  assignmentId: number;
  evaluatedId: number;
  evaluatedName: string;
  evaluatorName: string;
  cycleName: string;
  evaluationId: number | null;
  consolidatedScore: number | null;
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
