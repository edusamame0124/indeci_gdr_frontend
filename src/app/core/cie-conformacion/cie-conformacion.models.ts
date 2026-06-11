export interface CieIntegrante {
  id: number;
  rolCie: string;
  rolCieLabel: string;
  segmento: string | null;
  idPersona: number | null;
  nombreDisplay: string;
  cargoDescripcion: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  estado: string;
}

export interface CieConformacion {
  id: number;
  cycleId: number | null;
  cycleNombre: string;
  resolucionNumero: string | null;
  resolucionFecha: string | null;
  vigenciaInicio: string;
  vigenciaFin: string | null;
  observaciones: string | null;
  estado: string;
  estadoLabel: string;
  registradoPor: string;
  createdAt: string;
  integrantes: CieIntegrante[];
}

export interface IntegranteFormItem {
  rolCie: string;
  segmento: string;
  idPersona: number | null;
  nombreExterno: string;
  cargoDescripcion: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface RegistrarCieConformacionRequest {
  cycleId: number | null;
  resolucionNumero: string;
  resolucionFecha: string | null;
  vigenciaInicio: string;
  vigenciaFin: string | null;
  observaciones: string;
  integrantes: {
    rolCie: string;
    segmento: string | null;
    idPersona: number | null;
    nombreExterno: string | null;
    cargoDescripcion: string | null;
    fechaInicio: string;
    fechaFin: string | null;
  }[];
}

export const ROL_CIE_LABELS: Record<string, string> = {
  TITULAR_ORH:       'Jefe de ORH / Representante',
  REP_EVALUADOS_SEG: 'Representante de evaluados por segmento',
  DESIGNADO_CASO:    'Designado según tipo de caso',
  ACCESITARIO:       'Integrante accesitario',
};

export const ROLES_CIE = Object.keys(ROL_CIE_LABELS);
