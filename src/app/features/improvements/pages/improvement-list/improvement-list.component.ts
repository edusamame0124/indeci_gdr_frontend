import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { FinalEvaluationSummary } from '../../../../core/final-evaluation/final-evaluation.models';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import { OportunidadMejoraResumen, RegistrarOportunidadMejoraPayload } from '../../../../core/improvements/improvements.models';
import { ImprovementsService } from '../../../../core/improvements/improvements.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-improvement-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Navegacion">
        <a routerLink="/dashboard" class="breadcrumb__link">Inicio</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <a routerLink="/dashboard/evaluacion-final" class="breadcrumb__link">Evaluacion Final</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        @if (evaluatedId()) {
          <a [routerLink]="'/dashboard/evaluacion-final/' + evaluatedId()" class="breadcrumb__link">Detalle</a>
          <span class="breadcrumb__sep" aria-hidden="true">/</span>
        }
        <span class="breadcrumb__current">Oportunidades</span>
      </nav>

      <!-- Page header -->
      <div class="page__header">
        <div class="page__header-left">
          <h1>Oportunidades de mejora</h1>
          <p class="page__subtitle">Registro, seguimiento minimo y cierre conservador vinculados al resultado consolidado del evaluado.</p>
        </div>
        <div class="page__actions">
          <a [routerLink]="evaluatedId() ? '/dashboard/evaluacion-final/' + evaluatedId() : '/dashboard/evaluacion-final'" class="btn btn--outline-neutral btn--sm">
            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.5 4.5 4 10l5.5 5.5 1.1-1.1-3.6-3.6H16v-1.6H7l3.6-3.6-1.1-1.1Z"/>
            </svg>
            Volver al detalle
          </a>
          @if (canManageImprovements()) {
            <button type="button" class="btn btn--primary" (click)="openCreateModal()" [disabled]="!evaluatedId()">
              <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
              </svg>
              Nueva oportunidad
            </button>
          }
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

      <!-- Selector de evaluado -->
      <section class="card">
        <header class="card__header">
          <div class="card__header-left">
            <div class="card__header-icon">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-5.6 8c0-3.1 2.5-5.6 5.6-5.6s5.6 2.5 5.6 5.6H4.4Z"/>
              </svg>
            </div>
            <div>
              <h2 class="card__title">Evaluado activo</h2>
              <p class="card__desc">Seleccione el evaluado para consultar y registrar oportunidades de mejora.</p>
            </div>
          </div>
          @if (evaluatedId()) {
            <span class="card__count">{{ selectedEvaluationLabel() }}</span>
          }
        </header>
        <div class="selector-body">
          <label class="field">
            <span class="field__label">Evaluado</span>
            <select [formControl]="selectionForm.controls.evaluatedId">
              <option [ngValue]="null">Seleccione un evaluado</option>
              @for (evaluation of availableEvaluations(); track evaluation.evaluatedId) {
                <option [ngValue]="evaluation.evaluatedId">
                  {{ evaluation.evaluatedName }} | {{ evaluation.cycleName }}
                </option>
              }
            </select>
          </label>
          <button
            type="button"
            class="btn btn--primary btn--sm"
            (click)="applyEvaluatedSelection()"
            [disabled]="loadingEvaluations() || !selectionForm.getRawValue().evaluatedId"
          >
            @if (loadingEvaluations()) {
              <span class="loading-spinner loading-spinner--sm"></span>
            }
            {{ loadingEvaluations() ? 'Cargando...' : 'Ver' }}
          </button>
        </div>
      </section>

      <!-- Tabla de oportunidades -->
      <section class="card">
        <header class="card__header">
          <div class="card__header-left">
            <div class="card__header-icon">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 3h14v2H3V3Zm0 4h14v2H3V7Zm0 4h10v2H3v-2Zm0 4h7v2H3v-2Z"/>
              </svg>
            </div>
            <div>
              <h2 class="card__title">Listado de oportunidades</h2>
              <p class="card__desc">Consulte oportunidades registradas para el evaluado seleccionado.</p>
            </div>
          </div>
          @if (!loading() && improvements().length) {
            <span class="card__count">{{ improvements().length }} {{ improvements().length === 1 ? 'oportunidad' : 'oportunidades' }}</span>
          }
        </header>

        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando oportunidades...</span>
          </div>
        } @else if (!evaluatedId()) {
          <div class="empty-state">
            <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-5.6 8c0-3.1 2.5-5.6 5.6-5.6s5.6 2.5 5.6 5.6H4.4Z"/>
            </svg>
            <p>Seleccione un evaluado desde evaluacion final para ver oportunidades de mejora.</p>
          </div>
        } @else if (!improvements().length) {
          <div class="empty-state">
            <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 3h14v2H3V3Zm0 4h14v2H3V7Zm0 4h10v2H3v-2Zm0 4h7v2H3v-2Z"/>
            </svg>
            <p>Aun no hay oportunidades registradas para el evaluado seleccionado.</p>
            @if (canManageImprovements()) {
              <button type="button" class="btn btn--primary btn--sm" (click)="openCreateModal()">Registrar primera oportunidad</button>
            }
          </div>
        } @else {
          <!-- Desktop table -->
          <div class="desktop-table">
            <table>
              <thead>
                <tr>
                  <th class="th--num">#</th>
                  <th>Descripcion</th>
                  <th>Responsable</th>
                  <th>Plazo</th>
                  <th class="th--center">Estado</th>
                  <th class="th--actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (improvement of pagedImprovements(); track improvement.idOportunidadMejora; let i = $index) {
                  <tr>
                    <td class="td--num">{{ (currentPage() - 1) * pageSize + i + 1 }}</td>
                    <td class="td--title">{{ improvement.descripcion }}</td>
                    <td>{{ improvement.responsable }}</td>
                    <td class="td--mono">{{ improvement.plazoCompromiso }}</td>
                    <td class="td--center">
                      <span class="status-pill" [class.status-pill--open]="improvement.codigoEstado === 'OPEN'" [class.status-pill--closed]="improvement.codigoEstado === 'CLOSED'">
                        {{ improvement.nombreEstado }}
                      </span>
                    </td>
                    <td>
                      <div class="actions-cell">
                        <a [routerLink]="['/dashboard/oportunidades-mejora', improvement.idOportunidadMejora]" class="btn btn--outline btn--xs">
                          <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M10 4.5a8.5 8.5 0 0 0-8.4 7c1 3.7 4.4 6.5 8.4 6.5s7.4-2.8 8.4-6.5A8.5 8.5 0 0 0 10 4.5Zm0 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-7.2a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z"/>
                          </svg>
                          Ver detalle
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
            @for (improvement of pagedImprovements(); track improvement.idOportunidadMejora) {
              <article class="opp-card">
                <div class="opp-card__top">
                  <strong class="opp-card__title">{{ improvement.descripcion }}</strong>
                  <span class="status-pill" [class.status-pill--open]="improvement.codigoEstado === 'OPEN'" [class.status-pill--closed]="improvement.codigoEstado === 'CLOSED'">
                    {{ improvement.nombreEstado }}
                  </span>
                </div>
                <div class="opp-card__meta">
                  <div class="opp-card__field">
                    <span>Responsable</span>
                    <strong>{{ improvement.responsable }}</strong>
                  </div>
                  <div class="opp-card__field">
                    <span>Plazo</span>
                    <strong>{{ improvement.plazoCompromiso }}</strong>
                  </div>
                </div>
                <div class="opp-card__actions">
                  <a [routerLink]="['/dashboard/oportunidades-mejora', improvement.idOportunidadMejora]" class="btn btn--outline btn--sm btn--full">Ver detalle</a>
                </div>
              </article>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="pagination">
              <div class="pagination__info">
                Mostrando {{ (currentPage() - 1) * pageSize + 1 }}&ndash;{{ currentPageEnd() }} de {{ improvements().length }}
              </div>
              <div class="pagination__controls">
                <button type="button" class="btn btn--ghost btn--xs" (click)="goToPage(1)" [disabled]="currentPage() === 1" aria-label="Primera pagina">
                  <svg class="btn__icon" viewBox="0 0 20 20"><path d="M13.5 15.5 8 10l5.5-5.5-1.1-1.1L6 10l6.4 6.6 1.1-1.1ZM7 4.5H5.5v11H7v-11Z"/></svg>
                </button>
                <button type="button" class="btn btn--ghost btn--xs" (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1" aria-label="Pagina anterior">
                  <svg class="btn__icon" viewBox="0 0 20 20"><path d="M12.5 15.5 7 10l5.5-5.5 1.1 1.1L9.2 10l4.4 4.4-1.1 1.1Z"/></svg>
                </button>
                <span class="pagination__page">{{ currentPage() }} / {{ totalPages() }}</span>
                <button type="button" class="btn btn--ghost btn--xs" (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()" aria-label="Pagina siguiente">
                  <svg class="btn__icon" viewBox="0 0 20 20"><path d="M7.5 4.5 13 10l-5.5 5.5-1.1-1.1L10.8 10 6.4 5.6l1.1-1.1Z"/></svg>
                </button>
                <button type="button" class="btn btn--ghost btn--xs" (click)="goToPage(totalPages())" [disabled]="currentPage() === totalPages()" aria-label="Ultima pagina">
                  <svg class="btn__icon" viewBox="0 0 20 20"><path d="M6.5 4.5 12 10l-5.5 5.5 1.1 1.1L14 10 7.6 3.4 6.5 4.5ZM13 4.5h1.5v11H13v-11Z"/></svg>
                </button>
              </div>
            </div>
          }
        }
      </section>

      <!-- Modal: registrar oportunidad -->
      @if (modalOpen()) {
        <div class="modal-backdrop" (click)="closeModal()"></div>
        <section class="modal" role="dialog" aria-modal="true" aria-label="Registrar oportunidad de mejora">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">Oportunidades de mejora</p>
              <h2>Nueva oportunidad</h2>
              <p class="modal__subtitle">Complete los datos minimos de la oportunidad y registre desde esta vista.</p>
            </div>
            <button type="button" class="modal__close" (click)="closeModal()" aria-label="Cerrar modal">
              <svg viewBox="0 0 20 20"><path d="M14.3 5.7l-1-1L10 8l-3.3-3.3-1 1L9 9l-3.3 3.3 1 1L10 10l3.3 3.3 1-1L11 9l3.3-3.3Z"/></svg>
            </button>
          </div>

          <div class="context-bar context-bar--compact">
            <div class="context-bar__item">
              <span class="context-bar__label">Evaluado</span>
              <span class="context-bar__value">{{ selectedEvaluationLabel() }}</span>
            </div>
          </div>

          @if (modalError()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
              </svg>
              <span>{{ modalError() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submitImprovement()" class="form-grid">
            <label class="field field--full">
              <span class="field__label">Descripcion <span class="field__required">*</span></span>
              <textarea rows="4" formControlName="descripcion" placeholder="Describa la oportunidad de mejora"></textarea>
            </label>

            <label class="field">
              <span class="field__label">Responsable <span class="field__required">*</span></span>
              <input type="text" formControlName="responsable" placeholder="Nombre del responsable" />
            </label>

            <label class="field">
              <span class="field__label">Plazo compromiso <span class="field__required">*</span></span>
              <input type="date" formControlName="plazoCompromiso" />
            </label>

            <div class="form-actions">
              <button type="button" class="btn btn--ghost" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="saving() || form.invalid">
                @if (saving()) {
                  <span class="loading-spinner loading-spinner--sm"></span>
                }
                Registrar
              </button>
            </div>
          </form>
        </section>
      }
    </section>
  `,
  styles: [`
    :host { display:block; min-width:0; }

    /* -- Page layout -- */
    .page { padding:20px 24px 28px; max-width:1120px; margin:0 auto; min-width:0; overflow-x:clip; }

    /* -- Breadcrumb -- */
    .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:16px; font-size:0.75rem; flex-wrap:wrap; }
    .breadcrumb__link { color:#7f1714; text-decoration:none; font-weight:500; }
    .breadcrumb__link:hover { text-decoration:underline; }
    .breadcrumb__sep { color:#b0b8c4; }
    .breadcrumb__current { color:#667085; font-weight:500; }

    /* -- Page header -- */
    .page__header { display:flex; justify-content:space-between; gap:16px; align-items:center; margin-bottom:20px; flex-wrap:wrap; min-width:0; }
    .page__header-left { min-width:0; }
    .page__header h1 { margin:0; color:#1a1a2e; font-size:1.35rem; font-weight:700; line-height:1.2; letter-spacing:-0.01em; }
    .page__subtitle { margin:4px 0 0; color:#667085; font-size:0.82rem; line-height:1.5; }
    .page__actions { display:flex; gap:8px; flex-wrap:wrap; }

    /* -- Alert -- */
    .alert { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; margin-bottom:16px; font-size:0.82rem; }
    .alert--error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
    .alert__icon { width:18px; height:18px; fill:currentColor; flex:0 0 auto; }

    /* -- Buttons -- */
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:36px; padding:0 16px; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.15s ease; text-decoration:none; border:none; white-space:nowrap; }
    .btn__icon { width:15px; height:15px; fill:currentColor; flex:0 0 auto; }
    .btn--sm { min-height:32px; padding:0 12px; font-size:0.78rem; }
    .btn--xs { min-height:28px; padding:0 10px; font-size:0.74rem; border-radius:6px; }
    .btn--full { width:100%; }
    .btn--primary { background:#7f1714; color:#fff; box-shadow:0 1px 3px rgba(127,23,20,0.2); }
    .btn--primary:hover:not(:disabled) { background:#951c18; box-shadow:0 2px 6px rgba(127,23,20,0.25); }
    .btn--primary:disabled { opacity:0.6; cursor:not-allowed; box-shadow:none; }
    .btn--outline { background:#fff; color:#7f1714; border:1px solid rgba(127,23,20,0.2); }
    .btn--outline:hover { background:rgba(127,23,20,0.04); border-color:rgba(127,23,20,0.3); }
    .btn--outline-neutral { background:#fff; color:#475467; border:1px solid #d0d5dd; }
    .btn--outline-neutral:hover { background:#f9fafb; border-color:#98a2b3; }
    .btn--ghost { background:transparent; color:#475467; border:1px solid #e5e7eb; }
    .btn--ghost:hover { background:#f9fafb; }
    .btn--ghost:disabled { opacity:0.4; cursor:not-allowed; }

    /* -- Card panel -- */
    .card { border-radius:12px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,0.04); overflow:hidden; margin-bottom:16px; }
    .card__header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; border-bottom:1px solid #f1f3f5; flex-wrap:wrap; }
    .card__header-left { display:flex; align-items:flex-start; gap:12px; }
    .card__header-icon { width:32px; height:32px; border-radius:8px; background:rgba(127,23,20,0.06); display:grid; place-items:center; flex:0 0 auto; }
    .card__header-icon svg { width:16px; height:16px; fill:#7f1714; }
    .card__title { margin:0; font-size:0.9rem; color:#1a1a2e; font-weight:700; line-height:1.3; }
    .card__desc { margin:2px 0 0; color:#8b95a5; font-size:0.74rem; line-height:1.4; }
    .card__count { font-size:0.76rem; color:#667085; font-weight:600; background:#f1f3f5; padding:4px 10px; border-radius:999px; white-space:nowrap; }

    /* -- Selector body -- */
    .selector-body { display:flex; align-items:flex-end; gap:12px; padding:16px 18px; flex-wrap:wrap; }
    .selector-body .field { flex:1; min-width:220px; }

    /* -- Loading -- */
    .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 16px; color:#667085; font-size:0.84rem; }
    .loading-spinner { width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#7f1714; border-radius:50%; animation:spin 0.7s linear infinite; }
    .loading-spinner--sm { width:14px; height:14px; border-width:2px; border-color:rgba(255,255,255,0.3); border-top-color:#fff; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* -- Empty state -- */
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:48px 18px; text-align:center; }
    .empty-state__icon { width:32px; height:32px; fill:#c4ccd6; }
    .empty-state p { margin:0; color:#8b95a5; font-size:0.84rem; }

    /* -- Desktop table -- */
    .desktop-table { display:block; width:100%; overflow-x:auto; }
    table { width:100%; min-width:700px; border-collapse:collapse; }
    th, td { padding:11px 14px; text-align:left; border-bottom:1px solid #f1f3f5; vertical-align:middle; font-size:0.82rem; }
    th { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; background:#f8fafc; font-weight:600; }
    td { color:#344054; line-height:1.45; }
    .th--num, .td--num { width:42px; text-align:center; color:#8b95a5; font-weight:600; font-size:0.76rem; }
    .th--center { text-align:center; }
    .td--center { text-align:center; }
    .th--actions { text-align:right; }
    .td--title { font-weight:600; color:#1a1a2e; max-width:280px; overflow-wrap:anywhere; }
    .td--mono { font-variant-numeric:tabular-nums; font-weight:600; }
    tbody tr:hover { background:#fafbfc; }
    .actions-cell { display:flex; gap:6px; justify-content:flex-end; }

    /* -- Status pill -- */
    .status-pill { display:inline-flex; align-items:center; justify-content:center; padding:3px 10px; border-radius:999px; font-size:0.74rem; font-weight:700; font-variant-numeric:tabular-nums; }
    .status-pill--open { background:#f0fdf4; color:#15803d; }
    .status-pill--closed { background:#f1f3f5; color:#667085; }

    /* -- Mobile cards -- */
    .mobile-cards { display:none; padding:12px; gap:10px; }
    .opp-card { border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:14px; display:flex; flex-direction:column; gap:10px; }
    .opp-card__top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .opp-card__title { color:#1a1a2e; font-size:0.86rem; line-height:1.35; overflow-wrap:anywhere; }
    .opp-card__meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .opp-card__field { display:flex; flex-direction:column; gap:2px; }
    .opp-card__field span { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; font-weight:600; }
    .opp-card__field strong { color:#344054; font-size:0.78rem; font-weight:500; line-height:1.4; overflow-wrap:anywhere; }
    .opp-card__actions { display:grid; grid-template-columns:1fr; gap:8px; }

    /* -- Pagination -- */
    .pagination { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 18px; border-top:1px solid #f1f3f5; flex-wrap:wrap; }
    .pagination__info { font-size:0.76rem; color:#667085; font-weight:500; }
    .pagination__controls { display:flex; align-items:center; gap:4px; }
    .pagination__page { font-size:0.78rem; color:#1a1a2e; font-weight:600; min-width:52px; text-align:center; }

    /* -- Context bar (inside modal) -- */
    .context-bar { display:flex; align-items:stretch; gap:0; background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
    .context-bar--compact { margin-bottom:4px; }
    .context-bar__item { flex:1; padding:12px 14px; display:flex; flex-direction:column; gap:3px; min-width:0; }
    .context-bar__label { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:600; }
    .context-bar__value { color:#1a1a2e; font-size:0.82rem; font-weight:600; line-height:1.4; overflow-wrap:anywhere; }

    /* -- Form -- */
    .form-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; min-width:0; }
    .field { display:grid; gap:6px; min-width:0; }
    .field__label { font-size:0.78rem; color:#344054; font-weight:600; }
    .field__required { color:#dc2626; }
    .field--full, .form-actions { grid-column:1 / -1; }
    input, textarea, select { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px; padding:9px 12px; font:inherit; background:#fff; color:#1a1a2e; box-sizing:border-box; font-size:0.84rem; }
    input:focus, textarea:focus, select:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    textarea { resize:vertical; min-height:84px; max-width:100%; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:6px; min-width:0; }

    /* -- Modal -- */
    .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,0.35); z-index:90; backdrop-filter:blur(2px); }
    .modal { position:fixed; inset:50% auto auto 50%; transform:translate(-50%,-50%); width:min(720px, calc(100vw - 32px)); max-height:calc(100vh - 32px); overflow:auto; border-radius:14px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 20px 60px rgba(15,23,42,0.15); padding:22px; z-index:100; display:grid; gap:14px; }
    .modal__header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .modal__eyebrow { margin:0 0 4px; font-size:0.68rem; font-weight:700; letter-spacing:0.08em; color:#8b95a5; text-transform:uppercase; }
    .modal__header h2 { margin:0; font-size:1.05rem; color:#1a1a2e; font-weight:700; }
    .modal__subtitle { margin:4px 0 0; color:#667085; font-size:0.78rem; line-height:1.5; }
    .modal__close { border:none; background:transparent; color:#8b95a5; width:32px; height:32px; border-radius:8px; cursor:pointer; display:inline-grid; place-items:center; padding:0; }
    .modal__close svg { width:16px; height:16px; fill:currentColor; }
    .modal__close:hover { background:#f1f3f5; color:#475467; }

    /* -- Responsive -- */
    @media (max-width: 860px) {
      .desktop-table { display:none; }
      .mobile-cards { display:grid; }
    }
    @media (max-width: 720px) {
      .page { padding:14px 14px 22px; }
      .page__header { flex-direction:column; align-items:stretch; gap:12px; }
      .page__actions { flex-direction:column; }
      .page__actions .btn { width:100%; }
      .selector-body { flex-direction:column; align-items:stretch; }
      .form-grid { grid-template-columns:1fr; }
      .form-actions { flex-direction:column; }
      .form-actions .btn { width:100%; }
      .opp-card__actions { grid-template-columns:1fr; }
      .pagination { flex-direction:column; align-items:center; }
    }
    @media (max-width: 560px) {
      .modal { width:calc(100vw - 16px); max-height:calc(100vh - 16px); padding:16px; border-radius:12px; }
      .opp-card__meta { grid-template-columns:1fr; }
    }
  `]
})
export class ImprovementListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly improvementsService = inject(ImprovementsService);
  private readonly toastService = inject(UiToastService);

  readonly evaluatedId = signal<number | null>(null);
  readonly availableEvaluations = signal<FinalEvaluationSummary[]>([]);
  readonly improvements = signal<OportunidadMejoraResumen[]>([]);
  readonly loading = signal(false);
  readonly loadingEvaluations = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly modalOpen = signal(false);
  readonly modalError = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 5;
  readonly canManageImprovements = computed(
    () => this.authService.featureAccess()?.canManageImprovements ?? false
  );

  readonly selectionForm = this.fb.group({
    evaluatedId: [null as number | null, [Validators.required]]
  });

  readonly form = this.fb.group({
    descripcion: ['', [Validators.required]],
    responsable: ['', [Validators.required]],
    plazoCompromiso: ['', [Validators.required]]
  });

  constructor() {
    const evaluatedId = Number(this.route.snapshot.queryParamMap.get('evaluatedId') || 0);
    this.evaluatedId.set(evaluatedId > 0 ? evaluatedId : null);
    this.selectionForm.patchValue({ evaluatedId: this.evaluatedId() });
    this.loadAvailableEvaluations();
    if (this.evaluatedId()) {
      this.loadImprovements();
    }
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.improvements().length / this.pageSize));
  }

  pagedImprovements(): OportunidadMejoraResumen[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.improvements().slice(start, start + this.pageSize);
  }

  currentPageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.improvements().length);
  }

  goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
  }

  selectedEvaluationLabel(): string {
    if (!this.evaluatedId()) {
      return 'No seleccionado';
    }
    const selectedEvaluation = this.availableEvaluations().find(
      (evaluation) => evaluation.evaluatedId === this.evaluatedId()
    );
    return selectedEvaluation ? selectedEvaluation.evaluatedName : `#${this.evaluatedId()}`;
  }

  applyEvaluatedSelection(): void {
    const selectedEvaluatedId = this.selectionForm.getRawValue().evaluatedId;
    if (!selectedEvaluatedId) {
      this.errorMessage.set('Seleccione un evaluado para continuar.');
      return;
    }

    this.errorMessage.set('');
    this.evaluatedId.set(selectedEvaluatedId);
    this.improvements.set([]);
    this.currentPage.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { evaluatedId: selectedEvaluatedId },
      queryParamsHandling: 'merge'
    });
    this.loadImprovements();
  }

  openCreateModal(): void {
    if (!this.canManageImprovements()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar oportunidades de mejora.');
      return;
    }
    this.modalError.set('');
    this.form.reset({ descripcion: '', responsable: '', plazoCompromiso: '' });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.saving.set(false);
    this.modalError.set('');
  }

  submitImprovement(): void {
    if (!this.canManageImprovements()) {
      this.modalError.set('Su perfil no tiene permiso para registrar oportunidades de mejora.');
      return;
    }
    if (!this.evaluatedId()) {
      this.modalError.set('Seleccione un evaluado desde evaluacion final antes de registrar la oportunidad.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.modalError.set('Complete la informacion minima de la oportunidad de mejora.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: RegistrarOportunidadMejoraPayload = {
      evaluatedId: this.evaluatedId()!,
      descripcion: (raw.descripcion ?? '').trim(),
      responsable: (raw.responsable ?? '').trim(),
      plazoCompromiso: raw.plazoCompromiso ?? ''
    };

    this.saving.set(true);
    this.modalError.set('');
    this.improvementsService.createImprovement(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadImprovements();
        this.toastService.success('Oportunidad registrada', 'La oportunidad de mejora fue registrada correctamente.');
      },
      error: (error: Error) => {
        this.modalError.set(error.message);
        this.saving.set(false);
      }
    });
  }

  private loadImprovements(): void {
    if (!this.evaluatedId()) {
      return;
    }
    this.loading.set(true);
    this.improvementsService.listImprovements(this.evaluatedId()!).subscribe({
      next: (improvements) => {
        this.improvements.set(improvements);
        if (this.currentPage() > Math.max(1, Math.ceil(improvements.length / this.pageSize))) {
          this.currentPage.set(1);
        }
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  private loadAvailableEvaluations(): void {
    this.loadingEvaluations.set(true);
    this.finalEvaluationService.listFinalEvaluations().subscribe({
      next: (evaluations) => {
        this.availableEvaluations.set(evaluations);
        if (!this.evaluatedId() && evaluations.length === 1) {
          this.selectionForm.patchValue({ evaluatedId: evaluations[0].evaluatedId });
        }
        this.loadingEvaluations.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loadingEvaluations.set(false);
      }
    });
  }
}
