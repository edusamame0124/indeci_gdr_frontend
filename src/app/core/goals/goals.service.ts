import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { GoalDetail, GoalSummary, GoalUpsertRequest } from './goals.models';

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly http = inject(HttpClient);

  listGoals(): Observable<GoalSummary[]> {
    return this.http
      .get<ApiResponse<GoalSummary[]>>(`${environment.apiBaseUrl}/goals`)
      .pipe(map((response) => response.data));
  }

  getGoal(goalId: number): Observable<GoalDetail> {
    return this.http
      .get<ApiResponse<GoalDetail>>(`${environment.apiBaseUrl}/goals/${goalId}`)
      .pipe(map((response) => response.data));
  }

  createGoal(payload: GoalUpsertRequest): Observable<GoalDetail> {
    return this.http
      .post<ApiResponse<GoalDetail>>(`${environment.apiBaseUrl}/goals`, payload)
      .pipe(map((response) => response.data));
  }

  updateGoal(goalId: number, payload: GoalUpsertRequest): Observable<GoalDetail> {
    return this.http
      .put<ApiResponse<GoalDetail>>(`${environment.apiBaseUrl}/goals/${goalId}`, payload)
      .pipe(map((response) => response.data));
  }
}
