import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ConfirmacionApiService } from '../../../../../core/confirmacion/confirmacion-api.service';
import { SolicitudConfirmacion } from '../../../../../core/confirmacion/confirmacion.models';
import { FinalEvaluationService } from '../../../../../core/final-evaluation/final-evaluation.service';
import { FinalEvaluationDetail } from '../../../../../core/final-evaluation/final-evaluation.models';
import { CicloNavService } from '../../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../../shared/ui/cycle-context-bar.component';

type PlazoEstado = 'sin-plazo' | 'vigente' | 'ultimo-dia' | 'vencido';

const SUSTENTO_MAX = 2000;

/**
 * P4 — Confirmación de calificación (RPE 068-2020 Art. 41).
 * Vista evaluado: presenta la solicitud dentro del plazo de 5 días hábiles.
 * Vista ORH/CIE/Admin: listado de solicitudes del ciclo activo.
 */
@Component({
  selector: 'app-confirmacion-gdr',
  standalone: true,
  imports: [DatePipe, RouterLink, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmacion-gdr.component.html',
  styleUrl: './confirmacion-gdr.component.css'
})
export class ConfirmacionGdrComponent {
  private readonly confirmacionService = inject(ConfirmacionApiService);
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly authService = inject(AuthService);
  readonly cicloNavService = inject(CicloNavService);

  readonly sustentoMax = SUSTENTO_MAX;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<FinalEvaluationDetail | null>(null);
  readonly solicitud = signal<SolicitudConfirmacion | null>(null);
  readonly solicitudes = signal<SolicitudConfirmacion[]>([]);

  readonly sustento = signal('');
  readonly formError = signal<string | null>(null);
  readonly confirmandoEnvio = signal(false);
  readonly enviando = signal(false);

  /** El evaluado opera su propia solicitud; otros perfiles supervisan el listado. */
  readonly modoEvaluado = computed(() => {
    const actor = this.authService.currentContext()?.functionalActor;
    return actor === 'EVALUADO' || actor === 'EVALUADOR_Y_EVALUADO';
  });

  readonly plazoEstado = computed<PlazoEstado>(() => {
    const d = this.detail();
    if (!d?.plazoSolicitudConfirmacion) {
      return 'sin-plazo';
    }
    const restantes = d.diasHabilesRestantesConfirmacion ?? 0;
    if (restantes <= 0) {
      return 'vencido';
    }
    return restantes === 1 ? 'ultimo-dia' : 'vigente';
  });

  readonly puedeSolicitar = computed(() =>
    this.modoEvaluado()
    && !this.solicitud()
    && this.detail()?.evaluationId != null
    && (this.plazoEstado() === 'vigente' || this.plazoEstado() === 'ultimo-dia')
  );

  constructor() {
    if (this.modoEvaluado()) {
      this.cargarVistaEvaluado();
    } else {
      this.cargarListado();
    }
  }

  cargarVistaEvaluado(): void {
    const personId = this.authService.currentContext()?.personId;
    if (!personId) {
      this.loading.set(false);
      this.error.set('Su usuario no tiene identidad laboral vinculada.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.finalEvaluationService.getFinalEvaluation(personId, this.cicloNavService.cicloId()!).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.cargarSolicitud(detail);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo cargar su evaluación final.');
      }
    });
  }

  cargarListado(): void {
    this.loading.set(true);
    this.error.set(null);
    this.confirmacionService.listarSolicitudes()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.solicitudes.set(items),
        error: (err) => this.error.set(err?.error?.message ?? 'No se pudieron cargar las solicitudes.')
      });
  }

  iniciarConfirmacion(): void {
    const texto = this.sustento().trim();
    if (!texto) {
      this.formError.set('El sustento de la solicitud es obligatorio.');
      return;
    }
    if (texto.length > SUSTENTO_MAX) {
      this.formError.set(`El sustento no puede superar los ${SUSTENTO_MAX} caracteres.`);
      return;
    }
    this.formError.set(null);
    this.confirmandoEnvio.set(true);
  }

  cancelarConfirmacion(): void {
    this.confirmandoEnvio.set(false);
  }

  enviarSolicitud(): void {
    const evaluationId = this.detail()?.evaluationId;
    if (!evaluationId) {
      return;
    }
    this.enviando.set(true);
    this.formError.set(null);
    this.confirmacionService
      .solicitar({ finalEvaluationId: evaluationId, sustento: this.sustento().trim() })
      .pipe(finalize(() => {
        this.enviando.set(false);
        this.confirmandoEnvio.set(false);
      }))
      .subscribe({
        next: (solicitud) => {
          this.solicitud.set(solicitud);
          this.sustento.set('');
        },
        error: (err) => this.formError.set(err?.error?.message ?? 'No se pudo registrar la solicitud.')
      });
  }

  onSustento(value: string): void {
    this.sustento.set(value);
    if (this.formError()) {
      this.formError.set(null);
    }
  }

  private cargarSolicitud(detail: FinalEvaluationDetail): void {
    if (!detail.evaluationId) {
      this.loading.set(false);
      return;
    }
    this.confirmacionService.getByEvaluacion(detail.evaluationId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (solicitud) => this.solicitud.set(solicitud),
        error: (err) => this.error.set(err?.error?.message ?? 'No se pudo consultar su solicitud.')
      });
  }
}
