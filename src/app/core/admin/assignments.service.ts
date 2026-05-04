import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  AssignmentDetailResponse,
  AssignmentListItemResponse,
  AssignmentPersonOptionResponse,
  AssignmentStatusFilter,
  AssignmentSummaryByPersonResponse,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  UpdateAssignmentSegmentRequest,
  UpdateAssignmentStatusRequest
} from './assignments.models';

@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/assignments`;

  list(
    cycleId: number,
    search?: string | null,
    status?: AssignmentStatusFilter | null
  ): Observable<AssignmentListItemResponse[]> {
    let params = new HttpParams().set('cycleId', String(cycleId));
    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<ApiResponse<AssignmentListItemResponse[]>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  getById(id: number): Observable<AssignmentDetailResponse> {
    return this.http
      .get<ApiResponse<AssignmentDetailResponse>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  summary(cycleId: number): Observable<AssignmentSummaryByPersonResponse[]> {
    const params = new HttpParams().set('cycleId', String(cycleId));
    return this.http
      .get<ApiResponse<AssignmentSummaryByPersonResponse[]>>(`${this.baseUrl}/summary`, { params })
      .pipe(map((response) => response.data));
  }

  searchPersons(search?: string | null): Observable<AssignmentPersonOptionResponse[]> {
    let params = new HttpParams();
    if (search && search.trim().length > 0) {
      params = params.set('q', search.trim());
    }
    return this.http
      .get<ApiResponse<AssignmentPersonOptionResponse[]>>(`${this.baseUrl}/persons/searchable`, { params })
      .pipe(map((response) => response.data));
  }

  create(payload: CreateAssignmentRequest): Observable<AssignmentDetailResponse> {
    return this.http
      .post<ApiResponse<AssignmentDetailResponse>>(this.baseUrl, payload)
      .pipe(map((response) => response.data));
  }

  update(id: number, payload: UpdateAssignmentRequest): Observable<AssignmentDetailResponse> {
    return this.http
      .put<ApiResponse<AssignmentDetailResponse>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  updateStatus(id: number, payload: UpdateAssignmentStatusRequest): Observable<AssignmentDetailResponse> {
    return this.http
      .patch<ApiResponse<AssignmentDetailResponse>>(`${this.baseUrl}/${id}/status`, payload)
      .pipe(map((response) => response.data));
  }

  updateSegment(id: number, payload: UpdateAssignmentSegmentRequest): Observable<AssignmentDetailResponse> {
    return this.http
      .patch<ApiResponse<AssignmentDetailResponse>>(`${this.baseUrl}/${id}/segment`, payload)
      .pipe(map((response) => response.data));
  }
}
