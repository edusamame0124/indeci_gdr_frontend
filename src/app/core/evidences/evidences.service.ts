import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  EvidenceDetail,
  EvidenceReviewRequest,
  EvidenceSummary,
  EvidenceUpsertRequest
} from './evidences.models';

@Injectable({ providedIn: 'root' })
export class EvidencesService {
  private readonly http = inject(HttpClient);

  listGoalEvidences(goalId: number): Observable<EvidenceSummary[]> {
    return this.http
      .get<ApiResponse<EvidenceSummary[]>>(`${environment.apiBaseUrl}/metas/${goalId}/evidencias`)
      .pipe(map((response) => response.data));
  }

  getEvidence(evidenceId: number): Observable<EvidenceDetail> {
    return this.http
      .get<ApiResponse<EvidenceDetail>>(`${environment.apiBaseUrl}/evidencias/${evidenceId}`)
      .pipe(map((response) => response.data));
  }

  createEvidence(goalId: number, payload: EvidenceUpsertRequest): Observable<EvidenceDetail> {
    return this.http
      .post<ApiResponse<EvidenceDetail>>(`${environment.apiBaseUrl}/metas/${goalId}/evidencias`, payload)
      .pipe(map((response) => response.data));
  }

  updateEvidence(evidenceId: number, payload: EvidenceUpsertRequest): Observable<EvidenceDetail> {
    return this.http
      .put<ApiResponse<EvidenceDetail>>(`${environment.apiBaseUrl}/evidencias/${evidenceId}`, payload)
      .pipe(map((response) => response.data));
  }

  reviewEvidence(evidenceId: number, payload: EvidenceReviewRequest): Observable<EvidenceDetail> {
    return this.http
      .post<ApiResponse<EvidenceDetail>>(`${environment.apiBaseUrl}/evidencias/${evidenceId}/revision`, payload)
      .pipe(map((response) => response.data));
  }
}
