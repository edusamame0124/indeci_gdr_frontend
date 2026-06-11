import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { GdrSeguimientoRequest, ResumenSeguimientoResponse } from '../../../../core/admin/cycles.models';
import { GdrSeguimientoApiService } from '../../../../core/admin/gdr-seguimiento-api.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

interface NuevaReunionForm {
  tipoReunion: string;
  fechaReunion: string;
  descripcionAvance: string;
  compromisos: string;
}

@Component({
  selector: 'app-seguimiento-gdr',
  standalone: true,
  imports: [DatePipe, RouterLink, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seguimiento-gdr.component.html',
  styleUrl: './seguimiento-gdr.component.css'
})
export class SeguimientoGdrComponent {
  private readonly seguimientoService = inject(GdrSeguimientoApiService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<ResumenSeguimientoResponse | null>(null);
  readonly guardando = signal(false);
  readonly confirmando = signal<number | null>(null);
  readonly formError = signal<string | null>(null);

  readonly canRegistrar = computed(() =>
    this.authService.featureAccess()?.canRegistrarSeguimiento ?? false
  );

  readonly form = signal<NuevaReunionForm>({
    tipoReunion: 'SEGUIMIENTO_PERIODICO',
    fechaReunion: '',
    descripcionAvance: '',
    compromisos: '',
  });

  readonly assignmentId = signal<number | null>(null);

  readonly hoy = computed(() => new Date().toISOString().split('T')[0]);

  constructor() {
    const id = Number(this.route.snapshot.queryParamMap.get('assignmentId'));
    if (id) {
      this.assignmentId.set(id);
      this.cargar();
    } else {
      this.loading.set(false);
      this.error.set('Falta el parámetro assignmentId en la URL.');
    }
  }

  cargar(): void {
    const id = this.assignmentId();
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.seguimientoService.getResumen(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.resumen.set(data),
        error: (err) => this.error.set(err?.error?.message ?? 'Error al cargar el seguimiento.')
      });
  }

  onFormField(field: keyof NuevaReunionForm, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  registrar(event: Event): void {
    event.preventDefault();
    const f = this.form();
    if (!f.fechaReunion) {
      this.formError.set('La fecha de reunión es obligatoria.');
      return;
    }
    const id = this.assignmentId();
    if (!id) return;

    this.guardando.set(true);
    this.formError.set(null);

    const req: GdrSeguimientoRequest = {
      assignmentId: id,
      tipoReunion: f.tipoReunion,
      fechaReunion: f.fechaReunion,
      descripcionAvance: f.descripcionAvance || undefined,
      compromisos: f.compromisos || undefined,
    };

    this.seguimientoService.registrar(req)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.form.set({ tipoReunion: 'SEGUIMIENTO_PERIODICO', fechaReunion: '', descripcionAvance: '', compromisos: '' });
          this.cargar();
          this.toastService.success('Reunión registrada', 'El seguimiento periódico quedó registrado correctamente.');
        },
        error: (err) => this.toastService.error(
          'Error al registrar',
          err?.error?.message ?? 'No se pudo registrar la reunión de seguimiento.'
        )
      });
  }

  confirmar(id: number): void {
    this.confirmando.set(id);
    this.seguimientoService.registrarConsentimiento(id)
      .pipe(finalize(() => this.confirmando.set(null)))
      .subscribe({
        next: () => {
          this.cargar();
          this.toastService.success('Confirmado', 'La reunión de seguimiento fue confirmada.');
        },
        error: (err) => this.toastService.error(
          'Error al confirmar',
          err?.error?.message ?? 'No se pudo confirmar la reunión.'
        )
      });
  }
}
