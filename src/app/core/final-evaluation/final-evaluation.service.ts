import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  FinalEvaluationDetail,
  FinalEvaluationSummary,
  FinalEvaluationUpsertRequest,
  QualificationMailNotifyResponse,
  ResultSummary,
  RetroFinalUpsertRequest
} from './final-evaluation.models';

@Injectable({ providedIn: 'root' })
export class FinalEvaluationService {
  private readonly http = inject(HttpClient);

  listFinalEvaluations(cycleId: number): Observable<FinalEvaluationSummary[]> {
    return this.http
      .get<ApiResponse<FinalEvaluationSummary[]>>(`${environment.apiBaseUrl}/evaluacion-final`, { params: { cycleId } })
      .pipe(map((response) => response.data));
  }

  getFinalEvaluation(evaluatedId: number, cycleId: number): Observable<FinalEvaluationDetail> {
    return this.http
      .get<ApiResponse<FinalEvaluationDetail>>(`${environment.apiBaseUrl}/evaluacion-final/${evaluatedId}`, { params: { cycleId } })
      .pipe(map((response) => response.data));
  }

  createFinalEvaluation(cycleId: number, payload: FinalEvaluationUpsertRequest): Observable<FinalEvaluationDetail> {
    return this.http
      .post<ApiResponse<FinalEvaluationDetail>>(`${environment.apiBaseUrl}/evaluacion-final`, payload, { params: { cycleId } })
      .pipe(map((response) => response.data));
  }

  updateFinalEvaluation(evaluationId: number, cycleId: number, payload: FinalEvaluationUpsertRequest): Observable<FinalEvaluationDetail> {
    return this.http
      .put<ApiResponse<FinalEvaluationDetail>>(`${environment.apiBaseUrl}/evaluacion-final/${evaluationId}`, payload, { params: { cycleId } })
      .pipe(map((response) => response.data));
  }

  registrarRetroalimentacionFinal(
    evaluationId: number,
    cycleId: number,
    payload: RetroFinalUpsertRequest
  ): Observable<FinalEvaluationDetail> {
    return this.http
      .put<ApiResponse<FinalEvaluationDetail>>(
        `${environment.apiBaseUrl}/evaluacion-final/${evaluationId}/retroalimentacion-final`,
        payload,
        { params: { cycleId } }
      )
      .pipe(map((response) => response.data));
  }

  notifyQualificationByEmail(evaluationId: number): Observable<QualificationMailNotifyResponse> {
    return this.http
      .post<ApiResponse<QualificationMailNotifyResponse>>(
        `${environment.apiBaseUrl}/evaluacion-final/${evaluationId}/notificar`,
        {}
      )
      .pipe(map((response) => response.data));
  }

  getResult(evaluatedId: number): Observable<ResultSummary> {
    return this.http
      .get<ApiResponse<ResultSummary>>(`${environment.apiBaseUrl}/resultados/${evaluatedId}`)
      .pipe(map((response) => response.data));
  }
}
