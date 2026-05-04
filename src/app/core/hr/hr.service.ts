import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { HrAssignmentSummary } from './hr.models';

const LIST_ASSIGNMENTS_HEADERS = new HttpHeaders({
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache'
});

@Injectable({ providedIn: 'root' })
export class HrService {
  private readonly http = inject(HttpClient);

  listAssignments(): Observable<HrAssignmentSummary[]> {
    return this.http
      .get<ApiResponse<HrAssignmentSummary[]>>(`${environment.apiBaseUrl}/hr/assignments`, {
        headers: LIST_ASSIGNMENTS_HEADERS
      })
      .pipe(map((response) => response.data));
  }
}
