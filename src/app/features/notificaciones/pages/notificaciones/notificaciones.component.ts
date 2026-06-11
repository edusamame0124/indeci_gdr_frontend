import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificacionDetalle, NotificacionResumen } from '../../../../core/notificaciones/notificaciones.models';
import { NotificacionesService } from '../../../../core/notificaciones/notificaciones.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [RouterLink, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notificaciones.component.html',
  styleUrl: './notificaciones.component.css'
})
export class NotificacionesComponent {
  private readonly notificacionesService = inject(NotificacionesService);
  readonly cicloNavService = inject(CicloNavService);

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
