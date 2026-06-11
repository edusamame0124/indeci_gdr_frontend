import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  OrhGoalChangeRequestItemResponse,
  OrhGoalSubmissionItemResponse,
  ReviewOrhReceptionRequest
} from './orh-reception.models';

@Injectable({ providedIn: 'root' })
export class OrhReceptionService {
  private readonly http = inject(HttpClient);

  listChangeRequests(cycleId: number): Observable<OrhGoalChangeRequestItemResponse[]> {
    return this.http
      .get<ApiResponse<OrhGoalChangeRequestItemResponse[]>>(
        `${environment.apiBaseUrl}/orh/reception/change-requests`,
        { params: { cycleId: String(cycleId) } }
      )
      .pipe(map((response) => response.data));
  }

  listSubmissions(cycleId: number): Observable<OrhGoalSubmissionItemResponse[]> {
    return this.http
      .get<ApiResponse<OrhGoalSubmissionItemResponse[]>>(
        `${environment.apiBaseUrl}/orh/reception/submissions`,
        { params: { cycleId: String(cycleId) } }
      )
      .pipe(map((response) => response.data));
  }

  reviewChangeRequest(
    id: number,
    cycleId: number,
    payload: ReviewOrhReceptionRequest
  ): Observable<OrhGoalChangeRequestItemResponse> {
    return this.http
      .patch<ApiResponse<OrhGoalChangeRequestItemResponse>>(
        `${environment.apiBaseUrl}/orh/reception/change-requests/${id}/review`,
        payload,
        { params: { cycleId: String(cycleId) } }
      )
      .pipe(map((response) => response.data));
  }

  reviewSubmission(
    id: number,
    cycleId: number,
    payload: ReviewOrhReceptionRequest
  ): Observable<OrhGoalSubmissionItemResponse> {
    return this.http
      .patch<ApiResponse<OrhGoalSubmissionItemResponse>>(
        `${environment.apiBaseUrl}/orh/reception/submissions/${id}/review`,
        payload,
        { params: { cycleId: String(cycleId) } }
      )
      .pipe(map((response) => response.data));
  }
}
