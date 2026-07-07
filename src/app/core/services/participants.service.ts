import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { ParticipantListItemResponse, CreateParticipantRoleRequest } from '../models/participants.models';

@Injectable({
  providedIn: 'root'
})
export class ParticipantsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/admin/participants`;

  listParticipants(cycleId: number): Observable<ParticipantListItemResponse[]> {
    const params = new HttpParams().set('cycleId', cycleId.toString());
    return this.http.get<ApiResponse<ParticipantListItemResponse[]>>(this.apiUrl, { params }).pipe(
      map(response => response.data)
    );
  }

  assignRole(request: CreateParticipantRoleRequest): Observable<ParticipantListItemResponse> {
    return this.http.post<ApiResponse<ParticipantListItemResponse>>(`${this.apiUrl}/role`, request).pipe(
      map(response => response.data)
    );
  }
}
