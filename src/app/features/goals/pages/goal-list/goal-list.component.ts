import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { HrAssignmentSummary } from '../../../../core/hr/hr.models';
import { HrService } from '../../../../core/hr/hr.service';
import { Indicator } from '../../../../core/indicators/indicators.models';
import { IndicatorsService } from '../../../../core/indicators/indicators.service';
import { GoalDetail, GoalSummary, GoalUpsertRequest } from '../../../../core/goals/goals.models';
import { GoalsService } from '../../../../core/goals/goals.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-goal-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Navegación">
        <a routerLink="/dashboard" class="breadcrumb__link">Inicio</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <span class="breadcrumb__current">Metas</span>
      </nav>

      <!-- Page header -->
      <div class="page__header">
        <div class="page__header-left">
          <p class="page__eyebrow">Metas e indicadores</p>
          <h1>Metas</h1>
          <p class="page__subtitle">
            Gestion unificada de metas del ciclo activo.
          </p>
        </div>

        <div class="page__actions">
          <a routerLink="/dashboard" class="btn btn--outline-neutral btn--sm">
            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.5 4.5 4 10l5.5 5.5 1.1-1.1-3.6-3.6H16v-1.6H7l3.6-3.6-1.1-1.1Z"/>
            </svg>
            Volver
          </a>
          @if (canManageGoals()) {
            <button type="button" class="btn btn--primary" (click)="openCreateModal()">
              <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
              </svg>
              Nueva meta
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

      <!-- Table card -->
      <section class="card">
        <header class="card__header">
          <div class="card__header-left">
            <div class="card__header-icon">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2.2 2.5 5.6v4.8c0 4 3.2 7 7.5 7.4 4.3-.4 7.5-3.4 7.5-7.4V5.6L10 2.2Zm-1 10.8-3-3 1.1-1.1L9 10.8l3.9-3.9 1.1 1.1-5 5Z"/>
              </svg>
            </div>
            <div>
              <h2 class="card__title">Listado</h2>
              <p class="card__desc">Consulte metas visibles dentro de su alcance operativo.</p>
            </div>
          </div>
          @if (!loading() && goals().length) {
            <span class="card__count">{{ goals().length }} {{ goals().length === 1 ? 'registro' : 'registros' }}</span>
          }
        </header>

        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando metas...</span>
          </div>
        } @else if (!goals().length) {
          <div class="empty-state">
            <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 2.2 2.5 5.6v4.8c0 4 3.2 7 7.5 7.4 4.3-.4 7.5-3.4 7.5-7.4V5.6L10 2.2Zm-1 10.8-3-3 1.1-1.1L9 10.8l3.9-3.9 1.1 1.1-5 5Z"/>
            </svg>
            <p>No hay metas visibles para su alcance actual.</p>
            @if (canManageGoals()) {
              <button type="button" class="btn btn--primary btn--sm" (click)="openCreateModal()">Registrar primera meta</button>
            }
          </div>
        } @else {
          <!-- Desktop table -->
          <div class="desktop-table">
            <table>
              <thead>
                <tr>
                  <th class="th--num">#</th>
                  <th>Título</th>
                  <th>Evaluado</th>
                  <th>Indicador</th>
                  <th>Valor esperado</th>
                  <th>Peso</th>
                  <th class="th--actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (goal of pagedGoals(); track goal.id; let i = $index) {
                  <tr>
                    <td class="td--num">{{ (currentPage() - 1) * pageSize + i + 1 }}</td>
                    <td class="td--title">{{ goal.title }}</td>
                    <td>{{ goal.evaluatedName }}</td>
                    <td>{{ goal.indicatorName }}</td>
                    <td>{{ goal.expectedValue }}</td>
                    <td>{{ goal.weight }}%</td>
                    <td>
                      <div class="actions-cell">
                        <a [routerLink]="['/dashboard/metas', goal.id, 'evidencias']" class="btn btn--outline btn--xs">
                          <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M4.7 10.8h10.6v-1.6H4.7v1.6Zm0-4h10.6V5.2H4.7v1.6Zm0 8h7.2v-1.6H4.7v1.6Z"/>
                          </svg>
                          Evidencias
                        </a>
                        @if (canManageGoals()) {
                          <button type="button" class="btn btn--ghost btn--xs" (click)="openEditModal(goal.id)">
                            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M4 14.5V16h1.5l7.7-7.7-1.5-1.5L4 14.5Zm10.9-7.8a1.1 1.1 0 0 0 0-1.6l-1-1a1.1 1.1 0 0 0-1.6 0l-.8.8L14 7.5l.9-.8Z"/>
                            </svg>
                            Editar
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="mobile-cards">
            @for (goal of pagedGoals(); track goal.id) {
              <article class="goal-card">
                <div class="goal-card__top">
                  <strong class="goal-card__title">{{ goal.title }}</strong>
                  <span class="goal-card__weight">{{ goal.weight }}%</span>
                </div>
                <div class="goal-card__meta">
                  <div class="goal-card__field">
                    <span>Evaluado</span>
                    <strong>{{ goal.evaluatedName }}</strong>
                  </div>
                  <div class="goal-card__field">
                    <span>Indicador</span>
                    <strong>{{ goal.indicatorName }}</strong>
                  </div>
                  <div class="goal-card__field">
                    <span>Valor esperado</span>
                    <strong>{{ goal.expectedValue }}</strong>
                  </div>
                </div>
                <div class="goal-card__actions">
                  <a [routerLink]="['/dashboard/metas', goal.id, 'evidencias']" class="btn btn--outline btn--sm btn--full">Evidencias</a>
                  @if (canManageGoals()) {
                    <button type="button" class="btn btn--ghost btn--sm btn--full" (click)="openEditModal(goal.id)">Editar</button>
                  }
                </div>
              </article>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="pagination">
              <div class="pagination__info">
                Mostrando {{ (currentPage() - 1) * pageSize + 1 }}–{{ currentPageEnd() }} de {{ goals().length }}
              </div>
              <div class="pagination__controls">
                <button type="button" class="btn btn--ghost btn--xs" (click)="goToPage(1)" [disabled]="currentPage() === 1" aria-label="Primera página">
                  <svg class="btn__icon" viewBox="0 0 20 20"><path d="M13.5 15.5 8 10l5.5-5.5-1.1-1.1L6 10l6.4 6.6 1.1-1.1ZM7 4.5H5.5v11H7v-11Z"/></svg>
                </button>
                <button type="button" class="btn btn--ghost btn--xs" (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1" aria-label="Página anterior">
                  <svg class="btn__icon" viewBox="0 0 20 20"><path d="M12.5 15.5 7 10l5.5-5.5 1.1 1.1L9.2 10l4.4 4.4-1.1 1.1Z"/></svg>
                </button>
                <span class="pagination__page">{{ currentPage() }} / {{ totalPages() }}</span>
                <button type="button" class="btn btn--ghost btn--xs" (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()" aria-label="Página siguiente">
                  <svg class="btn__icon" viewBox="0 0 20 20"><path d="M7.5 4.5 13 10l-5.5 5.5-1.1-1.1L10.8 10 6.4 5.6l1.1-1.1Z"/></svg>
                </button>
                <button type="button" class="btn btn--ghost btn--xs" (click)="goToPage(totalPages())" [disabled]="currentPage() === totalPages()" aria-label="Última página">
                  <svg class="btn__icon" viewBox="0 0 20 20"><path d="M6.5 4.5 12 10l-5.5 5.5 1.1 1.1L14 10 7.6 3.4 6.5 4.5ZM13 4.5h1.5v11H13v-11Z"/></svg>
                </button>
              </div>
            </div>
          }
        }
      </section>

      <!-- Modal: crear/editar meta -->
      @if (modalOpen()) {
        <div class="modal-backdrop" (click)="closeModal()"></div>
        <section class="modal" role="dialog" aria-modal="true" aria-label="Formulario de meta">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">Metas</p>
              <h2>{{ editingGoalId() ? 'Editar meta' : 'Nueva meta' }}</h2>
              <p class="modal__subtitle">Use este formulario unico para registrar o actualizar metas.</p>
            </div>
            <button type="button" class="modal__close" (click)="closeModal()" aria-label="Cerrar modal">
              <svg viewBox="0 0 20 20"><path d="M14.3 5.7l-1-1L10 8l-3.3-3.3-1 1L9 9l-3.3 3.3 1 1L10 10l3.3 3.3 1-1L11 9l3.3-3.3Z"/></svg>
            </button>
          </div>

          @if (selectedGoal()) {
            <div class="context-bar">
              <div class="context-bar__item">
                <span class="context-bar__label">Evaluador</span>
                <span class="context-bar__value">{{ selectedGoal()!.evaluatorName }}</span>
              </div>
              <div class="context-bar__divider"></div>
              <div class="context-bar__item">
                <span class="context-bar__label">Evaluado</span>
                <span class="context-bar__value">{{ selectedGoal()!.evaluatedName }}</span>
              </div>
              <div class="context-bar__divider"></div>
              <div class="context-bar__item">
                <span class="context-bar__label">Ciclo</span>
                <span class="context-bar__value">{{ selectedGoal()!.cycleName }}</span>
              </div>
            </div>
          }

          @if (formError()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
              </svg>
              <span>{{ formError() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="saveGoal()" class="form-grid">
            <label class="field">
              <span class="field__label">Asignación <span class="field__required">*</span></span>
              <select formControlName="assignmentId">
                <option [ngValue]="null">Seleccione</option>
                @for (assignment of assignments(); track assignment.assignmentId) {
                  <option [ngValue]="assignment.assignmentId">
                    {{ assignment.evaluatedName }} - {{ assignment.cycleName }}
                  </option>
                }
              </select>
            </label>

            <label class="field">
              <span class="field__label">Indicador <span class="field__required">*</span></span>
              <select formControlName="indicatorId">
                <option [ngValue]="null">Seleccione</option>
                @for (indicator of indicators(); track indicator.id) {
                  <option [ngValue]="indicator.id">
                    {{ indicator.code }} - {{ indicator.name }}
                  </option>
                }
              </select>
            </label>

            <label class="field field--full">
              <span class="field__label">Título <span class="field__required">*</span></span>
              <input type="text" formControlName="title" placeholder="Titulo de la meta" />
            </label>

            <label class="field field--full">
              <span class="field__label">Descripción</span>
              <textarea rows="4" formControlName="description" placeholder="Descripcion opcional"></textarea>
            </label>

            <label class="field">
              <span class="field__label">Valor esperado <span class="field__required">*</span></span>
              <input type="number" formControlName="expectedValue" min="0.0001" step="0.0001" />
            </label>

            <label class="field">
              <span class="field__label">Peso <span class="field__required">*</span></span>
              <input type="number" formControlName="weight" min="0.01" max="100" step="0.01" />
            </label>

            <div class="form-actions">
              <button type="button" class="btn btn--ghost" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="saving() || !canManageGoals()">
                @if (saving()) {
                  <span class="loading-spinner loading-spinner--sm"></span>
                }
                {{ editingGoalId() ? 'Actualizar' : 'Registrar' }}
              </button>
            </div>
          </form>
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
    .page__header { display:flex; justify-content:space-between; gap:16px; align-items:flex-end; margin-bottom:20px; flex-wrap:wrap; min-width:0; }
    .page__header-left { min-width:0; }
    .page__eyebrow { margin:0 0 6px; font-size:0.7rem; font-weight:700; letter-spacing:0.1em; color:#8b95a5; text-transform:uppercase; }
    .page__header h1 { margin:0; color:#1a1a2e; font-size:1.5rem; font-weight:700; line-height:1.2; letter-spacing:-0.01em; }
    .page__subtitle { margin:6px 0 0; color:#667085; max-width:720px; font-size:0.84rem; line-height:1.55; }
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
    .btn--primary:disabled { opacity:0.6; cursor:not-allowed; box-shadow:none; }
    .btn--outline { background:#fff; color:#7f1714; border:1px solid rgba(127,23,20,0.2); }
    .btn--outline:hover { background:rgba(127,23,20,0.04); border-color:rgba(127,23,20,0.3); }
    .btn--outline-neutral { background:#fff; color:#475467; border:1px solid #d0d5dd; }
    .btn--outline-neutral:hover { background:#f9fafb; border-color:#98a2b3; }
    .btn--ghost { background:transparent; color:#475467; border:1px solid #e5e7eb; }
    .btn--ghost:hover { background:#f9fafb; }
    .btn--ghost:disabled { opacity:0.4; cursor:not-allowed; }

    /* ── Card panel ── */
    .card { border-radius:12px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,0.04); overflow:hidden; }
    .card__header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; border-bottom:1px solid #f1f3f5; flex-wrap:wrap; }
    .card__header-left { display:flex; align-items:flex-start; gap:12px; }
    .card__header-icon { width:32px; height:32px; border-radius:8px; background:rgba(127,23,20,0.06); display:grid; place-items:center; flex:0 0 auto; }
    .card__header-icon svg { width:16px; height:16px; fill:#7f1714; }
    .card__title { margin:0; font-size:0.95rem; color:#1a1a2e; font-weight:700; line-height:1.3; }
    .card__desc { margin:2px 0 0; color:#8b95a5; font-size:0.76rem; line-height:1.4; }
    .card__count { font-size:0.76rem; color:#667085; font-weight:600; background:#f1f3f5; padding:4px 10px; border-radius:999px; white-space:nowrap; }

    /* ── Loading ── */
    .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 16px; color:#667085; font-size:0.84rem; }
    .loading-spinner { width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#7f1714; border-radius:50%; animation:spin 0.7s linear infinite; }
    .loading-spinner--sm { width:14px; height:14px; border-width:2px; border-color:rgba(255,255,255,0.3); border-top-color:#fff; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Empty state ── */
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:48px 18px; text-align:center; }
    .empty-state__icon { width:32px; height:32px; fill:#c4ccd6; }
    .empty-state p { margin:0; color:#8b95a5; font-size:0.84rem; }

    /* ── Desktop table ── */
    .desktop-table { display:block; width:100%; overflow-x:auto; }
    table { width:100%; min-width:820px; border-collapse:collapse; }
    th, td { padding:11px 14px; text-align:left; border-bottom:1px solid #f1f3f5; vertical-align:middle; font-size:0.82rem; }
    th { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; background:#f8fafc; font-weight:600; }
    td { color:#344054; line-height:1.45; }
    .th--num, .td--num { width:42px; text-align:center; color:#8b95a5; font-weight:600; font-size:0.76rem; }
    .th--actions { text-align:right; }
    .td--title { font-weight:600; color:#1a1a2e; max-width:260px; overflow-wrap:anywhere; }
    tbody tr:hover { background:#fafbfc; }
    .actions-cell { display:flex; gap:6px; justify-content:flex-end; flex-wrap:wrap; }

    /* ── Mobile cards ── */
    .mobile-cards { display:none; padding:12px; gap:10px; }
    .goal-card { border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:14px; display:flex; flex-direction:column; gap:10px; }
    .goal-card__top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .goal-card__title { color:#1a1a2e; font-size:0.86rem; line-height:1.35; overflow-wrap:anywhere; }
    .goal-card__weight { font-size:0.74rem; font-weight:700; color:#7f1714; background:rgba(127,23,20,0.08); padding:3px 10px; border-radius:999px; white-space:nowrap; }
    .goal-card__meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .goal-card__field { display:flex; flex-direction:column; gap:2px; }
    .goal-card__field span { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; font-weight:600; }
    .goal-card__field strong { color:#344054; font-size:0.78rem; font-weight:500; line-height:1.4; overflow-wrap:anywhere; }
    .goal-card__actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }

    /* ── Pagination ── */
    .pagination { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 18px; border-top:1px solid #f1f3f5; flex-wrap:wrap; }
    .pagination__info { font-size:0.76rem; color:#667085; font-weight:500; }
    .pagination__controls { display:flex; align-items:center; gap:4px; }
    .pagination__page { font-size:0.78rem; color:#1a1a2e; font-weight:600; min-width:52px; text-align:center; }

    /* ── Context bar (modal) ── */
    .context-bar { display:flex; align-items:stretch; gap:0; margin-bottom:4px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
    .context-bar__item { flex:1; padding:12px 14px; display:flex; flex-direction:column; gap:3px; min-width:0; }
    .context-bar__divider { width:1px; background:#e5e7eb; flex:0 0 1px; }
    .context-bar__label { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:700; }
    .context-bar__value { color:#1a1a2e; font-size:0.82rem; font-weight:600; line-height:1.4; overflow-wrap:anywhere; word-break:break-word; }

    /* ── Form ── */
    .form-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; padding:4px 0 0; min-width:0; }
    .field { display:grid; gap:6px; min-width:0; }
    .field__label { font-size:0.78rem; color:#344054; font-weight:600; }
    .field__required { color:#dc2626; }
    .field--full, .form-actions { grid-column:1 / -1; }
    input, textarea, select { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px; padding:9px 12px; font:inherit; background:#fff; color:#1a1a2e; box-sizing:border-box; font-size:0.84rem; min-height:38px; }
    input:focus, textarea:focus, select:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    textarea { resize:vertical; min-height:88px; max-width:100%; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:6px; min-width:0; }

    /* ── Modal ── */
    .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,0.35); z-index:90; backdrop-filter:blur(2px); }
    .modal { position:fixed; inset:50% auto auto 50%; transform:translate(-50%,-50%); width:min(720px, calc(100vw - 32px)); max-height:calc(100vh - 32px); overflow:auto; border-radius:14px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 20px 60px rgba(15,23,42,0.15); padding:22px; z-index:100; display:grid; gap:14px; }
    .modal__header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .modal__eyebrow { margin:0 0 4px; font-size:0.68rem; font-weight:700; letter-spacing:0.08em; color:#8b95a5; text-transform:uppercase; }
    .modal__header h2 { margin:0; font-size:1.05rem; color:#1a1a2e; font-weight:700; }
    .modal__subtitle { margin:4px 0 0; color:#667085; font-size:0.78rem; line-height:1.5; }
    .modal__close { border:none; background:transparent; color:#8b95a5; width:32px; height:32px; border-radius:8px; cursor:pointer; display:inline-grid; place-items:center; padding:0; }
    .modal__close svg { width:16px; height:16px; fill:currentColor; }
    .modal__close:hover { background:#f1f3f5; color:#475467; }

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
      .context-bar { flex-direction:column; gap:0; }
      .context-bar__divider { width:100%; height:1px; }
      .form-grid { grid-template-columns:1fr; }
      .form-actions { flex-direction:column; }
      .form-actions .btn { width:100%; }
      .goal-card__meta { grid-template-columns:1fr; }
      .goal-card__actions { grid-template-columns:1fr; }
      .pagination { flex-direction:column; align-items:center; }
    }
    @media (max-width: 560px) {
      .modal { width:calc(100vw - 16px); max-height:calc(100vh - 16px); padding:16px; border-radius:12px; }
    }
  `]
})
export class GoalListComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly hrService = inject(HrService);
  private readonly indicatorsService = inject(IndicatorsService);
  private readonly goalsService = inject(GoalsService);
  private readonly toastService = inject(UiToastService);

  readonly goals = signal<GoalSummary[]>([]);
  readonly assignments = signal<HrAssignmentSummary[]>([]);
  readonly indicators = signal<Indicator[]>([]);
  readonly selectedGoal = signal<GoalDetail | null>(null);
  readonly editingGoalId = signal<number | null>(null);
  readonly modalOpen = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly formError = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 5;
  readonly canManageGoals = computed(() => this.authService.canAccessFeature('goalsManage'));

  readonly form = this.fb.group({
    assignmentId: [null as number | null, [Validators.required]],
    indicatorId: [null as number | null, [Validators.required]],
    title: ['', [Validators.required]],
    description: [''],
    expectedValue: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    weight: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(100)]]
  });

  private pendingRouteMode: 'list' | 'create' | 'edit' = 'list';
  private pendingRouteGoalId: number | null = null;
  private handledRouteKey = '';

  constructor() {
    this.route.data.subscribe((data) => {
      const mode = data['mode'] as 'create' | 'edit' | undefined;
      this.pendingRouteMode = mode ?? 'list';
      this.syncRouteIntent();
    });

    this.route.paramMap.subscribe((params) => {
      const goalId = Number(params.get('id') || 0);
      this.pendingRouteGoalId = goalId > 0 ? goalId : null;
      this.syncRouteIntent();
    });

    this.loadData();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.goals().length / this.pageSize));
  }

  pagedGoals(): GoalSummary[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.goals().slice(start, start + this.pageSize);
  }

  currentPageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.goals().length);
  }

  goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
  }

  openCreateModal(): void {
    this.router.navigate(['/dashboard/goals/new']);
  }

  openEditModal(goalId: number): void {
    this.router.navigate(['/dashboard/goals', goalId]);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingGoalId.set(null);
    this.selectedGoal.set(null);
    this.formError.set('');
    this.saving.set(false);
    this.handledRouteKey = '';
    this.form.reset({
      assignmentId: null,
      indicatorId: null,
      title: '',
      description: '',
      expectedValue: null,
      weight: null
    });
    if (this.router.url !== '/dashboard/goals') {
      void this.router.navigate(['/dashboard/goals']);
    }
  }

  saveGoal(): void {
    if (!this.canManageGoals()) {
      this.formError.set('No tiene permisos para gestionar metas en este ciclo.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Complete los campos requeridos de la meta.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: GoalUpsertRequest = {
      assignmentId: raw.assignmentId as number,
      indicatorId: raw.indicatorId as number,
      title: (raw.title ?? '').trim(),
      description: (raw.description ?? '').trim() || null,
      expectedValue: Number(raw.expectedValue),
      weight: Number(raw.weight)
    };

    this.saving.set(true);
    this.formError.set('');

    const request$ = this.editingGoalId()
      ? this.goalsService.updateGoal(this.editingGoalId() as number, payload)
      : this.goalsService.createGoal(payload);

    request$.subscribe({
      next: () => {
        this.toastService.success(
          this.editingGoalId() ? 'Actualizacion exitosa' : 'Registro exitoso',
          this.editingGoalId() ? 'La meta fue actualizada correctamente.' : 'La meta fue registrada correctamente.'
        );
        this.closeModal();
        this.loadGoals();
      },
      error: (error: Error) => {
        this.formError.set(error.message || 'No fue posible guardar la meta.');
        this.saving.set(false);
      }
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    if (!this.canManageGoals()) {
      this.assignments.set([]);
      this.indicators.set([]);
      this.loadGoals();
      return;
    }

    this.hrService.listAssignments().subscribe({
      next: (assignments) => {
        this.assignments.set(assignments);
        this.indicatorsService.listIndicators().subscribe({
          next: (indicators) => {
            this.indicators.set(indicators);
            this.loadGoals();
          },
          error: () => {
            this.errorMessage.set('No fue posible cargar los indicadores disponibles.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar las asignaciones activas.');
        this.loading.set(false);
      }
    });
  }

  private loadGoals(): void {
    this.goalsService.listGoals().subscribe({
      next: (goals) => {
        this.goals.set(goals);
        if (this.currentPage() > Math.max(1, Math.ceil(goals.length / this.pageSize))) {
          this.currentPage.set(1);
        }
        this.loading.set(false);
        this.syncRouteIntent();
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar las metas activas.');
        this.loading.set(false);
      }
    });
  }

  private syncRouteIntent(): void {
    if (this.loading()) {
      return;
    }

    const routeKey = `${this.pendingRouteMode}:${this.pendingRouteGoalId ?? 0}`;
    if (this.handledRouteKey === routeKey) {
      return;
    }

    if (this.pendingRouteMode === 'create') {
      if (!this.canManageGoals()) {
        this.errorMessage.set('Su perfil solo tiene acceso de consulta para metas.');
        void this.router.navigate(['/dashboard/goals']);
        return;
      }
      this.handledRouteKey = routeKey;
      this.editingGoalId.set(null);
      this.selectedGoal.set(null);
      this.formError.set('');
      this.modalOpen.set(true);
      this.form.reset({
        assignmentId: null,
        indicatorId: null,
        title: '',
        description: '',
        expectedValue: null,
        weight: null
      });
      return;
    }

    if (this.pendingRouteMode === 'edit' && this.pendingRouteGoalId) {
      if (!this.canManageGoals()) {
        this.errorMessage.set('Su perfil solo tiene acceso de consulta para metas.');
        void this.router.navigate(['/dashboard/goals']);
        return;
      }
      this.handledRouteKey = routeKey;
      this.formError.set('');
      this.goalsService.getGoal(this.pendingRouteGoalId).subscribe({
        next: (goal) => {
          this.selectedGoal.set(goal);
          this.editingGoalId.set(goal.id);
          this.modalOpen.set(true);
          this.form.reset({
            assignmentId: goal.assignmentId,
            indicatorId: goal.indicatorId,
            title: goal.title,
            description: goal.description ?? '',
            expectedValue: goal.expectedValue,
            weight: goal.weight
          });
        },
        error: (error: Error) => {
          this.formError.set(error.message || 'No fue posible cargar el detalle de la meta.');
        }
      });
      return;
    }

    this.handledRouteKey = routeKey;
  }
}
