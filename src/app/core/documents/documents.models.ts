export interface TipoDocumento {
  idTipoDocumento: number;
  codigoTipoDocumento: string;
  nombreTipoDocumento: string;
  descripcion: string | null;
}

export interface PlantillaDocumento {
  idPlantilla: number;
  idTipoDocumento: number;
  codigoTipoDocumento: string;
  nombreTipoDocumento: string;
  nombrePlantilla: string;
  descripcion: string | null;
  nombreOriginal: string;
  mimeType: string;
  tamanioBytes: number;
}

export interface DocumentoFirmadoResumen {
  idDocumentoFirmado: number;
  idResultado: number;
  idEvaluado: number;
  evaluado: string;
  idTipoDocumento: number;
  tipoDocumento: string;
  nombreOriginal: string;
  mimeType: string;
  tamanioBytes: number;
  versionActual: number;
  estado: string;
  usuarioCarga: string;
  fechaCarga: string;
}

export interface DocumentoFirmadoDetalle {
  idDocumentoFirmado: number;
  idResultado: number;
  idEvaluado: number;
  evaluado: string;
  evaluador: string;
  ciclo: string;
  idTipoDocumento: number;
  codigoTipoDocumento: string;
  tipoDocumento: string;
  nombreOriginal: string;
  mimeType: string;
  tamanioBytes: number;
  versionActual: number;
  estado: string;
  usuarioCarga: string;
  fechaCarga: string;
}

export interface SolicitudFirmaDetalle {
  idSolicitudFirma: number;
  idResultado: number;
  idEvaluado: number;
  evaluado: string;
  evaluador: string;
  ciclo: string;
  idTipoDocumento: number;
  codigoTipoDocumento: string;
  tipoDocumento: string;
  idPlantilla: number;
  nombrePlantilla: string;
  nombreArchivoPreparado: string;
  estadoFlujo: string;
  proveedorFirma: string;
  idTransaccionExterna: string | null;
  urlFirma: string | null;
  fechaSolicitud: string | null;
  fechaInicioFirma: string | null;
  fechaRetorno: string | null;
  fechaRegistroDocumento: string | null;
  codigoResultadoFirma: string | null;
  mensajeResultadoFirma: string | null;
  idDocumentoFirmado: number | null;
  puedeIniciarFirma: boolean;
  puedeRegistrarRetorno: boolean;
  documentoPreparadoDisponible: boolean;
  documentoFirmadoDisponible: boolean;
  integracionOficialDisponible: boolean;
  consultaProveedorDisponible: boolean;
  retornoAutomaticoHabilitado: boolean;
  modoIntegracion: string;
  mensajeIntegracion: string;
}

export interface InicioFirma {
  idSolicitudFirma: number;
  estadoFlujo: string;
  proveedorFirma: string;
  idTransaccionExterna: string;
  urlFirma: string;
  mensaje: string;
  integracionOficialDisponible: boolean;
  consultaProveedorDisponible: boolean;
  retornoAutomaticoHabilitado: boolean;
  modoIntegracion: string;
  mensajeIntegracion: string;
}

export interface RegistrarRetornoFirmaPayload {
  codigoEstadoFlujo: 'FIRMADO' | 'ERROR_FIRMA' | 'FIRMA_CANCELADA';
  codigoResultadoFirma?: string | null;
  mensajeResultadoFirma?: string | null;
  archivoFirmado?: File | null;
}
