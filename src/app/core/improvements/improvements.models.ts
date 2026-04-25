export interface OportunidadMejoraResumen {
  idOportunidadMejora: number;
  idResultado: number;
  idEvaluado: number;
  evaluado: string;
  descripcion: string;
  responsable: string;
  plazoCompromiso: string;
  codigoEstado: string;
  nombreEstado: string;
  fechaCreacion: string;
}

export interface SeguimientoMejora {
  idSeguimientoOportunidadMejora: number;
  comentarioSeguimiento: string;
  usuarioRegistro: string;
  fechaRegistro: string;
}

export interface OportunidadMejoraDetalle {
  idOportunidadMejora: number;
  idResultado: number;
  idEvaluado: number;
  evaluado: string;
  evaluador: string;
  ciclo: string;
  descripcion: string;
  responsable: string;
  plazoCompromiso: string;
  codigoEstado: string;
  nombreEstado: string;
  comentarioCierre: string | null;
  fechaCierre: string | null;
  fechaCreacion: string;
  seguimientos: SeguimientoMejora[];
}

export interface RegistrarOportunidadMejoraPayload {
  evaluatedId: number;
  descripcion: string;
  responsable: string;
  plazoCompromiso: string;
  estadoCodigo?: string | null;
  comentarioCierre?: string | null;
}

export interface RegistrarSeguimientoMejoraPayload {
  comentarioSeguimiento: string;
}
