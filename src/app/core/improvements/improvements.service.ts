import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  OportunidadMejoraDetalle,
  OportunidadMejoraResumen,
  RegistrarOportunidadMejoraPayload,
  RegistrarSeguimientoMejoraPayload
} from './improvements.models';

@Injectable({ providedIn: 'root' })
export class ImprovementsService {
  private readonly http = inject(HttpClient);

  listImprovements(evaluatedId: number): Observable<OportunidadMejoraResumen[]> {
    return this.http
      .get<ApiResponse<OportunidadMejoraResumen[]>>(`${environment.apiBaseUrl}/oportunidades-mejora`, {
        params: { evaluatedId }
      })
      .pipe(map((response) => response.data));
  }

  createImprovement(payload: RegistrarOportunidadMejoraPayload): Observable<OportunidadMejoraDetalle> {
    return this.http
      .post<ApiResponse<OportunidadMejoraDetalle>>(`${environment.apiBaseUrl}/oportunidades-mejora`, payload)
      .pipe(map((response) => response.data));
  }

  getImprovement(opportunityId: number): Observable<OportunidadMejoraDetalle> {
    return this.http
      .get<ApiResponse<OportunidadMejoraDetalle>>(`${environment.apiBaseUrl}/oportunidades-mejora/${opportunityId}`)
      .pipe(map((response) => response.data));
  }

  updateImprovement(opportunityId: number, payload: RegistrarOportunidadMejoraPayload): Observable<OportunidadMejoraDetalle> {
    return this.http
      .put<ApiResponse<OportunidadMejoraDetalle>>(`${environment.apiBaseUrl}/oportunidades-mejora/${opportunityId}`, payload)
      .pipe(map((response) => response.data));
  }

  registerFollowup(opportunityId: number, payload: RegistrarSeguimientoMejoraPayload): Observable<OportunidadMejoraDetalle> {
    return this.http
      .post<ApiResponse<OportunidadMejoraDetalle>>(
        `${environment.apiBaseUrl}/oportunidades-mejora/${opportunityId}/seguimiento`,
        payload
      )
      .pipe(map((response) => response.data));
  }
}
