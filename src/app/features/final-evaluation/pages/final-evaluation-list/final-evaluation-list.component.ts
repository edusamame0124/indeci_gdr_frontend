import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinalEvaluationSummary } from '../../../../core/final-evaluation/final-evaluation.models';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';

@Component({
  selector: 'app-final-evaluation-list',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Navegación">
        <a routerLink="/dashboard" class="breadcrumb__link">Inicio</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <span class="breadcrumb__current">Evaluacion Final</span>
      </nav>

      <!-- Page header -->
      <div class="page__header">
        <div class="page__header-left">
          <h1>Evaluacion por evaluado</h1>
          <p class="page__subtitle">Consulte el estado actual de evaluacion y acceda al detalle por evaluado.</p>
        </div>
        <div class="page__actions">
          <a routerLink="/dashboard" class="btn btn--outline-neutral btn--sm">
            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.5 4.5 4 10l5.5 5.5 1.1-1.1-3.6-3.6H16v-1.6H7l3.6-3.6-1.1-1.1Z"/>
            </svg>
            Volver
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

      <!-- Table card -->
      <section class="card">
        <header class="card__header">
          <div class="card__header-left">
            <div class="card__header-icon">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4.7 10.8h10.6v-1.6H4.7v1.6Zm0-4h10.6V5.2H4.7v1.6Zm0 8h7.2v-1.6H4.7v1.6Z"/>
              </svg>
            </div>
            <div>
              <h2 class="card__title">Listado de evaluaciones</h2>
              <p class="card__desc">Detalle resumido del avance de evaluacion final en el ciclo activo.</p>
            </div>
          </div>
          @if (!loading() && evaluations().length) {
            <span class="card__count">{{ evaluations().length }} {{ evaluations().length === 1 ? 'evaluacion' : 'evaluaciones' }}</span>
          }
        </header>

        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando evaluaciones...</span>
          </div>
        } @else if (!evaluations().length) {
          <div class="empty-state">
            <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4.7 10.8h10.6v-1.6H4.7v1.6Zm0-4h10.6V5.2H4.7v1.6Zm0 8h7.2v-1.6H4.7v1.6Z"/>
            </svg>
            <p>No hay evaluaciones disponibles para el ciclo activo.</p>
          </div>
        } @else {
          <!-- Desktop table -->
          <div class="desktop-table">
            <table>
              <thead>
                <tr>
                  <th class="th--num">#</th>
                  <th>Evaluado</th>
                  <th>Evaluador</th>
                  <th>Ciclo</th>
                  <th class="th--right">Puntaje</th>
                  <th>Calificación</th>
                  <th>Estado</th>
                  <th class="th--actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (item of evaluations(); track item.assignmentId; let i = $index) {
                  <tr>
                    <td class="td--num">{{ i + 1 }}</td>
                    <td class="td--title">{{ item.evaluatedName }}</td>
                    <td>{{ item.evaluatorName }}</td>
                    <td>{{ item.cycleName }}</td>
                    <td class="td--right td--mono">{{ item.consolidatedScore ?? 'Pendiente' }}</td>
                    <td>
                      @if (item.qualitativeRatingCode) {
                        <span
                          class="rating-badge"
                          [class.rating-badge--good]="item.qualitativeRatingCode === 'BUEN_RENDIMIENTO' || item.qualitativeRatingCode === 'DISTINGUIDO'"
                          [class.rating-badge--warn]="item.qualitativeRatingCode === 'SUJETO_OBSERVACION'"
                          [class.rating-badge--bad]="item.qualitativeRatingCode === 'DESAPROBADO'"
                          [class.rating-badge--neutral]="item.qualitativeRatingCode === 'NO_CALIFICABLE'"
                          [title]="'Segmento: ' + (item.segmentName ?? 'Sin segmento')"
                        >
                          {{ item.qualitativeRatingLabel }}
                        </span>
                      } @else {
                        <span class="rating-badge rating-badge--pending">Pendiente</span>
                      }
                    </td>
                    <td>
                      <span class="status-badge">
                        <span class="status-badge__dot"></span>
                        {{ item.status }}
                      </span>
                    </td>
                    <td>
                      <div class="actions-cell">
                        <a [routerLink]="['/dashboard/evaluacion-final', item.evaluatedId]" class="btn btn--outline btn--xs">
                          <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M10 4.4c-4 0-7.4 2.8-8.8 5.6 1.4 2.8 4.8 5.6 8.8 5.6s7.4-2.8 8.8-5.6C17.4 7.2 14 4.4 10 4.4Zm0 9.3a3.7 3.7 0 1 1 0-7.4 3.7 3.7 0 0 1 0 7.4Zm0-6a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z"/>
                          </svg>
                          Abrir
                        </a>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="mobile-cards">
            @for (item of evaluations(); track item.assignmentId) {
              <article class="eval-card">
                <div class="eval-card__top">
                  <strong class="eval-card__title">{{ item.evaluatedName }}</strong>
                  <span class="status-badge status-badge--sm">
                    <span class="status-badge__dot"></span>
                    {{ item.status }}
                  </span>
                </div>
                <div class="eval-card__meta">
                  <div class="eval-card__field">
                    <span>Evaluador</span>
                    <strong>{{ item.evaluatorName }}</strong>
                  </div>
                  <div class="eval-card__field">
                    <span>Ciclo</span>
                    <strong>{{ item.cycleName }}</strong>
                  </div>
                </div>
                <div class="eval-card__meta">
                  <div class="eval-card__field">
                    <span>Puntaje</span>
                    <strong>{{ item.consolidatedScore ?? 'Pendiente' }}</strong>
                  </div>
                  <div class="eval-card__field">
                    <span>Calificación</span>
                    <strong>
                      @if (item.qualitativeRatingCode) {
                        <span
                          class="rating-badge rating-badge--sm"
                          [class.rating-badge--good]="item.qualitativeRatingCode === 'BUEN_RENDIMIENTO' || item.qualitativeRatingCode === 'DISTINGUIDO'"
                          [class.rating-badge--warn]="item.qualitativeRatingCode === 'SUJETO_OBSERVACION'"
                          [class.rating-badge--bad]="item.qualitativeRatingCode === 'DESAPROBADO'"
                          [class.rating-badge--neutral]="item.qualitativeRatingCode === 'NO_CALIFICABLE'"
                        >{{ item.qualitativeRatingLabel }}</span>
                      } @else {
                        <span class="rating-badge rating-badge--sm rating-badge--pending">Pendiente</span>
                      }
                    </strong>
                  </div>
                </div>
                <div class="eval-card__actions">
                  <a [routerLink]="['/dashboard/evaluacion-final', item.evaluatedId]" class="btn btn--outline btn--sm btn--full">Abrir</a>
                </div>
              </article>
            }
          </div>
        }
      </section>
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
    .page__subtitle { margin:4px 0 0; color:#667085; font-size:0.82rem; line-height:1.5; }
    .page__actions { display:flex; gap:8px; flex-wrap:wrap; }

    /* ── Alert ── */
    .alert { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; margin-bottom:16px; font-size:0.82rem; }
    .alert--error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
    .alert__icon { width:18px; height:18px; fill:currentColor; flex:0 0 auto; }

    /* ── Buttons ── */
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:36px; padding:0 16px; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.15s ease; text-decoration:none; border:none; white-space:nowrap; }
    .btn__icon { width:15px; height:15px; fill:currentColor; flex:0 0 auto; }
    .btn--sm { min-height:32px; padding:0 12px; font-size:0.78rem; }
    .btn--xs { min-height:28px; padding:0 10px; font-size:0.74rem; border-radius:6px; }
    .btn--full { width:100%; }
    .btn--primary { background:#7f1714; color:#fff; box-shadow:0 1px 3px rgba(127,23,20,0.2); }
    .btn--primary:hover { background:#951c18; box-shadow:0 2px 6px rgba(127,23,20,0.25); }
    .btn--outline { background:#fff; color:#7f1714; border:1px solid rgba(127,23,20,0.2); }
    .btn--outline:hover { background:rgba(127,23,20,0.04); border-color:rgba(127,23,20,0.3); }
    .btn--outline-neutral { background:#fff; color:#475467; border:1px solid #d0d5dd; }
    .btn--outline-neutral:hover { background:#f9fafb; border-color:#98a2b3; }

    /* ── Card panel ── */
    .card { border-radius:12px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,0.04); overflow:hidden; }
    .card__header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; border-bottom:1px solid #f1f3f5; flex-wrap:wrap; }
    .card__header-left { display:flex; align-items:flex-start; gap:12px; }
    .card__header-icon { width:32px; height:32px; border-radius:8px; background:rgba(127,23,20,0.06); display:grid; place-items:center; flex:0 0 auto; }
    .card__header-icon svg { width:16px; height:16px; fill:#7f1714; }
    .card__title { margin:0; font-size:0.9rem; color:#1a1a2e; font-weight:700; line-height:1.3; }
    .card__desc { margin:2px 0 0; color:#8b95a5; font-size:0.74rem; line-height:1.4; }
    .card__count { font-size:0.76rem; color:#667085; font-weight:600; background:#f1f3f5; padding:4px 10px; border-radius:999px; white-space:nowrap; }

    /* ── Status badge ── */
    .status-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:999px; font-size:0.74rem; font-weight:600; line-height:1; background:#f0f1f3; color:#475467; }
    .status-badge--sm { padding:3px 10px; font-size:0.72rem; }
    .status-badge__dot { width:7px; height:7px; border-radius:50%; background:currentColor; flex:0 0 auto; }

    .rating-badge { display:inline-flex; align-items:center; padding:4px 12px; border-radius:999px; font-size:0.74rem; font-weight:600; line-height:1; background:#f0f1f3; color:#475467; }
    .rating-badge--sm { padding:3px 10px; font-size:0.72rem; }
    .rating-badge--good { background:#dcfce7; color:#15803d; }
    .rating-badge--warn { background:#fef3c7; color:#a16207; }
    .rating-badge--bad { background:#fee2e2; color:#b91c1c; }
    .rating-badge--neutral { background:#e0e7ff; color:#4338ca; }
    .rating-badge--pending { background:#f1f5f9; color:#94a3b8; font-style:italic; }

    /* ── Loading ── */
    .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 16px; color:#667085; font-size:0.84rem; }
    .loading-spinner { width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#7f1714; border-radius:50%; animation:spin 0.7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Empty state ── */
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:48px 18px; text-align:center; }
    .empty-state__icon { width:32px; height:32px; fill:#c4ccd6; }
    .empty-state p { margin:0; color:#8b95a5; font-size:0.84rem; }

    /* ── Desktop table ── */
    .desktop-table { display:block; width:100%; overflow-x:auto; }
    table { width:100%; min-width:800px; border-collapse:collapse; }
    th, td { padding:11px 14px; text-align:left; border-bottom:1px solid #f1f3f5; vertical-align:middle; font-size:0.82rem; }
    th { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; background:#f8fafc; font-weight:600; }
    td { color:#344054; line-height:1.45; }
    .th--num, .td--num { width:42px; text-align:center; color:#8b95a5; font-weight:600; font-size:0.76rem; }
    .th--right, .td--right { text-align:right; }
    .th--actions { text-align:right; }
    .td--title { font-weight:600; color:#1a1a2e; max-width:240px; overflow-wrap:anywhere; }
    .td--mono { font-variant-numeric:tabular-nums; font-weight:600; }
    tbody tr:hover { background:#fafbfc; }
    .actions-cell { display:flex; gap:6px; justify-content:flex-end; }

    /* ── Mobile cards ── */
    .mobile-cards { display:none; padding:12px; gap:10px; }
    .eval-card { border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:14px; display:flex; flex-direction:column; gap:10px; }
    .eval-card__top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .eval-card__title { color:#1a1a2e; font-size:0.86rem; line-height:1.35; overflow-wrap:anywhere; }
    .eval-card__meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .eval-card__field { display:flex; flex-direction:column; gap:2px; }
    .eval-card__field span { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; font-weight:600; }
    .eval-card__field strong { color:#344054; font-size:0.78rem; font-weight:500; line-height:1.4; overflow-wrap:anywhere; }
    .eval-card__actions { display:grid; grid-template-columns:1fr; gap:8px; }

    /* ── Responsive ── */
    @media (max-width: 860px) {
      .desktop-table { display:none; }
      .mobile-cards { display:grid; }
    }
    @media (max-width: 720px) {
      .page { padding:14px 14px 22px; }
      .page__header { flex-direction:column; align-items:stretch; gap:12px; }
      .page__actions { flex-direction:column; }
      .page__actions .btn { width:100%; }
      .eval-card__meta { grid-template-columns:1fr; }
    }
  `]
})
export class FinalEvaluationListComponent {
  private readonly finalEvaluationService = inject(FinalEvaluationService);

  readonly evaluations = signal<FinalEvaluationSummary[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.loadEvaluations();
  }

  private loadEvaluations(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.finalEvaluationService.listFinalEvaluations().subscribe({
      next: (evaluations) => {
        this.evaluations.set(evaluations);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }
}
