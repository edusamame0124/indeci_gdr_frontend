export type EstadoConfirmacionResultado = 'SIN_SOLICITUD' | 'PENDIENTE' | 'RESUELTA';

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
  estadoConfirmacion: EstadoConfirmacionResultado;
  estadoConfirmacionLabel: string;
  confirmacionPendiente: boolean;
  bloqueadoPorVal08: boolean;
}

export interface DistinguidoCandidatosResponse {
  notifiedUniverseTotal: number;
  maxDistinguidosSlots: number;
  currentDistinguidosAssigned: number;
  remainingDistinguidoSlots: number;
  candidatosConConfirmacionPendiente: number;
  bloqueoVal08Activo: boolean;
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
