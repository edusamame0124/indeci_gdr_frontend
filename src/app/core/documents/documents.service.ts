import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  DocumentoFirmadoDetalle,
  DocumentoFirmadoResumen,
  FORMATO_GDR_PDF_MIME,
  FormatoGdrPdfDownload,
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

  /**
   * Descarga el Formato GDR generado (.pdf) para el evaluado indicado.
   * Usa la query `evaluatedId` alineada al backend y respeta nombre y MIME devueltos en cabeceras.
   */
  downloadFormatoGdrPdf(evaluatedId: number): Observable<FormatoGdrPdfDownload> {
    const fallbackFileName = `formato_gdr_evaluado_${evaluatedId}.pdf`;
    return this.http
      .get(`${environment.apiBaseUrl}/documentos/formato-gdr/pdf`, {
        params: { evaluatedId: String(evaluatedId) },
        observe: 'response',
        responseType: 'blob'
      })
      .pipe(
        map((response) => {
          const rawType = response.headers.get('Content-Type')?.split(';')[0]?.trim();
          const mimeType =
            rawType && rawType.length > 0 && rawType !== 'application/octet-stream'
              ? rawType
              : FORMATO_GDR_PDF_MIME;
          const fromDisposition = this.parseContentDispositionFileName(
            response.headers.get('Content-Disposition')
          );
          const fileName = fromDisposition ?? fallbackFileName;
          const body = response.body;
          const blob =
            body != null
              ? body.type && body.type.length > 0
                ? body
                : new Blob([body], { type: mimeType })
              : new Blob([], { type: mimeType });
          return { blob, mimeType, fileName };
        })
      );
  }

  private parseContentDispositionFileName(header: string | null): string | null {
    if (!header) {
      return null;
    }
    const segments = header.split(';').map((part) => part.trim());
    for (const segment of segments) {
      const star = /^filename\*=(?:UTF-8'')?(.+)$/i.exec(segment);
      if (star) {
        let value = star[1].trim().replace(/^"(.*)"$/, '$1');
        try {
          value = decodeURIComponent(value);
        } catch {
          /* usar literal */
        }
        return value;
      }
    }
    for (const segment of segments) {
      const plain = /^filename=(.+)$/i.exec(segment);
      if (plain) {
        let value = plain[1].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        return value;
      }
    }
    return null;
  }

  getSignedDocumentFile(documentId: number, download = false): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/documentos/firmados/${documentId}/preview`, {
      params: { descarga: download },
      responseType: 'blob'
    });
  }
}
