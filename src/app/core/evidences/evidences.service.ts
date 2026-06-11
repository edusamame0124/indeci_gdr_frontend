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

  createEvidence(goalId: number, payload: EvidenceUpsertRequest, file: File | null = null): Observable<EvidenceDetail> {
    return this.http
      .post<ApiResponse<EvidenceDetail>>(`${environment.apiBaseUrl}/metas/${goalId}/evidencias`, this.toEvidenceFormData(payload, file))
      .pipe(map((response) => response.data));
  }

  updateEvidence(evidenceId: number, payload: EvidenceUpsertRequest, file: File | null = null): Observable<EvidenceDetail> {
    return this.http
      .put<ApiResponse<EvidenceDetail>>(`${environment.apiBaseUrl}/evidencias/${evidenceId}`, this.toEvidenceFormData(payload, file))
      .pipe(map((response) => response.data));
  }

  reviewEvidence(evidenceId: number, payload: EvidenceReviewRequest): Observable<EvidenceDetail> {
    return this.http
      .post<ApiResponse<EvidenceDetail>>(`${environment.apiBaseUrl}/evidencias/${evidenceId}/revision`, payload)
      .pipe(map((response) => response.data));
  }

  evidenceFileUrl(evidenceId: number): string {
    return `${environment.apiBaseUrl}/evidencias/${evidenceId}/archivo`;
  }

  downloadEvidenceFile(evidenceId: number): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/evidencias/${evidenceId}/archivo`, {
      responseType: 'blob'
    });
  }

  private toEvidenceFormData(payload: EvidenceUpsertRequest, file: File | null): FormData {
    const formData = new FormData();
    formData.append('title', payload.title);
    if (payload.detail) {
      formData.append('detail', payload.detail);
    }
    formData.append('evidenceTypeCode', payload.evidenceTypeCode);
    formData.append('expectedFormatCode', payload.expectedFormatCode);
    if (payload.expectedDate) {
      formData.append('expectedDate', payload.expectedDate);
    }
    if (payload.mandatory != null) {
      formData.append('mandatory', String(payload.mandatory));
    }
    if (file) {
      formData.append('archivo', file, file.name);
    }
    return formData;
  }
}
