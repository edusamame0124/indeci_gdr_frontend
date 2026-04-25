import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { NotificacionDetalle, NotificacionResumen } from './notificaciones.models';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);

  listInbox(): Observable<NotificacionResumen[]> {
    return this.http
      .get<ApiResponse<NotificacionResumen[]>>(`${environment.apiBaseUrl}/notificaciones`)
      .pipe(map((response) => response.data));
  }

  listHistory(): Observable<NotificacionResumen[]> {
    return this.http
      .get<ApiResponse<NotificacionResumen[]>>(`${environment.apiBaseUrl}/notificaciones/historial`)
      .pipe(map((response) => response.data));
  }

  getNotification(notificationId: number): Observable<NotificacionDetalle> {
    return this.http
      .get<ApiResponse<NotificacionDetalle>>(`${environment.apiBaseUrl}/notificaciones/${notificationId}`)
      .pipe(map((response) => response.data));
  }

  markAsRead(notificationId: number): Observable<NotificacionDetalle> {
    return this.http
      .post<ApiResponse<NotificacionDetalle>>(`${environment.apiBaseUrl}/notificaciones/${notificationId}/marcar-leida`, {})
      .pipe(map((response) => response.data));
  }
}
