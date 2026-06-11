import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { CycleAccessResponse } from '../admin/cycle-access.models';

@Injectable({ providedIn: 'root' })
export class CycleValidateService {
  private readonly http = inject(HttpClient);

  validateAccess(cycleId: number): Observable<CycleAccessResponse> {
    return this.http
      .get<ApiResponse<CycleAccessResponse>>(
        `${environment.apiBaseUrl}/admin/cycles/${cycleId}/validate-access`
      )
      .pipe(map((response) => response.data));
  }
}
