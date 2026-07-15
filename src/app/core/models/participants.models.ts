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
  /** Persona ya aprovisionada en GDR. Nulo si la persona viene de SISRH. */
  personId?: number | null;
  role: 'EVALUADOR' | 'EVALUADO';
  /** Datos del directorio SISRH para aprovisionar al asignar (si personId es nulo). */
  documentNumber?: string | null;
  displayName?: string | null;
  username?: string | null;
  orgUnitCode?: string | null;
}
