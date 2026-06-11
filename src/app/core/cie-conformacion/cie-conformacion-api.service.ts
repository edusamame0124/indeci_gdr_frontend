import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { CieConformacion, RegistrarCieConformacionRequest } from './cie-conformacion.models';

@Injectable({ providedIn: 'root' })
export class CieConformacionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listar(): Observable<CieConformacion[]> {
    return this.http
      .get<ApiResponse<CieConformacion[]>>(`${this.base}/gdr/cie/conformacion`)
      .pipe(map(r => r.data));
  }

  obtener(id: number): Observable<CieConformacion> {
    return this.http
      .get<ApiResponse<CieConformacion>>(`${this.base}/gdr/cie/conformacion/${id}`)
      .pipe(map(r => r.data));
  }

  registrar(request: RegistrarCieConformacionRequest): Observable<CieConformacion> {
    return this.http
      .post<ApiResponse<CieConformacion>>(`${this.base}/gdr/cie/conformacion`, request)
      .pipe(map(r => r.data));
  }

  anular(id: number): Observable<CieConformacion> {
    return this.http
      .post<ApiResponse<CieConformacion>>(`${this.base}/gdr/cie/conformacion/${id}/anular`, {})
      .pipe(map(r => r.data));
  }
}
