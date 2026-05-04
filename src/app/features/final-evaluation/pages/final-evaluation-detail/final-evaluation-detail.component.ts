import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FinalEvaluationDetail,
  FinalEvaluationUpsertRequest,
  ResultSummary,
  ScoreDetail
} from '../../../../core/final-evaluation/final-evaluation.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-final-evaluation-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Navegación">
        <a routerLink="/dashboard" class="breadcrumb__link">Inicio</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <a routerLink="/dashboard/evaluacion-final" class="breadcrumb__link">Evaluacion Final</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <span class="breadcrumb__current">Detalle</span>
      </nav>

      <!-- Page header -->
      <div class="page__header">
        <div class="page__header-left">
          <h1>Detalle por evaluado</h1>
          <p class="page__subtitle">
            Base minima y segura para registrar puntaje por meta y consolidar el resultado del evaluado.
          </p>
        </div>
        <div class="page__actions">
          <a routerLink="/dashboard/evaluacion-final" class="btn btn--outline-neutral btn--sm">
            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.5 4.5 4 10l5.5 5.5 1.1-1.1-3.6-3.6H16v-1.6H7l3.6-3.6-1.1-1.1Z"/>
            </svg>
            Volver al listado
          </a>
        </div>
      </div>

      @if (errorMessage()) {
        <div class="alert alert--error" role="alert">
          <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      @if (loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>Cargando evaluacion final...</span>
        </div>
      } @else if (evaluation()) {
        <!-- Context bar -->
        <div class="context-bar">
          <div class="context-bar__item">
            <span class="context-bar__label">Evaluado</span>
            <span class="context-bar__value">{{ evaluation()!.evaluatedName }}</span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item">
            <span class="context-bar__label">Evaluador</span>
            <span class="context-bar__value">{{ evaluation()!.evaluatorName }}</span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item">
            <span class="context-bar__label">Ciclo</span>
            <span class="context-bar__value">{{ evaluation()!.cycleName }}</span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item">
            <span class="context-bar__label">Estado</span>
            <span class="context-bar__value">
              <span class="status-badge">
                <span class="status-badge__dot"></span>
                {{ evaluation()!.status }}
              </span>
            </span>
          </div>
        </div>

        <section class="layout-grid">
          <article class="panel panel--compact">
            <header class="panel__header">
              <div class="panel__header-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm3.7 6.3-4.2 4.2a.8.8 0 0 1-1.1 0L6.3 10.4l1.1-1.1 1.5 1.5 3.7-3.7 1.1 1.2Z"/>
                </svg>
              </div>
              <div>
                <h2 class="panel__title">Resultado consolidado</h2>
                <p class="panel__desc">Valor consolidado por evaluado calculado en backend.</p>
              </div>
            </header>

            <div class="result-box">
              <span class="result-box__label">Resultado</span>
              <small>#{{ result()?.resultId ?? 'Sin consolidar' }}</small>
              <span class="result-box__label">Puntaje actual</span>
              <strong>{{ result()?.consolidatedScore ?? evaluation()!.consolidatedScore ?? 'Pendiente' }}</strong>
              <span class="result-box__label">Calificación SERVIR</span>
              @if (qualitativeRatingCode(); as code) {
                <span
                  class="rating-badge"
                  [class.rating-badge--good]="code === 'BUEN_RENDIMIENTO' || code === 'DISTINGUIDO'"
                  [class.rating-badge--warn]="code === 'SUJETO_OBSERVACION'"
                  [class.rating-badge--bad]="code === 'DESAPROBADO'"
                  [class.rating-badge--neutral]="code === 'NO_CALIFICABLE'"
                >{{ qualitativeRatingLabel() }}</span>
              } @else {
                <span class="rating-badge rating-badge--pending">Pendiente</span>
              }
              <span class="result-box__label">Segmento del evaluado</span>
              <small>{{ segmentName() ?? 'Sin segmento' }}</small>
              <p class="rating-hint">
                Umbral SERVIR: ≥ 70 para segmento Directivo, ≥ 60 para los demás.
              </p>
            </div>

            <div class="result-actions">
              @if (canViewDocuments()) {
                <a
                  routerLink="/dashboard/documentos"
                  [queryParams]="{ evaluatedId: evaluation()!.evaluatedId }"
                  class="btn btn--outline btn--sm btn--full"
                >
                  Gestionar documentos
                </a>
              }
              @if (canViewImprovements()) {
                <a
                  routerLink="/dashboard/oportunidades-mejora"
                  [queryParams]="{ evaluatedId: evaluation()!.evaluatedId }"
                  class="btn btn--outline btn--sm btn--full"
                >
                  Gestionar oportunidades
                </a>
              }
            </div>
          </article>

          <article class="panel">
            <header class="panel__header">
              <div class="panel__header-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4.7 10.8h10.6v-1.6H4.7v1.6Zm0-4h10.6V5.2H4.7v1.6Zm0 8h7.2v-1.6H4.7v1.6Z"/>
                </svg>
              </div>
              <div>
                <h2 class="panel__title">Registro de evaluacion</h2>
                <p class="panel__desc">Complete el valor alcanzado por meta y guarde desde esta misma pantalla.</p>
              </div>
            </header>

            <form [formGroup]="form" (ngSubmit)="saveEvaluation()" class="form-grid">
              <label class="field field--full">
                <span class="field__label">Comentario general</span>
                <textarea
                  rows="3"
                  formControlName="evaluationComment"
                  placeholder="Comentario general de evaluacion"
                  [readonly]="!canManageFinalEvaluation()"
                ></textarea>
              </label>

              <div formArrayName="details" class="score-list">
                @for (detail of evaluation()!.details; track detail.goalId; let i = $index) {
                  <section class="score-card" [formGroupName]="i">
                    <div class="score-card__head">
                      <div>
                        <span class="score-card__eyebrow">Meta</span>
                        <strong>{{ detail.goalTitle }}</strong>
                      </div>
                      <span class="status-badge status-badge--muted">
                        <span class="status-badge__dot"></span>
                        {{ detail.indicatorName }}
                      </span>
                    </div>

                    <div class="score-card__meta">
                      <div>
                        <span>Esperado</span>
                        <strong>{{ detail.expectedValue }}</strong>
                      </div>
                      <div>
                        <span>Peso</span>
                        <strong>{{ detail.weight }}%</strong>
                      </div>
                    </div>

                    <div class="score-card__form">
                      <label class="field field--readonly">
                        <span class="field__label">Valor alcanzado</span>
                        <input
                          type="number"
                          step="0.0001"
                          formControlName="achievedValue"
                          readonly
                          aria-readonly="true"
                          tabindex="-1"
                        />
                        <small>Se trae de la calificacion previa de la meta.</small>
                      </label>

                      <label class="field field--readonly">
                        <span class="field__label">Puntaje</span>
                        <input
                          type="text"
                          [value]="detail.scoreValue ?? 'Pendiente'"
                          readonly
                          aria-readonly="true"
                          tabindex="-1"
                        />
                        <small>Calculado por el sistema al calificar la meta.</small>
                      </label>

                      <label class="field field--full">
                        <span class="field__label">Detalle</span>
                        <textarea
                          rows="3"
                          formControlName="detailComment"
                          placeholder="Observacion breve para esta meta"
                          [readonly]="!canManageFinalEvaluation()"
                        ></textarea>
                      </label>
                    </div>
                  </section>
                }
              </div>

              @if (canManageFinalEvaluation()) {
                <div class="form-actions">
                  <button type="submit" class="btn btn--primary" [disabled]="saving()">
                    @if (saving()) {
                      <span class="loading-spinner loading-spinner--sm"></span>
                    }
                    {{ evaluation()!.evaluationId ? 'Actualizar evaluacion' : 'Registrar evaluacion' }}
                  </button>
                </div>
              } @else {
                <div class="info-state">
                  <svg class="info-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                  </svg>
                  <span>Su perfil puede consultar esta evaluacion, pero no registrar ni actualizar el consolidado.</span>
                </div>
              }
            </form>
          </article>
        </section>
      }
    </section>
  `,
  styles: [`
    :host { display:block; min-width:0; }

    /* ── Page layout ── */
    .page { padding:20px 24px 28px; max-width:1120px; margin:0 auto; min-width:0; overflow-x:clip; }

    /* ── Breadcrumb ── */
    .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:16px; font-size:0.75rem; flex-wrap:wrap; }
    .breadcrumb__link { color:#7f1714; text-decoration:none; font-weight:500; }
    .breadcrumb__link:hover { text-decoration:underline; }
    .breadcrumb__sep { color:#b0b8c4; }
    .breadcrumb__current { color:#667085; font-weight:500; }

    /* ── Page header ── */
    .page__header { display:flex; justify-content:space-between; gap:16px; align-items:center; margin-bottom:20px; flex-wrap:wrap; min-width:0; }
    .page__header-left { min-width:0; }
    .page__header h1 { margin:0; color:#1a1a2e; font-size:1.35rem; font-weight:700; line-height:1.2; letter-spacing:-0.01em; }
    .page__subtitle { margin:4px 0 0; color:#667085; font-size:0.82rem; line-height:1.5; max-width:760px; }
    .page__actions { display:flex; gap:8px; flex-wrap:wrap; }

    /* ── Alert ── */
    .alert { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; margin-bottom:16px; font-size:0.82rem; }
    .alert--error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
    .alert__icon { width:18px; height:18px; fill:currentColor; flex:0 0 auto; }

    /* ── Buttons ── */
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:36px; padding:0 16px; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.15s ease; text-decoration:none; border:none; white-space:nowrap; }
    .btn__icon { width:15px; height:15px; fill:currentColor; flex:0 0 auto; }
    .btn--sm { min-height:32px; padding:0 12px; font-size:0.78rem; }
    .btn--full { width:100%; }
    .btn--primary { background:#7f1714; color:#fff; box-shadow:0 1px 3px rgba(127,23,20,0.2); }
    .btn--primary:hover { background:#951c18; box-shadow:0 2px 6px rgba(127,23,20,0.25); }
    .btn--primary:disabled { opacity:0.6; cursor:not-allowed; box-shadow:none; }
    .btn--outline { background:#fff; color:#7f1714; border:1px solid rgba(127,23,20,0.2); }
    .btn--outline:hover { background:rgba(127,23,20,0.04); border-color:rgba(127,23,20,0.3); }
    .btn--outline-neutral { background:#fff; color:#475467; border:1px solid #d0d5dd; }
    .btn--outline-neutral:hover { background:#f9fafb; border-color:#98a2b3; }

    /* ── Context bar ── */
    .context-bar { display:flex; align-items:stretch; gap:0; margin-bottom:16px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
    .context-bar__item { flex:1; padding:14px 18px; display:flex; flex-direction:column; gap:4px; min-width:0; }
    .context-bar__divider { width:1px; background:#e5e7eb; flex:0 0 1px; }
    .context-bar__label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:600; }
    .context-bar__value { color:#1a1a2e; font-size:0.84rem; font-weight:600; line-height:1.4; overflow-wrap:anywhere; word-break:break-word; }

    /* ── Status badge ── */
    .status-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:999px; font-size:0.74rem; font-weight:600; line-height:1; background:#f0f1f3; color:#475467; }
    .status-badge__dot { width:7px; height:7px; border-radius:50%; background:currentColor; flex:0 0 auto; }
    .status-badge--muted { background:#f8fafc; color:#667085; }

    .rating-badge { display:inline-flex; align-items:center; padding:4px 12px; border-radius:999px; font-size:0.78rem; font-weight:700; line-height:1.2; background:#f0f1f3; color:#475467; width:fit-content; }
    .rating-badge--good { background:#dcfce7; color:#15803d; }
    .rating-badge--warn { background:#fef3c7; color:#a16207; }
    .rating-badge--bad { background:#fee2e2; color:#b91c1c; }
    .rating-badge--neutral { background:#e0e7ff; color:#4338ca; }
    .rating-badge--pending { background:#f1f5f9; color:#94a3b8; font-style:italic; }
    .rating-hint { margin:8px 0 0; font-size:0.72rem; color:#64748b; line-height:1.45; }

    /* ── Loading ── */
    .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 16px; color:#667085; font-size:0.84rem; }
    .loading-spinner { width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#7f1714; border-radius:50%; animation:spin 0.7s linear infinite; }
    .loading-spinner--sm { width:14px; height:14px; border-width:2px; border-color:rgba(255,255,255,0.3); border-top-color:#fff; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Layout grid ── */
    .layout-grid { display:grid; grid-template-columns:minmax(250px, 300px) minmax(0, 1fr); gap:14px; align-items:start; }

    /* ── Panel ── */
    .panel { border-radius:12px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,0.04); padding:16px; display:grid; gap:14px; }
    .panel--compact { position:sticky; top:18px; }
    .panel__header { display:flex; align-items:flex-start; gap:12px; }
    .panel__header-icon { width:32px; height:32px; border-radius:8px; background:rgba(127,23,20,0.06); display:grid; place-items:center; flex:0 0 auto; }
    .panel__header-icon svg { width:16px; height:16px; fill:#7f1714; }
    .panel__title { margin:0; font-size:0.9rem; color:#1a1a2e; font-weight:700; line-height:1.3; }
    .panel__desc { margin:2px 0 0; color:#8b95a5; font-size:0.74rem; line-height:1.4; }

    /* ── Result box ── */
    .result-box { display:grid; gap:8px; border-radius:12px; background:#f8fafc; border:1px solid rgba(15,23,42,0.06); padding:14px; }
    .result-box__label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#667085; font-weight:700; }
    .result-box small { color:#667085; font-size:0.78rem; font-weight:600; }
    .result-box strong { font-size:1.6rem; color:#1a1a2e; line-height:1.1; }
    .result-box p { margin:0; color:#667085; font-size:0.78rem; line-height:1.55; }

    /* ── Result actions ── */
    .result-actions { display:grid; gap:8px; }

    /* ── Form ── */
    .form-grid { display:grid; gap:14px; min-width:0; }
    .field { display:grid; gap:6px; min-width:0; }
    .field__label { font-size:0.78rem; color:#344054; font-weight:600; }
    .field--full { grid-column:1 / -1; }
    input, textarea { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px; padding:9px 12px; font:inherit; background:#fff; color:#1a1a2e; box-sizing:border-box; font-size:0.84rem; }
    input:focus, textarea:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    input[readonly], textarea[readonly] { background:#f9fafb; color:#667085; cursor:not-allowed; }
    textarea { resize:vertical; min-height:84px; max-width:100%; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; min-width:0; }
    .info-state { grid-column:1 / -1; display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; background:#f8fafc; border:1px solid #e5e7eb; font-size:0.82rem; color:#667085; }
    .info-state__icon { width:16px; height:16px; fill:#8b95a5; flex:0 0 auto; }

    /* ── Score list ── */
    .score-list { display:grid; gap:12px; }
    .score-card { border:1px solid #e5e7eb; border-radius:12px; background:#fff; padding:14px; display:grid; gap:12px; }
    .score-card__head { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap; }
    .score-card__eyebrow { display:block; margin-bottom:4px; font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:700; }
    .score-card__head strong { color:#1a1a2e; font-size:0.9rem; line-height:1.45; }
    .score-card__meta { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; }
    .score-card__meta div { border-radius:10px; background:#f8fafc; padding:10px 12px; display:grid; gap:3px; }
    .score-card__meta span { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:700; }
    .score-card__meta strong { color:#1a1a2e; font-size:0.82rem; line-height:1.45; }
    .score-card__form { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px; }
    .score-card__form .field--full { grid-column:1 / -1; }
    .field--readonly input { background:#f1f3f5; color:#475467; cursor:not-allowed; border-color:#e5e7eb; font-weight:600; }
    .field--readonly input:focus { outline:none; box-shadow:none; border-color:#e5e7eb; }
    .field--readonly small { color:#94a3b8; font-size:0.7rem; line-height:1.35; }

    /* ── Responsive ── */
    @media (max-width: 980px) {
      .layout-grid { grid-template-columns:1fr; }
      .panel--compact { position:static; }
    }
    @media (max-width: 860px) {
      .score-card__meta, .score-card__form { grid-template-columns:1fr; }
    }
    @media (max-width: 720px) {
      .page { padding:14px 14px 22px; }
      .page__header { flex-direction:column; align-items:stretch; gap:12px; }
      .page__actions { flex-direction:column; }
      .page__actions .btn { width:100%; }
      .context-bar { flex-direction:column; gap:0; }
      .context-bar__divider { width:100%; height:1px; }
      .form-actions { flex-direction:column; }
      .form-actions .btn { width:100%; }
    }
  `]
})
export class FinalEvaluationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly toastService = inject(UiToastService);

  readonly evaluation = signal<FinalEvaluationDetail | null>(null);
  readonly result = signal<ResultSummary | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
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

  readonly qualitativeRatingCode = computed(
    () => this.result()?.qualitativeRatingCode ?? this.evaluation()?.qualitativeRatingCode ?? null
  );
  readonly qualitativeRatingLabel = computed(
    () => this.result()?.qualitativeRatingLabel ?? this.evaluation()?.qualitativeRatingLabel ?? null
  );
  readonly segmentName = computed(
    () => this.result()?.segmentName ?? this.evaluation()?.segmentName ?? null
  );

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
    const request$ = current?.evaluationId
      ? this.finalEvaluationService.updateFinalEvaluation(current.evaluationId, payload)
      : this.finalEvaluationService.createFinalEvaluation(payload);

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

  private get detailsArray(): FormArray {
    return this.form.get('details') as FormArray;
  }

  private loadDetail(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.finalEvaluationService.getFinalEvaluation(this.evaluatedId).subscribe({
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
}
