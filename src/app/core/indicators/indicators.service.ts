import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Indicator, IndicatorUpsertRequest } from './indicators.models';

@Injectable({ providedIn: 'root' })
export class IndicatorsService {
  private readonly http = inject(HttpClient);

  listIndicators(): Observable<Indicator[]> {
    return this.http
      .get<ApiResponse<Indicator[]>>(`${environment.apiBaseUrl}/indicators`)
      .pipe(map((response) => response.data));
  }

  createIndicator(payload: IndicatorUpsertRequest): Observable<Indicator> {
    return this.http
      .post<ApiResponse<Indicator>>(`${environment.apiBaseUrl}/indicators`, payload)
      .pipe(map((response) => response.data));
  }

  updateIndicator(indicatorId: number, payload: IndicatorUpsertRequest): Observable<Indicator> {
    return this.http
      .put<ApiResponse<Indicator>>(`${environment.apiBaseUrl}/indicators/${indicatorId}`, payload)
      .pipe(map((response) => response.data));
  }
}
