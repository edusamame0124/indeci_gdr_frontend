import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { HrAssignmentSummary } from './hr.models';

@Injectable({ providedIn: 'root' })
export class HrService {
  private readonly http = inject(HttpClient);

  listAssignments(): Observable<HrAssignmentSummary[]> {
    return this.http
      .get<ApiResponse<HrAssignmentSummary[]>>(`${environment.apiBaseUrl}/hr/assignments`)
      .pipe(map((response) => response.data));
  }
}
