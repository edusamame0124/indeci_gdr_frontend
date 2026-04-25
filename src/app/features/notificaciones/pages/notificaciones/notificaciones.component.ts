import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificacionDetalle, NotificacionResumen } from '../../../../core/notificaciones/notificaciones.models';
import { NotificacionesService } from '../../../../core/notificaciones/notificaciones.service';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page__header">
        <div>
          <p class="page__eyebrow">Lote 5</p>
          <h1>Notificaciones</h1>
          <p class="page__subtitle">
            Bandeja interna personal del usuario autenticado para eventos operativos del ciclo GDR.
          </p>
        </div>
        <a routerLink="/dashboard" class="page__link">Volver al panel</a>
      </div>

      @if (errorMessage()) {
        <div class="page__state page__state--error">{{ errorMessage() }}</div>
      }

      <div class="summary-strip">
        <div>
          <span>Bandeja</span>
          <strong>{{ bandeja().length }}</strong>
        </div>
        <div>
          <span>Historial</span>
          <strong>{{ historial().length }}</strong>
        </div>
        <div>
          <span>No leidas</span>
          <strong>{{ unreadCount() }}</strong>
        </div>
      </div>

      <section class="layout-grid">
        <article class="panel">
          <header class="panel__header">
            <div>
              <h2>Bandeja principal</h2>
              <p>Notificaciones vigentes del usuario autenticado.</p>
            </div>
            <button type="button" class="secondary-link" (click)="loadData()">Actualizar</button>
          </header>

          @if (bandeja().length) {
            <div class="record-list">
              @for (item of bandeja(); track item.idNotificacion) {
                <button type="button" class="record-card record-card--button" (click)="openDetail(item.idNotificacion)">
                  <div class="record-card__head">
                    <div>
                      <span class="record-card__eyebrow">{{ item.codigoEvento }}</span>
                      <strong>{{ item.tituloNotificacion }}</strong>
                    </div>
                    <span class="status-pill" [class.status-pill--progress]="item.estadoNotificacion === 'NO_LEIDA'">
                      {{ item.estadoNotificacion }}
                    </span>
                  </div>
                  <p>{{ item.mensajeNotificacion }}</p>
                  <div class="record-card__meta">
                    <span>Envio: {{ item.fechaEnvio }}</span>
                    <span>Referencia: {{ item.referenciaNegocio || 'Sin referencia' }}</span>
                  </div>
                </button>
              }
            </div>
          } @else {
            <div class="page__state">No hay notificaciones en la bandeja personal.</div>
          }
        </article>

        <article class="panel">
          <header class="panel__header">
            <div>
              <h2>Detalle</h2>
              <p>Lectura individual y marcado de notificaciones propias.</p>
            </div>
            @if (detalleSeleccionado() && detalleSeleccionado()!.estadoNotificacion === 'NO_LEIDA') {
              <button type="button" class="primary-button" (click)="markSelectedAsRead()">Marcar como leida</button>
            }
          </header>

          @if (detalleSeleccionado()) {
            <article class="detail-card">
              <span class="record-card__eyebrow">{{ detalleSeleccionado()!.codigoEvento }}</span>
              <strong>{{ detalleSeleccionado()!.tituloNotificacion }}</strong>
              <p>{{ detalleSeleccionado()!.mensajeNotificacion }}</p>
              <div class="record-card__meta">
                <span>Estado: {{ detalleSeleccionado()!.estadoNotificacion }}</span>
                <span>Canal: {{ detalleSeleccionado()!.nombreCanal }}</span>
                <span>Plantilla: {{ detalleSeleccionado()!.nombrePlantilla }}</span>
                <span>Envio: {{ detalleSeleccionado()!.fechaEnvio }}</span>
                <span>Lectura: {{ detalleSeleccionado()!.fechaLectura || 'Pendiente' }}</span>
                <span>Referencia: {{ detalleSeleccionado()!.referenciaNegocio || 'Sin referencia' }}</span>
              </div>
            </article>
          } @else {
            <div class="page__state">Seleccione una notificacion para ver el detalle.</div>
          }
        </article>
      </section>

      <section class="panel">
        <header class="panel__header">
          <div>
            <h2>Historial personal</h2>
            <p>Consulta historica del mismo usuario autenticado.</p>
          </div>
        </header>

        @if (historial().length) {
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Titulo</th>
                  <th>Estado</th>
                  <th>Envio</th>
                  <th>Lectura</th>
                  <th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                @for (item of historial(); track item.idNotificacion) {
                  <tr>
                    <td>{{ item.codigoEvento }}</td>
                    <td>{{ item.tituloNotificacion }}</td>
                    <td>{{ item.estadoNotificacion }}</td>
                    <td>{{ item.fechaEnvio }}</td>
                    <td>{{ item.fechaLectura || 'Pendiente' }}</td>
                    <td>{{ item.referenciaNegocio || 'Sin referencia' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="page__state">No hay historial personal de notificaciones.</div>
        }
      </section>
    </section>
  `,
  styles: [`
    .page { padding: 18px 22px 26px; max-width: 1180px; margin: 0 auto; display: grid; gap: 14px; }
    .page__header, .panel__header, .record-card__head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .page__eyebrow { margin: 0 0 6px; font-size: .7rem; font-weight: 700; letter-spacing: .1em; color: #667085; text-transform: uppercase; }
    .page__header h1, .panel__header h2 { margin: 0; color: #1f2937; }
    .page__subtitle, .panel__header p, .record-card p { margin: 6px 0 0; color: #667085; font-size: .82rem; line-height: 1.5; }
    .page__link, .primary-button, .secondary-link { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 14px; border-radius: 10px; text-decoration: none; font-size: .8rem; font-weight: 600; font: inherit; }
    .page__link, .secondary-link { background: rgba(127,23,20,.05); color: #7f1714; border: 1px solid rgba(127,23,20,.12); }
    .primary-button { border: none; background: #7f1714; color: #fff; cursor: pointer; }
    .page__state { border-radius: 12px; padding: 14px 16px; background: rgba(255,255,255,.92); border: 1px solid rgba(15,23,42,.08); color: #526274; font-size: .84rem; }
    .page__state--error { color: #a12622; }
    .summary-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .summary-strip div, .panel { border-radius: 14px; background: rgba(255,255,255,.96); border: 1px solid rgba(15,23,42,.08); box-shadow: 0 10px 24px rgba(15,23,42,.06); }
    .summary-strip div { padding: 10px 12px; display: grid; gap: 3px; }
    .summary-strip span, .record-card__eyebrow { font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; color: #667085; font-weight: 700; }
    .summary-strip strong, .record-card strong, .detail-card strong { color: #1f2937; }
    .layout-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .panel { padding: 16px; display: grid; gap: 12px; }
    .record-list { display: grid; gap: 10px; }
    .record-card { border: 1px solid rgba(15,23,42,.08); border-radius: 12px; background: #fff; padding: 14px; display: grid; gap: 10px; text-align: left; }
    .record-card--button { cursor: pointer; }
    .record-card__meta { display: grid; gap: 4px; color: #667085; font-size: .76rem; }
    .status-pill { display: inline-flex; align-items: center; justify-content: center; min-height: 26px; padding: 0 10px; border-radius: 999px; background: rgba(15,23,42,.04); color: #475467; font-size: .74rem; font-weight: 600; }
    .status-pill--progress { background: #eff6ff; color: #1d4ed8; }
    .detail-card { border: 1px solid rgba(15,23,42,.08); border-radius: 12px; background: #fff; padding: 14px; display: grid; gap: 10px; }
    .table-wrapper { overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid rgba(15,23,42,.08); text-align: left; font-size: .78rem; color: #334155; }
    th { color: #64748b; text-transform: uppercase; letter-spacing: .05em; font-size: .68rem; }
    @media (max-width: 920px) { .summary-strip, .layout-grid { grid-template-columns: 1fr; } }
  `]
})
export class NotificacionesComponent {
  private readonly notificacionesService = inject(NotificacionesService);

  readonly bandeja = signal<NotificacionResumen[]>([]);
  readonly historial = signal<NotificacionResumen[]>([]);
  readonly detalleSeleccionado = signal<NotificacionDetalle | null>(null);
  readonly errorMessage = signal('');

  constructor() {
    this.loadData();
  }

  unreadCount(): number {
    return this.bandeja().filter((item) => item.estadoNotificacion === 'NO_LEIDA').length;
  }

  loadData(): void {
    this.errorMessage.set('');
    this.notificacionesService.listInbox().subscribe({
      next: (data) => this.bandeja.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.notificacionesService.listHistory().subscribe({
      next: (data) => this.historial.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  openDetail(notificationId: number): void {
    this.notificacionesService.getNotification(notificationId).subscribe({
      next: (detail) => this.detalleSeleccionado.set(detail),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  markSelectedAsRead(): void {
    const selected = this.detalleSeleccionado();
    if (!selected) {
      return;
    }
    this.notificacionesService.markAsRead(selected.idNotificacion).subscribe({
      next: (detail) => {
        this.detalleSeleccionado.set(detail);
        this.loadData();
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }
}
