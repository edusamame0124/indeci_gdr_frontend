import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  GenerarInformeCierreRequest,
  InformeCierreAlerta,
  InformeCierreConsolidado
} from './informe-cierre.models';

@Injectable({ providedIn: 'root' })
export class InformeCierreApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/gdr/informe-cierre`;

  obtenerVistaPrevia(): Observable<InformeCierreConsolidado> {
    return this.http
      .get<ApiResponse<InformeCierreConsolidado>>(`${this.base}/vista-previa`)
      .pipe(map((response) => response.data));
  }

  obtenerAlertaVal06(): Observable<InformeCierreAlerta> {
    return this.http
      .get<ApiResponse<InformeCierreAlerta>>(`${this.base}/alerta-val06`)
      .pipe(map((response) => response.data));
  }

  listarHistorial(): Observable<InformeCierreConsolidado[]> {
    return this.http
      .get<ApiResponse<InformeCierreConsolidado[]>>(`${this.base}/historial`)
      .pipe(map((response) => response.data));
  }

  generar(request: GenerarInformeCierreRequest): Observable<InformeCierreConsolidado> {
    return this.http
      .post<ApiResponse<InformeCierreConsolidado>>(`${this.base}/generar`, request)
      .pipe(map((response) => response.data));
  }

  descargarPdf(informeId: number): Observable<Blob> {
    return this.http.get(`${this.base}/${informeId}/pdf`, { responseType: 'blob' });
  }

  exportarCsv(informeId: number): Observable<Blob> {
    return this.http.get(`${this.base}/${informeId}/exportar-csv`, { responseType: 'blob' });
  }
}
