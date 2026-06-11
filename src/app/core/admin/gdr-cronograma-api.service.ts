import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { CicloBoardContextApiResponse, CicloConCronogramaResponse, CronogramaEtapaResponse, PlanningChecklistApiResponse } from './cycles.models';

@Injectable({ providedIn: 'root' })
export class GdrCronogramaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getCronogramaActivo(): Observable<CicloConCronogramaResponse> {
    return this.http
      .get<ApiResponse<CicloConCronogramaResponse>>(`${this.base}/gdr/ciclo/activo/cronograma`)
      .pipe(map((r) => r.data));
  }

  getCronograma(cycleId: number): Observable<CicloConCronogramaResponse> {
    return this.http
      .get<ApiResponse<CicloConCronogramaResponse>>(`${this.base}/gdr/ciclo/${cycleId}/cronograma`)
      .pipe(map((r) => r.data));
  }

  upsertEtapa(cycleId: number, etapa: string, request: { fechaInicio: string; fechaFin: string }): Observable<CronogramaEtapaResponse> {
    return this.http
      .put<ApiResponse<CronogramaEtapaResponse>>(`${this.base}/gdr/ciclo/${cycleId}/cronograma/${etapa}`, request)
      .pipe(map((r) => r.data));
  }

  avanzarEtapa(cycleId: number): Observable<CicloConCronogramaResponse> {
    return this.http
      .post<ApiResponse<CicloConCronogramaResponse>>(`${this.base}/admin/cycles/${cycleId}/avanzar-etapa`, {})
      .pipe(map((r) => r.data));
  }

  anularCiclo(cycleId: number): Observable<CicloConCronogramaResponse> {
    return this.http
      .post<ApiResponse<CicloConCronogramaResponse>>(`${this.base}/admin/cycles/${cycleId}/anular`, {})
      .pipe(map((r) => r.data));
  }

  getCicloDetalle(cycleId: number): Observable<CicloConCronogramaResponse> {
    return this.http
      .get<ApiResponse<CicloConCronogramaResponse>>(`${this.base}/admin/cycles/${cycleId}/detalle`)
      .pipe(map((r) => r.data));
  }

  getBoardContext(cycleId: number): Observable<CicloBoardContextApiResponse> {
    return this.http
      .get<ApiResponse<CicloBoardContextApiResponse>>(`${this.base}/admin/cycles/${cycleId}/board-context`)
      .pipe(map((r) => r.data));
  }

  getPlanningChecklist(cycleId: number): Observable<PlanningChecklistApiResponse> {
    return this.http
      .get<ApiResponse<PlanningChecklistApiResponse>>(`${this.base}/admin/cycles/${cycleId}/planning-checklist`)
      .pipe(map((r) => r.data));
  }
}
