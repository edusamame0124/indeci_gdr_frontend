import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  CasoCie,
  ResolverCasoCieRequest,
  SolicitudConfirmacion,
  SolicitudConfirmacionRequest
} from './confirmacion.models';

@Injectable({ providedIn: 'root' })
export class ConfirmacionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** El evaluado presenta su solicitud; el backend la deriva al CIE automáticamente. */
  solicitar(request: SolicitudConfirmacionRequest): Observable<SolicitudConfirmacion> {
    return this.http
      .post<ApiResponse<SolicitudConfirmacion>>(`${this.base}/gdr/confirmacion`, request)
      .pipe(map((r) => r.data));
  }

  /** Solicitud asociada a una evaluación final; null si todavía no existe. */
  getByEvaluacion(finalEvaluationId: number): Observable<SolicitudConfirmacion | null> {
    return this.http
      .get<ApiResponse<SolicitudConfirmacion | null>>(`${this.base}/gdr/confirmacion/evaluacion/${finalEvaluationId}`)
      .pipe(map((r) => r.data));
  }

  /** Listado de solicitudes del ciclo activo — supervisión ORH/CIE. */
  listarSolicitudes(): Observable<SolicitudConfirmacion[]> {
    return this.http
      .get<ApiResponse<SolicitudConfirmacion[]>>(`${this.base}/gdr/confirmacion`)
      .pipe(map((r) => r.data));
  }

  listarCasos(): Observable<CasoCie[]> {
    return this.http
      .get<ApiResponse<CasoCie[]>>(`${this.base}/gdr/cie/casos`)
      .pipe(map((r) => r.data));
  }

  getCaso(casoId: number): Observable<CasoCie> {
    return this.http
      .get<ApiResponse<CasoCie>>(`${this.base}/gdr/cie/casos/${casoId}`)
      .pipe(map((r) => r.data));
  }

  /** Registra la decisión definitiva del CIE (CONFIRMA o MODIFICA). */
  resolverCaso(casoId: number, request: ResolverCasoCieRequest): Observable<CasoCie> {
    return this.http
      .put<ApiResponse<CasoCie>>(`${this.base}/gdr/cie/casos/${casoId}/resolver`, request)
      .pipe(map((r) => r.data));
  }

  /** P6-04 — Acta de sesión del CIE en PDF. */
  downloadActaCiePdf(casoId: number, numeroCaso: string): Observable<{ blob: Blob; fileName: string }> {
    const fallback = `acta_cie_${numeroCaso}.pdf`;
    return this.http
      .get(`${this.base}/gdr/cie/casos/${casoId}/acta-pdf`, {
        observe: 'response',
        responseType: 'blob'
      })
      .pipe(
        map((response) => ({
          blob: response.body ?? new Blob([], { type: 'application/pdf' }),
          fileName: fallback
        }))
      );
  }
}
