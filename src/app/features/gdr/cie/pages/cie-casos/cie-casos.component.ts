import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ConfirmacionApiService } from '../../../../../core/confirmacion/confirmacion-api.service';
import { CasoCie, CieDecision } from '../../../../../core/confirmacion/confirmacion.models';
import {
  QUALITATIVE_RATING_LABELS,
  QualitativeRatingCode
} from '../../../../../core/final-evaluation/final-evaluation.models';
import { downloadBlob } from '../../../../../shared/utils/download-blob.util';
import { CicloNavService } from '../../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../../shared/ui/cycle-context-bar.component';
import { UiToastService } from '../../../../../shared/ui/ui-toast.service';

const SUSTENTO_MAX = 2000;

interface DecisionForm {
  decision: CieDecision | '';
  calificacionResultado: QualitativeRatingCode | '';
  sustentoCie: string;
}

const FORM_INICIAL: DecisionForm = { decision: '', calificacionResultado: '', sustentoCie: '' };

/**
 * P4 — Bandeja del Comité Institucional de Evaluación (RPE 068-2020 Art. 42).
 * Plazo de convocatoria: 3 días hábiles desde la recepción (alerta, no bloqueo).
 */
@Component({
  selector: 'app-cie-casos',
  standalone: true,
  imports: [DatePipe, RouterLink, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cie-casos.component.html',
  styleUrl: './cie-casos.component.css'
})
export class CieCasosComponent {
  private readonly confirmacionService = inject(ConfirmacionApiService);
  private readonly authService = inject(AuthService);
  readonly cicloNavService = inject(CicloNavService);

  readonly sustentoMax = SUSTENTO_MAX;
  readonly calificaciones = Object.entries(QUALITATIVE_RATING_LABELS)
    .map(([code, label]) => ({ code: code as QualitativeRatingCode, label }));

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly casos = signal<CasoCie[]>([]);
  readonly casoSeleccionado = signal<CasoCie | null>(null);

  readonly form = signal<DecisionForm>({ ...FORM_INICIAL });
  readonly formError = signal<string | null>(null);
  readonly confirmandoDecision = signal(false);
  readonly resolviendo = signal(false);
  readonly descargandoActa = signal(false);
  readonly downloadError = signal<string | null>(null);

  readonly canResolver = computed(() =>
    this.authService.featureAccess()?.canResolverCasosCie ?? false
  );

  readonly pendientes = computed(() =>
    this.casos().filter((c) => c.estado === 'RECIBIDO').length
  );

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.confirmacionService.listarCasos()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.casos.set(items),
        error: (err) => this.error.set(err?.error?.message ?? 'No se pudo cargar la bandeja de casos.')
      });
  }

  seleccionar(caso: CasoCie): void {
    const actual = this.casoSeleccionado();
    this.casoSeleccionado.set(actual?.id === caso.id ? null : caso);
    this.downloadError.set(null);
    this.resetFormulario();
  }

  onFormField(field: keyof DecisionForm, value: string): void {
    this.form.update((f) => ({ ...f, [field]: value }));
    if (this.formError()) {
      this.formError.set(null);
    }
  }

  iniciarDecision(): void {
    const f = this.form();
    if (!f.decision) {
      this.formError.set('Seleccione la decisión del CIE: confirmar o modificar la calificación.');
      return;
    }
    if (f.decision === 'MODIFICA' && !f.calificacionResultado) {
      this.formError.set('La decisión MODIFICA requiere seleccionar la nueva calificación.');
      return;
    }
    if (!f.sustentoCie.trim()) {
      this.formError.set('El sustento de la decisión es obligatorio.');
      return;
    }
    this.formError.set(null);
    this.confirmandoDecision.set(true);
  }

  cancelarDecision(): void {
    this.confirmandoDecision.set(false);
  }

  resolverCaso(): void {
    const caso = this.casoSeleccionado();
    const f = this.form();
    if (!caso || !f.decision) {
      return;
    }
    this.resolviendo.set(true);
    this.formError.set(null);
    this.confirmacionService.resolverCaso(caso.id, {
      decision: f.decision,
      calificacionResultado: f.decision === 'MODIFICA' && f.calificacionResultado ? f.calificacionResultado : null,
      sustentoCie: f.sustentoCie.trim()
    })
      .pipe(finalize(() => {
        this.resolviendo.set(false);
        this.confirmandoDecision.set(false);
      }))
      .subscribe({
        next: (resuelto) => {
          this.casoSeleccionado.set(resuelto);
          this.resetFormulario();
          this.cargar();
          this.casoSeleccionado.set(resuelto);
        },
        error: (err) => this.formError.set(err?.error?.message ?? 'No se pudo registrar la decisión.')
      });
  }

  descargarActa(caso: CasoCie): void {
    this.descargandoActa.set(true);
    this.downloadError.set(null);
    this.confirmacionService.downloadActaCiePdf(caso.id, caso.numeroCaso)
      .pipe(finalize(() => this.descargandoActa.set(false)))
      .subscribe({
        next: ({ blob, fileName }) => downloadBlob(blob, fileName),
        error: (err) => this.downloadError.set(
          err?.error?.message
          ?? 'No se pudo descargar el acta del CIE. Verifique que el caso esté resuelto e intente nuevamente.'
        )
      });
  }

  private resetFormulario(): void {
    this.form.set({ ...FORM_INICIAL });
    this.formError.set(null);
    this.confirmandoDecision.set(false);
  }
}
