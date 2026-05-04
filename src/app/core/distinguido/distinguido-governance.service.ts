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

  getCandidatos(): Observable<DistinguidoCandidatosResponse> {
    return this.http
      .get<ApiResponse<DistinguidoCandidatosResponse>>(`${environment.apiBaseUrl}/distinguidos/candidatos`)
      .pipe(map((r) => r.data));
  }

  patchRequisitos(assignmentId: number, payload: RequisitosDistinguidoRequest): Observable<void> {
    return this.http
      .patch<ApiResponse<null>>(`${environment.apiBaseUrl}/distinguidos/candidatos/${assignmentId}/requisitos`, payload)
      .pipe(map(() => undefined));
  }

  asignar(payload: AsignarDistinguidoRequest): Observable<AsignarDistinguidoResultResponse> {
    return this.http
      .post<ApiResponse<AsignarDistinguidoResultResponse>>(`${environment.apiBaseUrl}/distinguidos/asignar`, payload)
      .pipe(map((r) => r.data));
  }
}
