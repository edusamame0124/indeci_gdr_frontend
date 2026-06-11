import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  GdrSeguimientoRequest,
  GdrSeguimientoResponse,
  ResumenSeguimientoResponse,
} from './cycles.models';

@Injectable({ providedIn: 'root' })
export class GdrSeguimientoApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getResumen(assignmentId: number): Observable<ResumenSeguimientoResponse> {
    return this.http
      .get<ApiResponse<ResumenSeguimientoResponse>>(`${this.base}/gdr/seguimiento/assignment/${assignmentId}`)
      .pipe(map((r) => r.data));
  }

  listarPorCiclo(cycleId: number): Observable<GdrSeguimientoResponse[]> {
    return this.http
      .get<ApiResponse<GdrSeguimientoResponse[]>>(`${this.base}/gdr/seguimiento/ciclo/${cycleId}`)
      .pipe(map((r) => r.data));
  }

  registrar(request: GdrSeguimientoRequest): Observable<GdrSeguimientoResponse> {
    return this.http
      .post<ApiResponse<GdrSeguimientoResponse>>(`${this.base}/gdr/seguimiento`, request)
      .pipe(map((r) => r.data));
  }

  registrarConsentimiento(id: number): Observable<GdrSeguimientoResponse> {
    return this.http
      .post<ApiResponse<GdrSeguimientoResponse>>(`${this.base}/gdr/seguimiento/${id}/consentimiento`, {})
      .pipe(map((r) => r.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base}/gdr/seguimiento/${id}`)
      .pipe(map(() => undefined));
  }
}
