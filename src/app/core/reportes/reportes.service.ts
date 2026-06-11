import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { CasoCie, SolicitudConfirmacion } from '../confirmacion/confirmacion.models';
import {
  ReporteAvance,
  ReporteDistribucionCalificacion,
  ReporteOportunidadMejora,
  ReporteResultado
} from './reportes.models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);

  getReporteAvance(cycleId: number, evaluatedId?: number | null): Observable<ReporteAvance[]> {
    const params: Record<string, string | number> = { cycleId };
    if (evaluatedId) params['evaluatedId'] = evaluatedId;
    return this.http
      .get<ApiResponse<ReporteAvance[]>>(`${environment.apiBaseUrl}/reportes/avance`, { params })
      .pipe(map((response) => response.data));
  }

  exportarReporteAvance(cycleId: number, evaluatedId?: number | null): Observable<Blob> {
    const params: Record<string, string | number> = { cycleId };
    if (evaluatedId) params['evaluatedId'] = evaluatedId;
    return this.http.get(`${environment.apiBaseUrl}/reportes/avance/exportar`, { params, responseType: 'blob' });
  }

  getReporteResultados(cycleId: number, evaluatedId?: number | null): Observable<ReporteResultado[]> {
    const params: Record<string, string | number> = { cycleId };
    if (evaluatedId) params['evaluatedId'] = evaluatedId;
    return this.http
      .get<ApiResponse<ReporteResultado[]>>(`${environment.apiBaseUrl}/reportes/resultados`, { params })
      .pipe(map((response) => response.data));
  }

  exportarReporteResultados(cycleId: number, evaluatedId?: number | null): Observable<Blob> {
    const params: Record<string, string | number> = { cycleId };
    if (evaluatedId) params['evaluatedId'] = evaluatedId;
    return this.http.get(`${environment.apiBaseUrl}/reportes/resultados/exportar`, { params, responseType: 'blob' });
  }

  getReporteOportunidades(cycleId: number, evaluatedId?: number | null, estadoCodigo?: string | null): Observable<ReporteOportunidadMejora[]> {
    const params: Record<string, string | number> = { cycleId };
    if (evaluatedId) params['evaluatedId'] = evaluatedId;
    if (estadoCodigo) params['estadoCodigo'] = estadoCodigo;
    return this.http
      .get<ApiResponse<ReporteOportunidadMejora[]>>(`${environment.apiBaseUrl}/reportes/oportunidades-mejora`, { params })
      .pipe(map((response) => response.data));
  }

  exportarReporteOportunidades(cycleId: number, evaluatedId?: number | null, estadoCodigo?: string | null): Observable<Blob> {
    const params: Record<string, string | number> = { cycleId };
    if (evaluatedId) params['evaluatedId'] = evaluatedId;
    if (estadoCodigo) params['estadoCodigo'] = estadoCodigo;
    return this.http.get(`${environment.apiBaseUrl}/reportes/oportunidades-mejora/exportar`, { params, responseType: 'blob' });
  }

  getReporteConfirmaciones(): Observable<SolicitudConfirmacion[]> {
    return this.http
      .get<ApiResponse<SolicitudConfirmacion[]>>(`${environment.apiBaseUrl}/reportes/confirmaciones`)
      .pipe(map((response) => response.data));
  }

  exportarReporteConfirmaciones(): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/reportes/confirmaciones/exportar`, { responseType: 'blob' });
  }

  getReporteCie(): Observable<CasoCie[]> {
    return this.http
      .get<ApiResponse<CasoCie[]>>(`${environment.apiBaseUrl}/reportes/cie`)
      .pipe(map((response) => response.data));
  }

  exportarReporteCie(): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/reportes/cie/exportar`, { responseType: 'blob' });
  }

  getReporteDistribucion(cycleId: number): Observable<ReporteDistribucionCalificacion[]> {
    return this.http
      .get<ApiResponse<ReporteDistribucionCalificacion[]>>(`${environment.apiBaseUrl}/reportes/distribucion-calificaciones`, { params: { cycleId } })
      .pipe(map((response) => response.data));
  }

  exportarReporteDistribucion(cycleId: number): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/reportes/distribucion-calificaciones/exportar`, { params: { cycleId }, responseType: 'blob' });
  }
}
