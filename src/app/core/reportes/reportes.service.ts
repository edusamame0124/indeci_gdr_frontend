import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { ReporteAvance, ReporteOportunidadMejora, ReporteResultado } from './reportes.models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);

  getReporteAvance(evaluatedId?: number | null): Observable<ReporteAvance[]> {
    return this.http
      .get<ApiResponse<ReporteAvance[]>>(`${environment.apiBaseUrl}/reportes/avance`, {
        params: evaluatedId ? { evaluatedId } : {}
      })
      .pipe(map((response) => response.data));
  }

  exportarReporteAvance(evaluatedId?: number | null): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/reportes/avance/exportar`, {
      params: evaluatedId ? { evaluatedId } : {},
      responseType: 'blob'
    });
  }

  getReporteResultados(evaluatedId?: number | null): Observable<ReporteResultado[]> {
    return this.http
      .get<ApiResponse<ReporteResultado[]>>(`${environment.apiBaseUrl}/reportes/resultados`, {
        params: evaluatedId ? { evaluatedId } : {}
      })
      .pipe(map((response) => response.data));
  }

  exportarReporteResultados(evaluatedId?: number | null): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/reportes/resultados/exportar`, {
      params: evaluatedId ? { evaluatedId } : {},
      responseType: 'blob'
    });
  }

  getReporteOportunidades(evaluatedId?: number | null, estadoCodigo?: string | null): Observable<ReporteOportunidadMejora[]> {
    const params: Record<string, string | number> = {};
    if (evaluatedId) {
      params['evaluatedId'] = evaluatedId;
    }
    if (estadoCodigo) {
      params['estadoCodigo'] = estadoCodigo;
    }
    return this.http
      .get<ApiResponse<ReporteOportunidadMejora[]>>(`${environment.apiBaseUrl}/reportes/oportunidades-mejora`, { params })
      .pipe(map((response) => response.data));
  }

  exportarReporteOportunidades(evaluatedId?: number | null, estadoCodigo?: string | null): Observable<Blob> {
    const params: Record<string, string | number> = {};
    if (evaluatedId) {
      params['evaluatedId'] = evaluatedId;
    }
    if (estadoCodigo) {
      params['estadoCodigo'] = estadoCodigo;
    }
    return this.http.get(`${environment.apiBaseUrl}/reportes/oportunidades-mejora/exportar`, {
      params,
      responseType: 'blob'
    });
  }
}
