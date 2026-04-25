import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  DocumentoFirmadoDetalle,
  DocumentoFirmadoResumen,
  InicioFirma,
  PlantillaDocumento,
  RegistrarRetornoFirmaPayload,
  SolicitudFirmaDetalle,
  TipoDocumento
} from './documents.models';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly http = inject(HttpClient);

  listTypes(): Observable<TipoDocumento[]> {
    return this.http
      .get<ApiResponse<TipoDocumento[]>>(`${environment.apiBaseUrl}/documentos/tipos`)
      .pipe(map((response) => response.data));
  }

  listTemplates(): Observable<PlantillaDocumento[]> {
    return this.http
      .get<ApiResponse<PlantillaDocumento[]>>(`${environment.apiBaseUrl}/documentos/plantillas`)
      .pipe(map((response) => response.data));
  }

  listSignedDocuments(evaluatedId: number): Observable<DocumentoFirmadoResumen[]> {
    return this.http
      .get<ApiResponse<DocumentoFirmadoResumen[]>>(`${environment.apiBaseUrl}/documentos/firmados`, {
        params: { evaluatedId }
      })
      .pipe(map((response) => response.data));
  }

  prepareSignatureDocument(evaluatedId: number, plantillaId: number): Observable<SolicitudFirmaDetalle> {
    return this.http
      .post<ApiResponse<SolicitudFirmaDetalle>>(`${environment.apiBaseUrl}/documentos/firmas/preparar`, {
        evaluatedId,
        plantillaId
      })
      .pipe(map((response) => response.data));
  }

  createSignatureRequest(solicitudFirmaId: number): Observable<SolicitudFirmaDetalle> {
    return this.http
      .post<ApiResponse<SolicitudFirmaDetalle>>(`${environment.apiBaseUrl}/documentos/firmas/solicitudes`, {
        solicitudFirmaId
      })
      .pipe(map((response) => response.data));
  }

  startSignatureRequest(solicitudFirmaId: number): Observable<InicioFirma> {
    return this.http
      .post<ApiResponse<InicioFirma>>(`${environment.apiBaseUrl}/documentos/firmas/solicitudes/${solicitudFirmaId}/iniciar`, {})
      .pipe(map((response) => response.data));
  }

  getSignatureRequest(solicitudFirmaId: number): Observable<SolicitudFirmaDetalle> {
    return this.http
      .get<ApiResponse<SolicitudFirmaDetalle>>(`${environment.apiBaseUrl}/documentos/firmas/solicitudes/${solicitudFirmaId}`)
      .pipe(map((response) => response.data));
  }

  getPreparedDocumentFile(solicitudFirmaId: number, download = false): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/documentos/firmas/solicitudes/${solicitudFirmaId}/preparado`, {
      params: { descarga: download },
      responseType: 'blob'
    });
  }

  registerSignatureReturn(
    solicitudFirmaId: number,
    payload: RegistrarRetornoFirmaPayload
  ): Observable<SolicitudFirmaDetalle> {
    const formData = new FormData();
    formData.append('codigoEstadoFlujo', payload.codigoEstadoFlujo);
    if (payload.codigoResultadoFirma) {
      formData.append('codigoResultadoFirma', payload.codigoResultadoFirma);
    }
    if (payload.mensajeResultadoFirma) {
      formData.append('mensajeResultadoFirma', payload.mensajeResultadoFirma);
    }
    if (payload.archivoFirmado) {
      formData.append('archivoFirmado', payload.archivoFirmado);
    }

    return this.http
      .post<ApiResponse<SolicitudFirmaDetalle>>(
        `${environment.apiBaseUrl}/documentos/firmas/solicitudes/${solicitudFirmaId}/retorno`,
        formData
      )
      .pipe(map((response) => response.data));
  }

  registerSignedDocument(evaluatedId: number, tipoDocumentoId: number, archivo: File): Observable<DocumentoFirmadoDetalle> {
    const formData = new FormData();
    formData.append('evaluatedId', String(evaluatedId));
    formData.append('tipoDocumentoId', String(tipoDocumentoId));
    formData.append('archivo', archivo);

    return this.http
      .post<ApiResponse<DocumentoFirmadoDetalle>>(`${environment.apiBaseUrl}/documentos/firmados`, formData)
      .pipe(map((response) => response.data));
  }

  getSignedDocument(documentId: number): Observable<DocumentoFirmadoDetalle> {
    return this.http
      .get<ApiResponse<DocumentoFirmadoDetalle>>(`${environment.apiBaseUrl}/documentos/firmados/${documentId}`)
      .pipe(map((response) => response.data));
  }

  downloadTemplate(templateId: number): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/documentos/plantillas/${templateId}/descarga`, {
      responseType: 'blob'
    });
  }

  getSignedDocumentFile(documentId: number, download = false): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/documentos/firmados/${documentId}/preview`, {
      params: { descarga: download },
      responseType: 'blob'
    });
  }
}
