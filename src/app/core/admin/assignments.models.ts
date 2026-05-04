export type AssignmentStatus = 'ACTIVE' | 'INACTIVE';
export type AssignmentStatusFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';

export type ResolvedFunctionalActor =
  | 'EVALUADOR'
  | 'EVALUADO'
  | 'EVALUADOR_Y_EVALUADO'
  | 'SIN_ROL_FUNCIONAL_GDR';

export interface AssignmentPersonRef {
  personId: number;
  documentNumber: string;
  displayName: string;
  orgUnitId: number | null;
  orgUnitCode: string | null;
  orgUnitName: string | null;
}

export interface AssignmentListItemResponse {
  id: number;
  cycleId: number;
  cycleCode: string;
  cycleName: string;
  evaluator: AssignmentPersonRef;
  evaluated: AssignmentPersonRef;
  segmentId: number | null;
  segmentCode: string | null;
  segmentName: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentDetailResponse extends AssignmentListItemResponse {
  cycleStatus: string;
}

export interface AssignmentSummaryByPersonResponse {
  personId: number;
  documentNumber: string;
  displayName: string;
  orgUnitId: number | null;
  orgUnitCode: string | null;
  orgUnitName: string | null;
  asEvaluatorCount: number;
  asEvaluatedCount: number;
  resolvedFunctionalActor: ResolvedFunctionalActor;
}

export interface AssignmentPersonOptionResponse {
  personId: number;
  documentNumber: string;
  displayName: string;
  orgUnitId: number | null;
  orgUnitCode: string | null;
  orgUnitName: string | null;
}

export interface CreateAssignmentRequest {
  cycleId: number;
  evaluatorPersonId: number;
  evaluatedPersonId: number;
  segmentId?: number | null;
}

export interface UpdateAssignmentRequest {
  evaluatorPersonId: number;
  evaluatedPersonId: number;
  segmentId?: number | null;
}

export interface UpdateAssignmentStatusRequest {
  status: AssignmentStatus;
}

export interface UpdateAssignmentSegmentRequest {
  segmentId: number;
}
