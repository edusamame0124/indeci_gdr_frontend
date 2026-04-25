export interface ReporteAvance {
  idAsignacion: number;
  idEvaluado: number;
  evaluado: string;
  evaluador: string;
  ciclo: string;
  totalMetas: number;
  totalEvidencias: number;
  metasConEvidencia: number;
  evaluacionFinalDisponible: boolean;
  resultadoDisponible: boolean;
  totalDocumentosFirmados: number;
  oportunidadesAbiertas: number;
  oportunidadesCerradas: number;
}

export interface ReporteResultado {
  idResultado: number;
  idEvaluado: number;
  evaluado: string;
  evaluador: string;
  ciclo: string;
  puntajeFinal: number;
  puntajeResultado: number;
  comentarioEvaluacion: string | null;
  documentosFirmados: number;
  oportunidadesMejora: number;
}

export interface ReporteOportunidadMejora {
  idOportunidadMejora: number;
  idResultado: number;
  idEvaluado: number;
  evaluado: string;
  evaluador: string;
  ciclo: string;
  estadoCodigo: string;
  estadoNombre: string;
  responsable: string;
  plazoCompromiso: string | null;
  fechaRegistro: string | null;
  fechaCierre: string | null;
  totalSeguimientos: number;
}
