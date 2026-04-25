import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { GoalsService } from '../../../../core/goals/goals.service';
import { GoalDetail } from '../../../../core/goals/goals.models';
import { EvidenceSummary, EvidenceUpsertRequest } from '../../../../core/evidences/evidences.models';
import { EvidencesService } from '../../../../core/evidences/evidences.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-evidence-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Navegación">
        <a routerLink="/dashboard" class="breadcrumb__link">Inicio</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <a routerLink="/dashboard/goals" class="breadcrumb__link">Metas</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <span class="breadcrumb__current">Evidencias</span>
      </nav>

      <!-- Page header -->
      <div class="page__header">
        <div class="page__header-left">
          <h1>Evidencias de la meta</h1>
          <p class="page__subtitle">Registro y seguimiento funcional de evidencias.</p>
        </div>
        <div class="page__actions">
          <a routerLink="/dashboard/goals" class="btn btn--outline-neutral btn--sm">
            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.5 4.5 4 10l5.5 5.5 1.1-1.1-3.6-3.6H16v-1.6H7l3.6-3.6-1.1-1.1Z"/>
            </svg>
            Volver a metas
          </a>
          @if (canManageEvidence()) {
            <button type="button" class="btn btn--primary" (click)="openCreateModal()">
              <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
              </svg>
              Nueva evidencia
            </button>
          }
        </div>
      </div>

      <!-- Context bar -->
      @if (goal()) {
        <div class="context-bar">
          <div class="context-bar__item">
            <span class="context-bar__label">Meta asignada</span>
            <span class="context-bar__value">{{ goal()!.title }}</span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item">
            <span class="context-bar__label">Servidor evaluado</span>
            <span class="context-bar__value">{{ goal()!.evaluatedName }}</span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item">
            <span class="context-bar__label">Indicador</span>
            <span class="context-bar__value">{{ goal()!.indicatorName }}</span>
          </div>
        </div>
      }

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
              <h2 class="card__title">Listado de evidencias</h2>
              <p class="card__desc">Revise, actualice y haga seguimiento del estado de cada evidencia.</p>
            </div>
          </div>
          @if (!loading() && evidences().length) {
            <span class="card__count">{{ evidences().length }} {{ evidences().length === 1 ? 'registro' : 'registros' }}</span>
          }
        </header>

        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando evidencias...</span>
          </div>
        } @else if (!evidences().length) {
          <div class="empty-state">
            <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4.7 10.8h10.6v-1.6H4.7v1.6Zm0-4h10.6V5.2H4.7v1.6Zm0 8h7.2v-1.6H4.7v1.6Z"/>
            </svg>
            <p>No hay evidencias registradas para esta meta.</p>
            @if (canManageEvidence()) {
              <button type="button" class="btn btn--primary btn--sm" (click)="openCreateModal()">Registrar primera evidencia</button>
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
                  <th>Estado</th>
                  <th>Fecha esperada</th>
                  <th>Último seguimiento</th>
                  <th class="th--actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (evidence of pagedEvidences(); track evidence.id; let i = $index) {
                  <tr>
                    <td class="td--num">{{ (currentPage() - 1) * pageSize + i + 1 }}</td>
                    <td class="td--title">{{ evidence.title }}</td>
                    <td>
                      <span class="status-badge"
                            [class.status-badge--approved]="evidence.statusCode === 'APPROVED'"
                            [class.status-badge--observed]="evidence.statusCode === 'OBSERVED'">
                        <span class="status-badge__dot"></span>
                        {{ evidence.statusName }}
                      </span>
                    </td>
                    <td>
                      <span class="td--date">
                        <svg class="td--date-icon" viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M6 2v2H4.5A1.5 1.5 0 0 0 3 5.5v11A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 15.5 4H14V2h-2v2H8V2H6Zm-1 6h10v8.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V8Z"/>
                        </svg>
                        {{ evidence.expectedDate || 'Sin fecha' }}
                      </span>
                    </td>
                    <td class="td--comment">{{ evidence.latestReviewComment || 'Sin revisión registrada' }}</td>
                    <td>
                      <div class="actions-cell">
                        @if (canManageEvidence()) {
                          <button type="button" class="btn btn--outline btn--xs" (click)="openEditModal(evidence.id)">
                            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M4 14.5V16h1.5l7.7-7.7-1.5-1.5L4 14.5Zm10.9-7.8a1.1 1.1 0 0 0 0-1.6l-1-1a1.1 1.1 0 0 0-1.6 0l-.8.8L14 7.5l.9-.8Z"/>
                            </svg>
                            Editar
                          </button>
                        }
                        <button type="button" class="btn btn--ghost btn--xs" (click)="openDetail(evidence.id)">
                          <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M10 4.4c-4 0-7.4 2.8-8.8 5.6 1.4 2.8 4.8 5.6 8.8 5.6s7.4-2.8 8.8-5.6C17.4 7.2 14 4.4 10 4.4Zm0 9.3a3.7 3.7 0 1 1 0-7.4 3.7 3.7 0 0 1 0 7.4Zm0-6a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z"/>
                          </svg>
                          Detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="mobile-cards">
            @for (evidence of pagedEvidences(); track evidence.id) {
              <article class="evidence-card">
                <div class="evidence-card__top">
                  <strong class="evidence-card__title">{{ evidence.title }}</strong>
                  <span class="status-badge status-badge--sm"
                        [class.status-badge--approved]="evidence.statusCode === 'APPROVED'"
                        [class.status-badge--observed]="evidence.statusCode === 'OBSERVED'">
                    <span class="status-badge__dot"></span>
                    {{ evidence.statusName }}
                  </span>
                </div>
                <div class="evidence-card__meta">
                  <div class="evidence-card__field">
                    <span>Fecha esperada</span>
                    <strong>{{ evidence.expectedDate || 'Sin fecha' }}</strong>
                  </div>
                  <div class="evidence-card__field">
                    <span>Seguimiento</span>
                    <strong>{{ evidence.latestReviewComment || 'Sin revisión registrada' }}</strong>
                  </div>
                </div>
                <div class="evidence-card__actions">
                  @if (canManageEvidence()) {
                    <button type="button" class="btn btn--outline btn--sm btn--full" (click)="openEditModal(evidence.id)">Editar</button>
                  }
                  <button type="button" class="btn btn--ghost btn--sm btn--full" (click)="openDetail(evidence.id)">Detalle</button>
                </div>
              </article>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="pagination">
              <div class="pagination__info">
                Mostrando {{ (currentPage() - 1) * pageSize + 1 }}–{{ currentPageEnd() }} de {{ evidences().length }}
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

      <!-- Modal: crear/editar evidencia -->
      @if (modalOpen()) {
        <div class="modal-backdrop" (click)="closeModal()"></div>
        <section class="modal" role="dialog" aria-modal="true" aria-label="Formulario de evidencia">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">Evidencias</p>
              <h2>{{ editingEvidenceId() ? 'Editar evidencia' : 'Nueva evidencia' }}</h2>
              <p class="modal__subtitle">Complete los datos funcionales de la evidencia.</p>
            </div>
            <button type="button" class="modal__close" (click)="closeModal()" aria-label="Cerrar modal">
              <svg viewBox="0 0 20 20"><path d="M14.3 5.7l-1-1L10 8l-3.3-3.3-1 1L9 9l-3.3 3.3 1 1L10 10l3.3 3.3 1-1L11 9l3.3-3.3Z"/></svg>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="saveEvidence()" class="form-grid">
            <label class="field field--full">
              <span class="field__label">Título <span class="field__required">*</span></span>
              <input type="text" formControlName="title" placeholder="Título de la evidencia" />
            </label>

            <label class="field field--full">
              <span class="field__label">Detalle funcional</span>
              <textarea rows="4" formControlName="detail" placeholder="Detalle o referencia funcional"></textarea>
            </label>

            <label class="field">
              <span class="field__label">Fecha esperada</span>
              <input type="date" formControlName="expectedDate" />
            </label>

            <div class="form-actions">
              <button type="button" class="btn btn--ghost" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="saving() || loading()">
                @if (saving()) {
                  <span class="loading-spinner loading-spinner--sm"></span>
                }
                {{ editingEvidenceId() ? 'Actualizar' : 'Registrar' }}
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
    .page__header { display:flex; justify-content:space-between; gap:16px; align-items:center; margin-bottom:20px; flex-wrap:wrap; min-width:0; }
    .page__header-left { min-width:0; }
    .page__header h1 { margin:0; color:#1a1a2e; font-size:1.35rem; font-weight:700; line-height:1.2; letter-spacing:-0.01em; }
    .page__subtitle { margin:4px 0 0; color:#667085; font-size:0.82rem; line-height:1.5; }
    .page__actions { display:flex; gap:8px; flex-wrap:wrap; }

    /* ── Context bar ── */
    .context-bar { display:flex; align-items:stretch; gap:0; margin-bottom:16px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
    .context-bar__item { flex:1; padding:14px 18px; display:flex; flex-direction:column; gap:4px; min-width:0; }
    .context-bar__divider { width:1px; background:#e5e7eb; flex:0 0 1px; }
    .context-bar__label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:600; }
    .context-bar__value { color:#1a1a2e; font-size:0.84rem; font-weight:600; line-height:1.4; overflow-wrap:anywhere; word-break:break-word; }

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
    .card__title { margin:0; font-size:0.9rem; color:#1a1a2e; font-weight:700; line-height:1.3; }
    .card__desc { margin:2px 0 0; color:#8b95a5; font-size:0.74rem; line-height:1.4; }
    .card__count { font-size:0.76rem; color:#667085; font-weight:600; background:#f1f3f5; padding:4px 10px; border-radius:999px; white-space:nowrap; }

    /* ── Status badges ── */
    .status-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:999px; font-size:0.74rem; font-weight:600; line-height:1; background:#f0f1f3; color:#475467; }
    .status-badge--sm { padding:3px 10px; font-size:0.72rem; }
    .status-badge__dot { width:7px; height:7px; border-radius:50%; background:currentColor; flex:0 0 auto; }
    .status-badge--approved { background:#ecfdf5; color:#047857; }
    .status-badge--approved .status-badge__dot { background:#10b981; }
    .status-badge--observed { background:#fff7ed; color:#c2410c; }
    .status-badge--observed .status-badge__dot { background:#f97316; }

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
    table { width:100%; min-width:800px; border-collapse:collapse; }
    th, td { padding:11px 14px; text-align:left; border-bottom:1px solid #f1f3f5; vertical-align:middle; font-size:0.82rem; }
    th { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; background:#f8fafc; font-weight:600; }
    td { color:#344054; line-height:1.45; }
    .th--num, .td--num { width:42px; text-align:center; color:#8b95a5; font-weight:600; font-size:0.76rem; }
    .th--actions { text-align:right; }
    .td--title { font-weight:600; color:#1a1a2e; max-width:260px; overflow-wrap:anywhere; }
    .td--date { display:inline-flex; align-items:center; gap:5px; }
    .td--date-icon { width:14px; height:14px; fill:#8b95a5; flex:0 0 auto; }
    .td--comment { max-width:220px; color:#667085; font-size:0.78rem; overflow-wrap:anywhere; }
    tbody tr:hover { background:#fafbfc; }
    .actions-cell { display:flex; gap:6px; justify-content:flex-end; }

    /* ── Mobile cards ── */
    .mobile-cards { display:none; padding:12px; gap:10px; }
    .evidence-card { border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:14px; display:flex; flex-direction:column; gap:10px; }
    .evidence-card__top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .evidence-card__title { color:#1a1a2e; font-size:0.86rem; line-height:1.35; overflow-wrap:anywhere; }
    .evidence-card__meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .evidence-card__field { display:flex; flex-direction:column; gap:2px; }
    .evidence-card__field span { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; font-weight:600; }
    .evidence-card__field strong { color:#344054; font-size:0.78rem; font-weight:500; line-height:1.4; overflow-wrap:anywhere; }
    .evidence-card__actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }

    /* ── Pagination ── */
    .pagination { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 18px; border-top:1px solid #f1f3f5; flex-wrap:wrap; }
    .pagination__info { font-size:0.76rem; color:#667085; font-weight:500; }
    .pagination__controls { display:flex; align-items:center; gap:4px; }
    .pagination__page { font-size:0.78rem; color:#1a1a2e; font-weight:600; min-width:52px; text-align:center; }

    /* ── Form ── */
    .form-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; padding:4px 0 0; min-width:0; }
    .field { display:grid; gap:6px; min-width:0; }
    .field__label { font-size:0.78rem; color:#344054; font-weight:600; }
    .field__required { color:#dc2626; }
    .field--full, .form-actions { grid-column:1 / -1; }
    input, textarea, select { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px; padding:9px 12px; font:inherit; background:#fff; color:#1a1a2e; box-sizing:border-box; font-size:0.84rem; }
    input:focus, textarea:focus, select:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    textarea { resize:vertical; min-height:84px; max-width:100%; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:6px; min-width:0; }

    /* ── Modal ── */
    .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,0.35); z-index:90; backdrop-filter:blur(2px); }
    .modal { position:fixed; inset:50% auto auto 50%; transform:translate(-50%,-50%); width:min(640px, calc(100vw - 32px)); max-height:calc(100vh - 32px); overflow:auto; border-radius:14px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 20px 60px rgba(15,23,42,0.15); padding:22px; z-index:100; }
    .modal__header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:18px; }
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
      .evidence-card__meta { grid-template-columns:1fr; }
      .evidence-card__actions { grid-template-columns:1fr; }
      .pagination { flex-direction:column; align-items:center; }
    }
    @media (max-width: 560px) {
      .modal { width:calc(100vw - 16px); max-height:calc(100vh - 16px); padding:16px; border-radius:12px; }
    }
  `]
})
export class EvidenceListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly goalsService = inject(GoalsService);
  private readonly evidencesService = inject(EvidencesService);
  private readonly toastService = inject(UiToastService);

  readonly goal = signal<GoalDetail | null>(null);
  readonly evidences = signal<EvidenceSummary[]>([]);
  readonly editingEvidenceId = signal<number | null>(null);
  readonly modalOpen = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 5;
  readonly canManageEvidence = computed(() =>
    this.authService.featureAccess()?.canManageEvidences ?? false
  );

  readonly form = this.fb.group({
    title: ['', [Validators.required]],
    detail: [''],
    expectedDate: ['']
  });

  private goalId = 0;

  constructor() {
    this.goalId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.loadData();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.evidences().length / this.pageSize));
  }

  pagedEvidences(): EvidenceSummary[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.evidences().slice(start, start + this.pageSize);
  }

  currentPageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.evidences().length);
  }

  goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
  }

  openCreateModal(): void {
    if (!this.canManageEvidence()) {
      return;
    }
    this.editingEvidenceId.set(null);
    this.form.reset({ title: '', detail: '', expectedDate: '' });
    this.modalOpen.set(true);
  }

  openEditModal(evidenceId: number): void {
    if (!this.canManageEvidence()) {
      return;
    }
    this.evidencesService.getEvidence(evidenceId).subscribe({
      next: (evidence) => {
        this.editingEvidenceId.set(evidence.id);
        this.form.reset({
          title: evidence.title,
          detail: evidence.detail ?? '',
          expectedDate: evidence.expectedDate ?? ''
        });
        this.modalOpen.set(true);
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  openDetail(evidenceId: number): void {
    void this.router.navigate(['/dashboard/evidencias', evidenceId]);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingEvidenceId.set(null);
    this.saving.set(false);
  }

  saveEvidence(): void {
    if (!this.canManageEvidence()) {
      this.errorMessage.set('No cuenta con permisos para registrar o actualizar evidencias.');
      return;
    }
    if (this.form.invalid || !this.goalId) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Complete los campos requeridos de la evidencia.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: EvidenceUpsertRequest = {
      title: (raw.title ?? '').trim(),
      detail: (raw.detail ?? '').trim() || null,
      expectedDate: raw.expectedDate || null
    };

    this.saving.set(true);
    this.errorMessage.set('');
    const request$ = this.editingEvidenceId()
      ? this.evidencesService.updateEvidence(this.editingEvidenceId() as number, payload)
      : this.evidencesService.createEvidence(this.goalId, payload);

    request$.subscribe({
      next: () => {
        const editing = this.editingEvidenceId() !== null;
        this.toastService.success(
          editing ? 'Actualizacion exitosa' : 'Registro exitoso',
          editing ? 'La evidencia fue actualizada correctamente.' : 'La evidencia fue registrada correctamente.'
        );
        this.closeModal();
        this.loadEvidences();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.saving.set(false);
      }
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.goalsService.getGoal(this.goalId).subscribe({
      next: (goal: GoalDetail) => {
        this.goal.set(goal);
        this.loadEvidences();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  private loadEvidences(): void {
    this.evidencesService.listGoalEvidences(this.goalId).subscribe({
      next: (evidences: EvidenceSummary[]) => {
        this.evidences.set(evidences);
        if (this.currentPage() > Math.max(1, Math.ceil(evidences.length / this.pageSize))) {
          this.currentPage.set(1);
        }
        this.loading.set(false);
        this.saving.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
        this.saving.set(false);
      }
    });
  }
}
