import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { CycleOptionResponse } from './cycles.models';

export interface CreateCycleRequest {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
}

@Injectable({ providedIn: 'root' })
export class CyclesService {
  private readonly http = inject(HttpClient);

  listAll(): Observable<CycleOptionResponse[]> {
    return this.http
      .get<ApiResponse<CycleOptionResponse[]>>(`${environment.apiBaseUrl}/admin/cycles`)
      .pipe(map((response) => response.data));
  }

  create(request: CreateCycleRequest): Observable<CycleOptionResponse> {
    return this.http
      .post<ApiResponse<CycleOptionResponse>>(`${environment.apiBaseUrl}/admin/cycles`, request)
      .pipe(map((response) => response.data));
  }
}
