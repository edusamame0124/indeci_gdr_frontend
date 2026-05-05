/** MIME de PDF generado para Formato GDR. */
export const FORMATO_GDR_PDF_MIME = 'application/pdf' as const;

/** Respuesta de GET /documentos/formato-gdr/pdf?evaluatedId=… (cuerpo binario + cabeceras). */
export interface FormatoGdrPdfDownload {
  blob: Blob;
  mimeType: string;
  fileName: string;
}

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
  codigoTipoDocumento: string;
  tipoDocumento: string;
  descripcionContingencia: string | null;
  nombreOriginal: string;
  mimeType: string;
  tamanioBytes: number;
  versionActual: number;
  estado: string;
  usuarioCarga: string;
  fechaCarga: string;
}

/** Respuesta paginada alineada a Spring `Page` (payload en `data`). */
export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Fila de GET /documentos/unidades-organizacionales (oficinas activas: prefijo `OF_` o codigo institucional `OTI`). */
export interface HrOrgUnitOrganigrama {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  parentName: string | null;
  displayOrder: number;
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
  descripcionContingencia: string | null;
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
