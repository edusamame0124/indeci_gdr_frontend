export interface ParticipantListItemResponse {
  participantId: number;
  cycleId: number;
  personId: number;
  displayName: string;
  documentNumber: string;
  orgUnitName: string;
  role: 'EVALUADOR' | 'EVALUADO' | 'MIXTO';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface CreateParticipantRoleRequest {
  cycleId: number;
  personId: number;
  role: 'EVALUADOR' | 'EVALUADO';
}
