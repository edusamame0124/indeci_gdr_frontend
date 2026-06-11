import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { AuditEvent, AuditSearchParams, PageResponse } from './audit.models';

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/audit`;

  buscarEventos(params: AuditSearchParams): Observable<PageResponse<AuditEvent>> {
    const query: Record<string, string | number> = {
      page: params.page ?? 0,
      size: params.size ?? 25
    };
    if (params.eventCode) {
      query['eventCode'] = params.eventCode;
    }
    if (params.principal) {
      query['principal'] = params.principal;
    }
    if (params.from) {
      query['from'] = params.from;
    }
    if (params.to) {
      query['to'] = params.to;
    }
    return this.http
      .get<ApiResponse<PageResponse<AuditEvent>>>(`${this.base}/events`, { params: query })
      .pipe(map((response) => response.data));
  }

  exportarCsv(params: AuditSearchParams): Observable<Blob> {
    const query: Record<string, string | number> = {
      page: params.page ?? 0,
      size: params.size ?? 100
    };
    if (params.eventCode) {
      query['eventCode'] = params.eventCode;
    }
    if (params.principal) {
      query['principal'] = params.principal;
    }
    if (params.from) {
      query['from'] = params.from;
    }
    if (params.to) {
      query['to'] = params.to;
    }
    return this.http.get(`${this.base}/events/exportar`, { params: query, responseType: 'blob' });
  }
}
