export const MAX_GOAL_SCORE = 120;
export const MAX_FINAL_SCORE = 120;

export interface GoalSummary {
  id: number;
  title: string;
  expectedValue: number;
  weight: number;
  startDate: string;
  endDate: string;
  status: string;
  assignmentId: number;
  evaluatedName: string;
  indicatorId: number;
  indicatorName: string;
  evidenceCount: number;
  achievedValue: number | null;
  calculatedScore: number | null;
}

export interface GoalDetail {
  id: number;
  assignmentId: number;
  cycleName: string;
  evaluatorName: string;
  evaluatedName: string;
  indicatorId: number;
  indicatorCode: string;
  indicatorName: string;
  title: string;
  description: string | null;
  expectedValue: number;
  weight: number;
  startDate: string;
  endDate: string;
  status: string;
  achievedValue: number | null;
  calculatedScore: number | null;
}

export interface GoalUpsertRequest {
  assignmentId: number;
  indicatorId: number;
  title: string;
  description: string | null;
  expectedValue: number;
  weight: number;
  startDate: string;
  endDate: string;
}

export interface GoalCalificacionRequest {
  achievedValue: number;
}

export type GoalChangeRequestType =
  | 'TITULO'
  | 'DESCRIPCION'
  | 'INDICADOR'
  | 'VALOR_ESPERADO'
  | 'PESO'
  | 'OTRO';

export interface GoalChangeRequestCreateRequest {
  requestType: GoalChangeRequestType;
  reason: string;
  comment: string | null;
}

export interface GoalChangeRequestResponse {
  id: number;
  goalId: number;
  assignmentId: number;
  goalTitle: string;
  requestType: GoalChangeRequestType;
  requestTypeName: string;
  reason: string;
  comment: string | null;
  status: 'PENDIENTE';
  statusName: string;
  requestedByUsername: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalOrhSubmissionCreateRequest {
  comment: string | null;
}

export interface GoalOrhSubmissionResponse {
  id: number;
  goalId: number;
  assignmentId: number;
  goalTitle: string;
  status: 'ENVIADO';
  statusName: string;
  submittedByUsername: string;
  submittedFunctionalActor: string;
  comment: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}
