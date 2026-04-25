export interface ConsentimientoTipo {
  idTipoConsentimiento: number;
  codigoConsentimiento: string;
  nombreConsentimiento: string;
  textoConsentimiento: string;
  versionConsentimiento: number;
  requerido: boolean;
}

export interface ConsentimientoResumen {
  idTipoConsentimiento: number;
  codigoConsentimiento: string;
  nombreConsentimiento: string;
  textoConsentimiento: string;
  versionConsentimiento: number;
  requerido: boolean;
  aceptado: boolean;
  fechaAceptacion: string | null;
}

export interface ConsentimientoHistorial {
  idRegistroConsentimiento: number;
  idTipoConsentimiento: number;
  codigoConsentimiento: string;
  nombreConsentimiento: string;
  versionConsentimiento: number;
  fechaAceptacion: string;
  detalleAceptacion: string | null;
  aceptado: boolean;
}

export interface RegistrarAceptacionConsentimientoPayload {
  idTipoConsentimiento: number;
  detalleAceptacion?: string | null;
}
