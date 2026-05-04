import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { CycleOptionResponse } from './cycles.models';

@Injectable({ providedIn: 'root' })
export class CyclesService {
  private readonly http = inject(HttpClient);

  listAll(): Observable<CycleOptionResponse[]> {
    return this.http
      .get<ApiResponse<CycleOptionResponse[]>>(`${environment.apiBaseUrl}/admin/cycles`)
      .pipe(map((response) => response.data));
  }
}
