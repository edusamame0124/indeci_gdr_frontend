import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {
  FinalEvaluationDetail,
  FinalEvaluationUpsertRequest,
  ResultSummary,
  ScoreDetail
} from '../../../../core/final-evaluation/final-evaluation.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';

/** Estado visual del plazo de solicitud de confirmación (VAL-04). */
interface PlazoEstado {
  tone: 'good' | 'warn' | 'bad';
  label: string;
}

@Component({
  selector: 'app-final-evaluation-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './final-evaluation-detail.component.html',
  styleUrl: './final-evaluation-detail.component.css'
})
export class FinalEvaluationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly canViewConfirmacion = computed(
    () => this.authService.featureAccess()?.canViewConfirmacion ?? false
  );
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

  readonly evaluation = signal<FinalEvaluationDetail | null>(null);
  readonly result = signal<ResultSummary | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly notifying = signal(false);
  readonly errorMessage = signal('');
  readonly canManageFinalEvaluation = computed(
    () => this.authService.featureAccess()?.canManageFinalEvaluations ?? false
  );
  readonly canViewDocuments = computed(
    () => this.authService.featureAccess()?.canViewDocuments ?? false
  );
  readonly canViewImprovements = computed(
    () => this.authService.featureAccess()?.canViewImprovements ?? false
  );

  /** Alineado a canNotifyFinalEvaluationQualificationByEvaluator (evaluador/a titular, no ORH ni consulta). */
  readonly canNotifyQualificationByEmail = computed(() => {
    const access = this.authService.featureAccess();
    const ctx = this.authService.currentContext();
    if (!access?.canManageFinalEvaluations || !ctx) {
      return false;
    }
    if (!ctx.cycleActive || !ctx.hrPersonLinked || ctx.personId == null) {
      return false;
    }
    const actor = ctx.functionalActor;
    if (actor !== 'EVALUADOR' && actor !== 'EVALUADOR_Y_EVALUADO') {
      return false;
    }
    const roles = this.authService.roles();
    const blockedNotifyRoles = [
      'ADMIN',
      'ADMIN_SISTEMA',
      'GDR_ORH',
      'GDR_JUNTA_DIRECTIVOS',
      'GDR_CONSULTA'
    ];
    if (blockedNotifyRoles.some((r) => roles.includes(r))) {
      return false;
    }
    return roles.includes('GDR_USUARIO');
  });

  readonly qualitativeRatingCode = computed(
    () => this.result()?.qualitativeRatingCode ?? this.evaluation()?.qualitativeRatingCode ?? null
  );
  readonly qualitativeRatingLabel = computed(
    () => this.result()?.qualitativeRatingLabel ?? this.evaluation()?.qualitativeRatingLabel ?? null
  );
  readonly segmentName = computed(
    () => this.result()?.segmentName ?? this.evaluation()?.segmentName ?? null
  );

  // ── P3: Retroalimentación final (RPE 068-2020 Art. 33-41) ──────────────

  readonly todayIso = FinalEvaluationDetailComponent.localTodayIso();
  readonly confirmingRetro = signal(false);
  readonly savingRetro = signal(false);
  readonly retroFechaControl = this.fb.nonNullable.control('', [
    Validators.required,
    FinalEvaluationDetailComponent.notFutureValidator(this.todayIso)
  ]);

  /** Semáforo del plazo de confirmación: texto + color, nunca solo color. */
  readonly plazoEstado = computed<PlazoEstado | null>(() => {
    const detail = this.evaluation();
    if (!detail?.fechaReunionRetroFinal || !detail.plazoSolicitudConfirmacion) {
      return null;
    }
    const dias = detail.diasHabilesRestantesConfirmacion ?? 0;
    if (dias <= 0) {
      return { tone: 'bad', label: 'Plazo de confirmación vencido' };
    }
    if (dias === 1) {
      return { tone: 'warn', label: 'Último día hábil para solicitar confirmación' };
    }
    return { tone: 'good', label: `Dentro de plazo — ${dias} días hábiles restantes` };
  });

  /** El usuario en sesión es el evaluado de esta evaluación. */
  readonly isCurrentUserEvaluated = computed(() => {
    const ctx = this.authService.currentContext();
    const detail = this.evaluation();
    return !!ctx && !!detail && ctx.personId != null && ctx.personId === detail.evaluatedId;
  });

  readonly form = this.fb.group({
    assignmentId: [null as number | null, [Validators.required]],
    evaluationComment: [''],
    details: this.fb.array([])
  });

  private evaluatedId = 0;

  constructor() {
    this.evaluatedId = Number(this.route.snapshot.paramMap.get('evaluatedId') || 0);
    this.loadDetail();
  }

  saveEvaluation(): void {
    if (!this.canManageFinalEvaluation()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar o actualizar la evaluacion final.');
      return;
    }
    if (this.form.invalid || !this.evaluation()) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Complete los datos requeridos de la evaluacion final.');
      return;
    }

    const raw = this.form.getRawValue();
    const detailRows = (raw.details ?? []) as Array<{
      goalId: number | string | null;
      achievedValue: number | string | null;
      detailComment: string | null;
    }>;

    const payload: FinalEvaluationUpsertRequest = {
      assignmentId: raw.assignmentId as number,
      evaluationComment: (raw.evaluationComment ?? '').trim() || null,
      details: detailRows.map((detail) => ({
        goalId: Number(detail.goalId),
        achievedValue: Number(detail.achievedValue),
        detailComment: (detail.detailComment ?? '').trim() || null
      }))
    };

    this.saving.set(true);
    this.errorMessage.set('');

    const current = this.evaluation();
    const cycleId = this.cicloNavService.cicloId()!;
    const request$ = current?.evaluationId
      ? this.finalEvaluationService.updateFinalEvaluation(current.evaluationId, cycleId, payload)
      : this.finalEvaluationService.createFinalEvaluation(cycleId, payload);

    request$.subscribe({
      next: (detail) => {
        this.evaluation.set(detail);
        this.patchForm(detail);
        this.loadResult(detail.evaluatedId);
        this.saving.set(false);
        this.toastService.success(
          current?.evaluationId ? 'Actualizacion exitosa' : 'Registro exitoso',
          current?.evaluationId
            ? 'La evaluacion final fue actualizada correctamente.'
            : 'La evaluacion final fue registrada correctamente.'
        );
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.saving.set(false);
      }
    });
  }

  // ── P3: registro de reunión de retroalimentación final ─────────────────

  /** Paso 1 — valida la fecha y muestra la confirmación explícita. */
  startRetroConfirmation(): void {
    if (this.retroFechaControl.invalid) {
      this.retroFechaControl.markAsTouched();
      return;
    }
    this.confirmingRetro.set(true);
  }

  cancelRetroConfirmation(): void {
    this.confirmingRetro.set(false);
  }

  /** Paso 2 — confirma y persiste; el backend calcula el plazo (+5 días hábiles). */
  confirmRetroRegistration(): void {
    const evaluationId = this.evaluation()?.evaluationId;
    const fecha = this.retroFechaControl.value;
    if (!evaluationId || !fecha) {
      return;
    }
    this.savingRetro.set(true);
    this.finalEvaluationService
      .registrarRetroalimentacionFinal(evaluationId, this.cicloNavService.cicloId()!, { fechaReunionRetroFinal: fecha })
      .subscribe({
        next: (detail) => {
          this.evaluation.set(detail);
          this.patchForm(detail);
          this.savingRetro.set(false);
          this.confirmingRetro.set(false);
          this.toastService.success(
            'Reunión registrada',
            `Se activó el plazo de confirmación hasta el ${this.formatIsoDate(detail.plazoSolicitudConfirmacion)}.`
          );
        },
        error: (error: Error) => {
          this.savingRetro.set(false);
          this.confirmingRetro.set(false);
          this.toastService.error(
            'No se pudo registrar la reunión',
            error.message?.trim() || 'Intente nuevamente o contacte al administrador si el problema continúa.'
          );
        }
      });
  }

  notifyQualificationByEmail(): void {
    const detail = this.evaluation();
    const evaluationId = detail?.evaluationId;
    if (!this.canNotifyQualificationByEmail() || evaluationId == null) {
      return;
    }
    if (!this.qualitativeRatingCode()) {
      this.toastService.error(
        'Calificación pendiente',
        'Registre la calificación cualitativa consolidada antes de enviar la notificación por correo.'
      );
      return;
    }
    this.notifying.set(true);
    this.finalEvaluationService.notifyQualificationByEmail(evaluationId).subscribe({
      next: () => {
        this.notifying.set(false);
        this.toastService.success(
          'Correo enviado',
          'Se envió la notificación de calificación al correo institucional del evaluado.'
        );
      },
      error: (error: Error) => {
        this.notifying.set(false);
        const raw = error.message?.trim() || 'No fue posible completar el envío.';
        const { title, detail: msg } = this.classifyNotifyFailureMessage(raw);
        this.toastService.error(title, msg);
      }
    });
  }

  private classifyNotifyFailureMessage(raw: string): { title: string; detail: string } {
    const lower = raw.toLowerCase();
    if (/\bplazo\b|h[aá]bil|d[ií]as h[aá]biles|cronograma|\bventana\b/.test(lower)) {
      return { title: 'Plazo de notificación', detail: raw };
    }
    if (
      /correo electr[oó]nico|correo del|destinatario|email|buz[oó]n/.test(lower) &&
      (/no hay|v[aá]lid|actualice|institucional|vinculado/i.test(raw) || /obligatorio/i.test(lower))
    ) {
      return { title: 'Correo del evaluado', detail: raw };
    }
    if (
      /no fue posible enviar|remitente configurado|smtp|servidor de correo|mail server|timed out|connection refused/i.test(
        raw
      )
    ) {
      return { title: 'Envío de correo (SMTP)', detail: raw };
    }
    if (/calificaci[oó]n cualitativa/.test(lower)) {
      return { title: 'Calificación requerida', detail: raw };
    }
    if (raw.includes('403') || /permiso/i.test(raw)) {
      return { title: 'Sin permiso para notificar', detail: raw };
    }
    return { title: 'No se pudo notificar', detail: raw };
  }

  private get detailsArray(): FormArray {
    return this.form.get('details') as FormArray;
  }

  private loadDetail(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.finalEvaluationService.getFinalEvaluation(this.evaluatedId, this.cicloNavService.cicloId()!).subscribe({
      next: (detail) => {
        this.evaluation.set(detail);
        this.patchForm(detail);
        this.loadResult(detail.evaluatedId);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  private loadResult(evaluatedId: number): void {
    this.finalEvaluationService.getResult(evaluatedId).subscribe({
      next: (result) => this.result.set(result),
      error: () => this.result.set(null)
    });
  }

  private patchForm(detail: FinalEvaluationDetail): void {
    this.form.patchValue({
      assignmentId: detail.assignmentId,
      evaluationComment: detail.evaluationComment ?? ''
    });
    this.retroFechaControl.setValue(detail.fechaReunionRetroFinal ?? '');

    while (this.detailsArray.length) {
      this.detailsArray.removeAt(0);
    }

    detail.details.forEach((scoreDetail) => {
      this.detailsArray.push(this.buildDetailGroup(scoreDetail));
    });
  }

  private buildDetailGroup(detail: ScoreDetail) {
    return this.fb.group({
      goalId: [detail.goalId, [Validators.required]],
      achievedValue: [detail.achievedValue, [Validators.required, Validators.min(0.0001)]],
      detailComment: [detail.detailComment ?? '']
    });
  }

  private formatIsoDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  }

  /** Fecha local de hoy en formato ISO (yyyy-MM-dd), sin desfase de zona horaria. */
  private static localTodayIso(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  /** La fecha de reunión no puede ser futura (comparación de cadenas ISO). */
  private static notFutureValidator(todayIso: string) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as string | null;
      return value && value > todayIso ? { futureDate: true } : null;
    };
  }
}
