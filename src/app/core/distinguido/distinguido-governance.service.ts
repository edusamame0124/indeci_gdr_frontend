import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  AsignarDistinguidoRequest,
  AsignarDistinguidoResultResponse,
  DistinguidoCandidatosResponse,
  RequisitosDistinguidoRequest
} from './distinguido-governance.models';

@Injectable({
  providedIn: 'root'
})
export class DistinguidoGovernanceService {
  private readonly http = inject(HttpClient);

  getCandidatos(cycleId: number): Observable<DistinguidoCandidatosResponse> {
    return this.http
      .get<ApiResponse<DistinguidoCandidatosResponse>>(`${environment.apiBaseUrl}/distinguidos/candidatos`, {
        params: { cycleId: String(cycleId) }
      })
      .pipe(map((r) => r.data));
  }

  patchRequisitos(assignmentId: number, cycleId: number, payload: RequisitosDistinguidoRequest): Observable<void> {
    return this.http
      .patch<ApiResponse<null>>(
        `${environment.apiBaseUrl}/distinguidos/candidatos/${assignmentId}/requisitos`,
        payload,
        { params: { cycleId: String(cycleId) } }
      )
      .pipe(map(() => undefined));
  }

  asignar(cycleId: number, payload: AsignarDistinguidoRequest): Observable<AsignarDistinguidoResultResponse> {
    return this.http
      .post<ApiResponse<AsignarDistinguidoResultResponse>>(
        `${environment.apiBaseUrl}/distinguidos/asignar`,
        payload,
        { params: { cycleId: String(cycleId) } }
      )
      .pipe(map((r) => r.data));
  }

  /** P6-05 — Acta PDF de la Junta (servidores con Rendimiento distinguido). */
  downloadActaJuntaPdf(cycleId: number): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/distinguidos/acta-junta-pdf`, {
      params: { cycleId: String(cycleId) },
      responseType: 'blob'
    });
  }
}
