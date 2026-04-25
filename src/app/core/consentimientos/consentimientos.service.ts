import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  ConsentimientoHistorial,
  ConsentimientoResumen,
  ConsentimientoTipo,
  RegistrarAceptacionConsentimientoPayload
} from './consentimientos.models';

@Injectable({ providedIn: 'root' })
export class ConsentimientosService {
  private readonly http = inject(HttpClient);

  listTipos(): Observable<ConsentimientoTipo[]> {
    return this.http
      .get<ApiResponse<ConsentimientoTipo[]>>(`${environment.apiBaseUrl}/consentimientos/tipos`)
      .pipe(map((response) => response.data));
  }

  listPropios(): Observable<ConsentimientoResumen[]> {
    return this.http
      .get<ApiResponse<ConsentimientoResumen[]>>(`${environment.apiBaseUrl}/consentimientos`)
      .pipe(map((response) => response.data));
  }

  listHistorial(): Observable<ConsentimientoHistorial[]> {
    return this.http
      .get<ApiResponse<ConsentimientoHistorial[]>>(`${environment.apiBaseUrl}/consentimientos/historial`)
      .pipe(map((response) => response.data));
  }

  aceptar(payload: RegistrarAceptacionConsentimientoPayload): Observable<ConsentimientoHistorial> {
    return this.http
      .post<ApiResponse<ConsentimientoHistorial>>(`${environment.apiBaseUrl}/consentimientos/aceptaciones`, payload)
      .pipe(map((response) => response.data));
  }
}
