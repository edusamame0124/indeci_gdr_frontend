export type OrhGoalChangeRequestType =
  | 'TITULO'
  | 'DESCRIPCION'
  | 'INDICADOR'
  | 'VALOR_ESPERADO'
  | 'PESO'
  | 'OTRO';

export type OrhGoalChangeRequestStatus = 'PENDIENTE' | 'REVISADO';

export interface OrhGoalChangeRequestItemResponse {
  id: number;
  goalId: number;
  assignmentId: number;
  goalTitle: string;
  evaluatedName: string;
  indicatorName: string;
  requestType: OrhGoalChangeRequestType;
  requestTypeName: string;
  reason: string;
  requestedByUsername: string;
  status: OrhGoalChangeRequestStatus;
  statusName: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByUsername: string | null;
  orhReviewComment: string | null;
}

export type OrhGoalSubmissionStatus = 'ENVIADO' | 'REVISADO';

export interface OrhGoalSubmissionItemResponse {
  id: number;
  goalId: number;
  assignmentId: number;
  goalTitle: string;
  evaluatedName: string;
  indicatorName: string;
  submittedByUsername: string;
  submittedFunctionalActor: string;
  comment: string | null;
  status: OrhGoalSubmissionStatus;
  statusName: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByUsername: string | null;
  orhReviewComment: string | null;
}

export interface ReviewOrhReceptionRequest {
  comment: string | null;
}
