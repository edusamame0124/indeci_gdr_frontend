export interface CycleOptionResponse {
  id: number;
  code: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
}

export interface CronogramaEtapaResponse {
  id: number | null;
  etapa: string;
  etapaLabel: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaFinNormativa: string | null;
  estado: string;
  vencida: boolean;
  diasRestantes: number;
}

export interface CicloConCronogramaResponse {
  id: number;
  code: string;
  name: string;
  status: string;
  estadoEtapa: string;
  estadoEtapaLabel: string;
  startDate: string | null;
  endDate: string | null;
  fechaFinSeguimiento: string | null;
  fechaFinEvaluacion: string | null;
  fechaLimiteInforme: string | null;
  active: boolean;
  cronograma: CronogramaEtapaResponse[];
  transicionesDisponibles: string[];
}

export interface GdrSeguimientoResponse {
  id: number;
  assignmentId: number;
  cycleId: number;
  tipoReunion: string;
  tipoReunionLabel: string;
  fechaReunion: string;
  descripcionAvance: string | null;
  compromisos: string | null;
  estado: string;
  evaluadorId: number | null;
  evaluadoId: number | null;
  consentimientoEvaluado: boolean;
  createdAt: string;
}

export interface ResumenSeguimientoResponse {
  assignmentId: number;
  cycleId: number;
  totalReuniones: number;
  fechaPrimeraReunion: string | null;
  fechaUltimaReunion: string | null;
  diasSeguimiento: number;
  cumpleMinimo6Meses: boolean;
  alertaVAL01: string | null;
  reuniones: GdrSeguimientoResponse[];
}

export interface GdrSeguimientoRequest {
  assignmentId: number;
  tipoReunion: string;
  fechaReunion: string;
  descripcionAvance?: string;
  compromisos?: string;
}

/** Respuesta del endpoint GET /admin/cycles/{id}/board-context */
export interface CicloBoardContextApiResponse {
  cycleId: number;
  estadoEtapa: string;
  estadoEtapaLabel: string;
  canAdvanceToSeguimiento: boolean;
  hasExcepcionEdicion: boolean;
  planificacionCompletadaEn: string | null;
  planificacionCompletadaPor: string | null;
  cronogramaCompleto: boolean;
  participantesRegistrados: boolean;
  asignacionesCompletas: boolean;
  cieAplica: boolean;
  cieConfigurado: boolean;
  indicadoresHabilitados: boolean;
  metasFormalizadas100: boolean;
  notificacionesTomaConocimiento: boolean;
}

/** Respuesta del endpoint GET /admin/cycles/{id}/planning-checklist */
export interface PlanningChecklistApiResponse {
  cronogramaCompleto: boolean;
  seguimientoMinimoSeisMeses: boolean;
  participantesRegistrados: boolean;
  asignacionesCompletas: boolean;
  cieAplica: boolean;
  cieConfigurado: boolean;
  conteoIntegrantesCie: number;
  indicadoresHabilitados: boolean;
  metasFormalizadas100: boolean;
  notificacionesTomaConocimiento: boolean;
  porcentajeAvance: number;
  pendientes: string[];
  bloqueantes: string[];
}
