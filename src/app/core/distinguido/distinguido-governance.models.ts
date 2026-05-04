export interface DistinguidoCandidatoFila {
  assignmentId: number;
  finalEvaluationId: number;
  evaluatedPersonId: number;
  evaluatedDisplayName: string;
  consolidatedScore: number;
  qualitativeRatingCode: string | null;
  qualitativeRatingLabel: string | null;
  qualRatingNotified: boolean;
  directive82Compliance: boolean;
  eligibleForDistinguidoPool: boolean;
  rankEligible: number;
  alreadyDistinguido: boolean;
}

export interface DistinguidoCandidatosResponse {
  notifiedUniverseTotal: number;
  maxDistinguidosSlots: number;
  currentDistinguidosAssigned: number;
  remainingDistinguidoSlots: number;
  rows: DistinguidoCandidatoFila[];
}

export interface RequisitosDistinguidoRequest {
  qualRatingNotified: boolean;
  directive82ComplianceConfirmed: boolean;
}

export interface AsignarDistinguidoRequest {
  finalEvaluationIds: number[];
}

export interface AsignarDistinguidoResultResponse {
  assignedCount: number;
  remainingDistinguidoSlotsAfter: number;
}
