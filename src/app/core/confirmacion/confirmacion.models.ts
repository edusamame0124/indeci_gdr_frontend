import { QualitativeRatingCode } from '../final-evaluation/final-evaluation.models';

/** P4 — Confirmación de calificación y casos CIE (RPE 068-2020 Art. 41-42). */

export type SolicitudConfirmacionEstado = 'PRESENTADA' | 'EN_CIE' | 'RESUELTA';
export type CasoCieEstado = 'RECIBIDO' | 'RESUELTO';
export type CieDecision = 'CONFIRMA' | 'MODIFICA';

export interface SolicitudConfirmacion {
  id: number;
  finalEvaluationId: number;
  evaluadoId: number;
  evaluadoNombre: string;
  cicloNombre: string;
  fechaSolicitud: string;
  sustentoEvaluado: string;
  estado: SolicitudConfirmacionEstado;
  estadoLabel: string;
  fechaDerivacionCie: string | null;
  plazoSolicitudConfirmacion: string | null;
  numeroCaso: string | null;
  casoEstado: CasoCieEstado | null;
  decision: CieDecision | null;
  calificacionResultado: QualitativeRatingCode | null;
  calificacionResultadoLabel: string | null;
  sustentoCie: string | null;
  fechaDecision: string | null;
}

export interface SolicitudConfirmacionRequest {
  finalEvaluationId: number;
  sustento: string;
}

export interface CasoCie {
  id: number;
  numeroCaso: string;
  solicitudId: number;
  finalEvaluationId: number;
  evaluadoId: number;
  evaluadoNombre: string;
  evaluadorNombre: string;
  cicloNombre: string;
  fechaIngresoCie: string;
  plazoConvocatoria: string | null;
  diasHabilesRestantesConvocatoria: number | null;
  convocatoriaVencida: boolean;
  estado: CasoCieEstado;
  estadoLabel: string;
  sustentoEvaluado: string;
  puntajeActual: number | null;
  calificacionActualCode: QualitativeRatingCode | null;
  calificacionActualLabel: string | null;
  decision: CieDecision | null;
  calificacionResultado: QualitativeRatingCode | null;
  calificacionResultadoLabel: string | null;
  sustentoCie: string | null;
  fechaDecision: string | null;
}

export interface ResolverCasoCieRequest {
  decision: CieDecision;
  calificacionResultado: QualitativeRatingCode | null;
  sustentoCie: string;
}
