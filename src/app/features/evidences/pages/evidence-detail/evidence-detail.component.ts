import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { resolveQualificationHistoryLabel } from '../../../../core/evidences/evidence-qualification.constants';
import {
  EvidenceDetail,
  EvidenceReview,
  EvidenceUpsertRequest
} from '../../../../core/evidences/evidences.models';
import { EvidencesService } from '../../../../core/evidences/evidences.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';

@Component({
  selector: 'app-evidence-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <!-- Breadcrumb navigation -->
      <nav class="breadcrumb" aria-label="Navegación">
        <a [routerLink]="cicloNavService.boardRoute()" class="breadcrumb__link">{{ cicloNavService.boardLabel() }}</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <a [routerLink]="backToGoalLink()" class="breadcrumb__link">Evidencias</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <span class="breadcrumb__current">Detalle</span>
      </nav>

      <!-- Page header -->
      <div class="page__header">
        <div class="page__header-left">
          <h1>Detalle de evidencia</h1>
          <p class="page__subtitle">Consulte el registro funcional, el historial de calificaciones y gestione la subsanación cuando corresponda.</p>
        </div>
        <a [routerLink]="backToGoalLink()" class="btn btn--outline-neutral btn--sm">
          <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.5 4.5 4 10l5.5 5.5 1.1-1.1-3.6-3.6H16v-1.6H7l3.6-3.6-1.1-1.1Z"/>
          </svg>
          Volver a evidencias
        </a>
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
          <span>Cargando evidencia...</span>
        </div>
      } @else if (evidence()) {

        <!-- Context strip: Meta + Evaluado + Estado -->
        <div class="context-bar">
          <div class="context-bar__item">
            <span class="context-bar__label">Meta asignada</span>
            <span class="context-bar__value">{{ evidence()!.goalTitle }}</span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item">
            <span class="context-bar__label">Servidor evaluado</span>
            <span class="context-bar__value">{{ evidence()!.evaluatedName }}</span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item context-bar__item--status">
            <span class="context-bar__label">Estado actual</span>
            <span class="status-badge"
                  [class.status-badge--approved]="evidence()!.statusCode === 'APPROVED'"
                  [class.status-badge--observed]="evidence()!.statusCode === 'OBSERVED'">
              <span class="status-badge__dot"></span>
              {{ evidence()!.statusName }}
            </span>
          </div>
        </div>

        <!-- Observed alert banner -->
        @if (evidence()!.statusCode === 'OBSERVED') {
          <div class="alert-banner" role="alert">
            <div class="alert-banner__body">
              <svg class="alert-banner__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
              </svg>
              <div>
                <strong>Esta evidencia tiene observaciones pendientes</strong>
                <p>Registre la subsanación requerida para que la evidencia pueda continuar su ciclo de evaluación.</p>
              </div>
            </div>
            @if (canUpdateEvidence()) {
              <button type="button" class="btn btn--primary btn--sm" (click)="openSubsanationModal()">
              Registrar subsanación
            </button>
            }
          </div>
        }

        <!-- Action bar -->
        @if (canUpdateEvidence() && evidence()!.statusCode === 'OBSERVED') {
        <div class="action-bar">
          <span class="action-bar__label">Acciones disponibles:</span>
          <div class="action-bar__buttons">
            <button type="button" class="btn btn--primary" (click)="openSubsanationModal()">
                <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 14.5V16h1.5l7.7-7.7-1.5-1.5L4 14.5Zm10.9-7.8a1.1 1.1 0 0 0 0-1.6l-1-1a1.1 1.1 0 0 0-1.6 0l-.8.8L14 7.5l.9-.8Z"/>
                </svg>
                Registrar subsanación
              </button>
          </div>
        </div>
        }

        <!-- Two-column layout: Ficha + Seguimiento -->
        <div class="content-grid">

          <!-- Panel: Registro funcional -->
          <article class="card">
            <header class="card__header">
              <div class="card__header-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4.7 10.8h10.6v-1.6H4.7v1.6Zm0-4h10.6V5.2H4.7v1.6Zm0 8h7.2v-1.6H4.7v1.6Z"/>
                </svg>
              </div>
              <div>
                <h2 class="card__title">Registro funcional</h2>
                <p class="card__desc">Datos operativos de la evidencia registrada.</p>
              </div>
            </header>

            <div class="field-list">
              <div class="field-item">
                <dt class="field-item__label">Título</dt>
                <dd class="field-item__value">{{ evidence()!.title }}</dd>
              </div>
              <div class="field-item">
                <dt class="field-item__label">Indicador</dt>
                <dd class="field-item__value">{{ evidence()!.indicatorName }}</dd>
              </div>
              <div class="field-item">
                <dt class="field-item__label">Detalle</dt>
                <dd class="field-item__value field-item__value--wrap">{{ evidence()!.detail || 'Sin detalle funcional' }}</dd>
              </div>
              <div class="field-item">
                <dt class="field-item__label">Fecha esperada</dt>
                <dd class="field-item__value">
                  <span class="field-item__date">
                    <svg class="field-item__date-icon" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M6 2v2H4.5A1.5 1.5 0 0 0 3 5.5v11A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 15.5 4H14V2h-2v2H8V2H6Zm-1 6h10v8.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V8Z"/>
                    </svg>
                    {{ evidence()!.expectedDate || 'Sin fecha definida' }}
                  </span>
                </dd>
              </div>
              @if (evidence()!.openCorrectiveActionDetail) {
                <div class="field-item field-item--highlight">
                  <dt class="field-item__label">Acción correctiva abierta</dt>
                  <dd class="field-item__value field-item__value--wrap">{{ evidence()!.openCorrectiveActionDetail }}</dd>
                </div>
              }
            </div>
          </article>

          <!-- Panel: Seguimiento -->
          <article class="card">
            <header class="card__header">
              <div class="card__header-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5A7.5 7.5 0 0 0 10 2.5Zm.8 7.8V6.2H9.2v4.8l3.2 1.9.8-1.3-2.4-1.3Z"/>
                </svg>
              </div>
              <div>
                <h2 class="card__title">Seguimiento</h2>
                <p class="card__desc">Historial de revisiones de esta evidencia.</p>
              </div>
            </header>

            <div class="tracking-summary">
              <div class="tracking-summary__stat">
                <span class="tracking-summary__number">{{ evidence()!.reviews.length }}</span>
                <span class="tracking-summary__text">{{ evidence()!.reviews.length === 1 ? 'revisión registrada' : 'revisiones registradas' }}</span>
              </div>
              @if (evidence()!.reviews.length) {
                <div class="tracking-summary__last">
                  <span class="tracking-summary__label">Última revisión:</span>
                  <span class="status-badge status-badge--sm"
                        [class.status-badge--approved]="evidence()!.reviews[0].statusCode === 'APPROVED'"
                        [class.status-badge--observed]="evidence()!.reviews[0].statusCode !== 'APPROVED'">
                    <span class="status-badge__dot"></span>
                    {{ evidence()!.reviews[0].statusName }}
                  </span>
                </div>
                @if (reviewQualificationDisplay(evidence()!.reviews[0]); as ql) {
                  <div class="tracking-summary__qual">
                    <span class="tracking-summary__label">Calificación:</span>
                    <span class="tracking-summary__qual-text">{{ ql }}</span>
                  </div>
                }
              }
            </div>

            <button type="button" class="btn btn--outline btn--full" (click)="openTrackingModal()">
              <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5A7.5 7.5 0 0 0 10 2.5Zm.8 7.8V6.2H9.2v4.8l3.2 1.9.8-1.3-2.4-1.3Z"/>
              </svg>
              Ver historial completo
            </button>

            <!-- Inline preview of last 2 reviews -->
            @if (evidence()!.reviews.length) {
              <div class="review-preview-list">
                @for (review of evidence()!.reviews.slice(0, 2); track review.id) {
                  <div class="review-preview">
                    <div class="review-preview__header">
                      <span class="status-badge status-badge--sm"
                            [class.status-badge--approved]="review.statusCode === 'APPROVED'"
                            [class.status-badge--observed]="review.statusCode !== 'APPROVED'">
                        <span class="status-badge__dot"></span>
                        {{ review.statusName }}
                      </span>
                      <span class="review-preview__date">{{ review.reviewedAt }}</span>
                    </div>
                    @if (reviewQualificationDisplay(review); as ql) {
                      <p class="review-preview__qual">{{ ql }}</p>
                    }
                    <p class="review-preview__comment">{{ review.comment || 'Sin comentario registrado.' }}</p>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state">
                <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5A7.5 7.5 0 0 0 10 2.5Zm.8 7.8V6.2H9.2v4.8l3.2 1.9.8-1.3-2.4-1.3Z"/>
                </svg>
                <p>Aún no hay revisiones registradas.</p>
              </div>
            }
          </article>
        </div>
      }

      <!-- Modal: Registrar subsanación -->
      @if (subsanationModalOpen() && evidence()?.statusCode === 'OBSERVED') {
        <div class="modal-backdrop" (click)="closeSubsanationModal()"></div>
        <section class="modal" role="dialog" aria-modal="true" aria-label="Registrar subsanación">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">Evidencias</p>
              <h2>Registrar subsanación</h2>
              <p class="modal__subtitle">Actualice la evidencia observada para continuar el seguimiento.</p>
            </div>
            <button type="button" class="modal__close" (click)="closeSubsanationModal()" aria-label="Cerrar modal">
              <svg viewBox="0 0 20 20"><path d="M14.3 5.7l-1-1L10 8l-3.3-3.3-1 1L9 9l-3.3 3.3 1 1L10 10l3.3 3.3 1-1L11 9l3.3-3.3Z"/></svg>
            </button>
          </div>

          <form [formGroup]="updateForm" (ngSubmit)="submitSubsanation()" class="form-grid">
            <label class="field">
              <span class="field__label">Título <span class="field__required">*</span></span>
              <input type="text" formControlName="title" />
            </label>

            <label class="field">
              <span class="field__label">Fecha esperada</span>
              <input type="date" formControlName="expectedDate" />
            </label>

            <label class="field field--full">
              <span class="field__label">Detalle funcional</span>
              <textarea rows="4" formControlName="detail"></textarea>
            </label>

            <div class="form-actions">
              <button type="button" class="btn btn--ghost" (click)="closeSubsanationModal()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="savingUpdate()">
                @if (savingUpdate()) {
                  <span class="loading-spinner loading-spinner--sm"></span>
                }
                <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 14.5V16h1.5l7.7-7.7-1.5-1.5L4 14.5Zm10.9-7.8a1.1 1.1 0 0 0 0-1.6l-1-1a1.1 1.1 0 0 0-1.6 0l-.8.8L14 7.5l.9-.8Z"/>
                </svg>
                Registrar subsanación
              </button>
            </div>
          </form>
        </section>
      }

      <!-- Modal: Seguimiento completo -->
      @if (trackingModalOpen()) {
        <div class="modal-backdrop" (click)="closeTrackingModal()"></div>
        <section class="modal modal--wide" role="dialog" aria-modal="true" aria-label="Seguimiento de evidencia">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">Evidencias</p>
              <h2>Historial de seguimiento</h2>
              <p class="modal__subtitle">Registro completo de revisiones y observaciones de la evidencia.</p>
            </div>
            <button type="button" class="modal__close" (click)="closeTrackingModal()" aria-label="Cerrar modal">
              <svg viewBox="0 0 20 20"><path d="M14.3 5.7l-1-1L10 8l-3.3-3.3-1 1L9 9l-3.3 3.3 1 1L10 10l3.3 3.3 1-1L11 9l3.3-3.3Z"/></svg>
            </button>
          </div>

          @if (pagedReviews().length) {
            <div class="tracking-table">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Estado</th>
                    <th>Calificación</th>
                    <th>Fecha</th>
                    <th>Comentario</th>
                    <th>Acción correctiva</th>
                  </tr>
                </thead>
                <tbody>
                  @for (review of pagedReviews(); track review.id; let i = $index) {
                    <tr>
                      <td class="tracking-table__num">{{ (trackingPage() - 1) * 4 + i + 1 }}</td>
                      <td>
                        <span class="status-badge status-badge--sm"
                              [class.status-badge--approved]="review.statusCode === 'APPROVED'"
                              [class.status-badge--observed]="review.statusCode !== 'APPROVED'">
                          <span class="status-badge__dot"></span>
                          {{ review.statusName }}
                        </span>
                      </td>
                      <td>{{ reviewQualificationDisplay(review) ?? '—' }}</td>
                      <td>{{ review.reviewedAt }}</td>
                      <td>{{ review.comment || 'Sin comentario registrado.' }}</td>
                      <td>{{ review.correctiveActionDetail || 'Sin acción correctiva' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="tracking-cards">
              @for (review of pagedReviews(); track review.id) {
                <article class="tracking-card">
                  <div class="tracking-card__row">
                    <span>Estado</span>
                    <strong>
                      <span class="status-badge status-badge--sm"
                            [class.status-badge--approved]="review.statusCode === 'APPROVED'"
                            [class.status-badge--observed]="review.statusCode !== 'APPROVED'">
                        <span class="status-badge__dot"></span>
                        {{ review.statusName }}
                      </span>
                    </strong>
                  </div>
                  <div class="tracking-card__row">
                    <span>Calificación</span>
                    <strong>{{ reviewQualificationDisplay(review) ?? '—' }}</strong>
                  </div>
                  <div class="tracking-card__row">
                    <span>Fecha</span>
                    <strong>{{ review.reviewedAt }}</strong>
                  </div>
                  <div class="tracking-card__row">
                    <span>Comentario</span>
                    <strong>{{ review.comment || 'Sin comentario registrado.' }}</strong>
                  </div>
                  <div class="tracking-card__row">
                    <span>Acción correctiva</span>
                    <strong>{{ review.correctiveActionDetail || 'Sin acción correctiva' }}</strong>
                  </div>
                </article>
              }
            </div>

            <div class="pagination">
              <button type="button" class="btn btn--ghost btn--sm" (click)="previousTrackingPage()" [disabled]="trackingPage() === 1">
                <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M12.5 15.5 7 10l5.5-5.5 1.1 1.1L9.2 10l4.4 4.4-1.1 1.1Z"/>
                </svg>
                Anterior
              </button>
              <span class="pagination__status">{{ trackingPage() }} de {{ trackingTotalPages() }}</span>
              <button type="button" class="btn btn--ghost btn--sm" (click)="nextTrackingPage()" [disabled]="trackingPage() === trackingTotalPages()">
                Siguiente
                <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M7.5 4.5 13 10l-5.5 5.5-1.1-1.1L10.8 10 6.4 5.6l1.1-1.1Z"/>
                </svg>
              </button>
            </div>
          } @else {
            <div class="empty-state empty-state--lg">
              <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5A7.5 7.5 0 0 0 10 2.5Zm.8 7.8V6.2H9.2v4.8l3.2 1.9.8-1.3-2.4-1.3Z"/>
              </svg>
              <p>Aún no hay revisiones registradas para esta evidencia.</p>
              <p class="empty-state__hint">Para calificar, use el botón <strong>Calificar</strong> en el listado de evidencias de la meta.</p>
            </div>
          }
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

    /* ── Context bar (Meta / Evaluado / Estado) ── */
    .context-bar {
      display:flex; align-items:stretch; gap:0; margin-bottom:16px;
      background:#fff; border:1px solid #e5e7eb; border-radius:12px;
      overflow:hidden;
    }
    .context-bar__item { flex:1; padding:14px 18px; display:flex; flex-direction:column; gap:4px; min-width:0; }
    .context-bar__item--status { flex:0 0 auto; min-width:160px; }
    .context-bar__divider { width:1px; background:#e5e7eb; flex:0 0 1px; }
    .context-bar__label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:600; }
    .context-bar__value { color:#1a1a2e; font-size:0.84rem; font-weight:600; line-height:1.4; overflow-wrap:anywhere; word-break:break-word; }

    /* ── Status badges ── */
    .status-badge {
      display:inline-flex; align-items:center; gap:6px;
      padding:4px 12px; border-radius:999px;
      font-size:0.76rem; font-weight:600; line-height:1;
      background:#f0f1f3; color:#475467;
    }
    .status-badge--sm { padding:3px 10px; font-size:0.72rem; }
    .status-badge__dot { width:7px; height:7px; border-radius:50%; background:currentColor; flex:0 0 auto; }
    .status-badge--approved { background:#ecfdf5; color:#047857; }
    .status-badge--approved .status-badge__dot { background:#10b981; }
    .status-badge--observed { background:#fff7ed; color:#c2410c; }
    .status-badge--observed .status-badge__dot { background:#f97316; }

    /* ── Alert banner (observed) ── */
    .alert-banner {
      display:flex; align-items:center; justify-content:space-between; gap:16px;
      padding:14px 18px; margin-bottom:16px; border-radius:12px;
      background:#fff7ed; border:1px solid #fed7aa;
    }
    .alert-banner__body { display:flex; align-items:flex-start; gap:12px; min-width:0; }
    .alert-banner__icon { width:20px; height:20px; fill:#ea580c; flex:0 0 auto; margin-top:1px; }
    .alert-banner__body strong { display:block; color:#9a3412; font-size:0.82rem; line-height:1.3; margin-bottom:2px; }
    .alert-banner__body p { margin:0; color:#78553a; font-size:0.78rem; line-height:1.45; }

    /* ── Alert inline (error) ── */
    .alert { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; margin-bottom:16px; font-size:0.82rem; }
    .alert--error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
    .alert__icon { width:18px; height:18px; fill:currentColor; flex:0 0 auto; }

    /* ── Loading state ── */
    .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 16px; color:#667085; font-size:0.84rem; }
    .loading-spinner {
      width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#7f1714;
      border-radius:50%; animation:spin 0.7s linear infinite;
    }
    .loading-spinner--sm { width:14px; height:14px; border-width:2px; border-color:rgba(255,255,255,0.3); border-top-color:#fff; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Action bar ── */
    .action-bar {
      display:flex; align-items:center; gap:12px; margin-bottom:20px;
      padding:12px 16px; border-radius:10px; background:#f8fafc; border:1px solid #e5e7eb;
    }
    .action-bar__label { font-size:0.76rem; color:#667085; font-weight:500; white-space:nowrap; }
    .action-bar__buttons { display:flex; gap:8px; flex-wrap:wrap; }

    /* ── Buttons ── */
    .btn {
      display:inline-flex; align-items:center; justify-content:center; gap:7px;
      min-height:36px; padding:0 16px; border-radius:8px;
      font-size:0.8rem; font-weight:600; cursor:pointer;
      transition:all 0.15s ease; text-decoration:none; border:none; white-space:nowrap;
    }
    .btn__icon { width:15px; height:15px; fill:currentColor; flex:0 0 auto; }
    .btn--sm { min-height:32px; padding:0 12px; font-size:0.78rem; }
    .btn--full { width:100%; }

    .btn--primary {
      background:#7f1714; color:#fff;
      box-shadow:0 1px 3px rgba(127,23,20,0.2);
    }
    .btn--primary:hover { background:#951c18; box-shadow:0 2px 6px rgba(127,23,20,0.25); }
    .btn--primary:active { background:#6b1310; box-shadow:none; }
    .btn--primary:disabled { opacity:0.6; cursor:not-allowed; box-shadow:none; }

    .btn--outline {
      background:#fff; color:#7f1714; border:1px solid rgba(127,23,20,0.2);
    }
    .btn--outline:hover { background:rgba(127,23,20,0.04); border-color:rgba(127,23,20,0.3); }

    .btn--outline-neutral {
      background:#fff; color:#475467; border:1px solid #d0d5dd;
    }
    .btn--outline-neutral:hover { background:#f9fafb; border-color:#98a2b3; }

    .btn--ghost {
      background:transparent; color:#475467; border:1px solid #e5e7eb;
    }
    .btn--ghost:hover { background:#f9fafb; }
    .btn--ghost:disabled { opacity:0.5; cursor:not-allowed; }

    /* ── Content grid (two columns) ── */
    .content-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; min-width:0; }

    /* ── Card panels ── */
    .card {
      border-radius:12px; background:#fff; border:1px solid #e5e7eb;
      box-shadow:0 1px 3px rgba(0,0,0,0.04); padding:0; display:flex; flex-direction:column;
      min-width:0; overflow:hidden;
    }
    .card__header {
      display:flex; align-items:flex-start; gap:12px;
      padding:16px 18px 12px; border-bottom:1px solid #f1f3f5;
    }
    .card__header-icon {
      width:32px; height:32px; border-radius:8px;
      background:rgba(127,23,20,0.06); display:grid; place-items:center; flex:0 0 auto;
    }
    .card__header-icon svg { width:16px; height:16px; fill:#7f1714; }
    .card__title { margin:0; font-size:0.9rem; color:#1a1a2e; font-weight:700; line-height:1.3; }
    .card__desc { margin:2px 0 0; color:#8b95a5; font-size:0.74rem; line-height:1.4; }

    /* ── Field list (detail rows) ── */
    .field-list { padding:4px 0; }
    .field-item {
      display:flex; justify-content:space-between; align-items:baseline; gap:16px;
      padding:10px 18px; border-bottom:1px solid #f5f6f8;
    }
    .field-item:last-child { border-bottom:none; }
    .field-item--highlight { background:#fffbeb; }
    .field-item__label {
      font-size:0.74rem; color:#8b95a5; font-weight:600; text-transform:uppercase;
      letter-spacing:0.05em; flex:0 0 auto; min-width:110px;
    }
    .field-item__value {
      color:#1a1a2e; font-size:0.82rem; font-weight:500; line-height:1.45;
      text-align:right; min-width:0;
    }
    .field-item__value--wrap { overflow-wrap:anywhere; word-break:break-word; }
    .field-item__date { display:inline-flex; align-items:center; gap:5px; }
    .field-item__date-icon { width:14px; height:14px; fill:#8b95a5; flex:0 0 auto; }

    /* ── Tracking summary ── */
    .tracking-summary {
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      padding:14px 18px; border-bottom:1px solid #f1f3f5;
      flex-wrap:wrap;
    }
    .tracking-summary__stat { display:flex; align-items:baseline; gap:6px; }
    .tracking-summary__number { font-size:1.4rem; font-weight:800; color:#1a1a2e; line-height:1; }
    .tracking-summary__text { font-size:0.78rem; color:#667085; font-weight:500; }
    .tracking-summary__last { display:flex; align-items:center; gap:8px; }
    .tracking-summary__label { font-size:0.74rem; color:#8b95a5; font-weight:500; }
    .tracking-summary__qual { display:flex; flex-direction:column; align-items:flex-end; gap:2px; text-align:right; }
    .tracking-summary__qual-text { font-size:0.78rem; font-weight:600; color:#344054; max-width:260px; line-height:1.35; }

    /* ── Review preview list ── */
    .review-preview-list { padding:0; }
    .review-preview { padding:12px 18px; border-top:1px solid #f5f6f8; }
    .review-preview__header { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px; }
    .review-preview__qual { margin:0 0 6px; font-size:0.76rem; font-weight:600; color:#1a1a2e; line-height:1.35; overflow-wrap:anywhere; }
    .review-preview__date { font-size:0.72rem; color:#8b95a5; }
    .review-preview__comment { margin:0; font-size:0.78rem; color:#475467; line-height:1.45; overflow-wrap:anywhere; }

    .btn--full { margin:12px 18px; width:calc(100% - 36px); }

    /* ── Empty state ── */
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:24px 18px; text-align:center; }
    .empty-state--lg { padding:40px 18px; }
    .empty-state__icon { width:28px; height:28px; fill:#c4ccd6; }
    .empty-state p { margin:0; color:#8b95a5; font-size:0.82rem; }
    .empty-state__hint { margin:10px 0 0; font-size:0.78rem; color:#667085; line-height:1.45; max-width:400px; text-align:center; }

    /* ── Form styles ── */
    .form-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; padding:4px 0 0; min-width:0; }
    .field { display:grid; gap:6px; min-width:0; }
    .field__label { font-size:0.78rem; color:#344054; font-weight:600; }
    .field__required { color:#dc2626; }
    .field--full, .form-actions { grid-column:1 / -1; }

    input, textarea, select {
      width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px;
      padding:9px 12px; font:inherit; background:#fff; color:#1a1a2e;
      box-sizing:border-box; font-size:0.84rem;
    }
    input:focus, textarea:focus, select:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    textarea { resize:vertical; min-height:84px; max-width:100%; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:6px; min-width:0; }

    /* ── Modal ── */
    .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,0.35); z-index:90; backdrop-filter:blur(2px); }
    .modal {
      position:fixed; inset:50% auto auto 50%; transform:translate(-50%,-50%);
      width:min(640px, calc(100vw - 32px)); max-height:calc(100vh - 32px);
      overflow:auto; border-radius:14px; background:#fff;
      border:1px solid #e5e7eb; box-shadow:0 20px 60px rgba(15,23,42,0.15);
      padding:22px; z-index:100;
    }
    .modal--wide { width:min(920px, calc(100vw - 32px)); }
    .modal__header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:18px; }
    .modal__eyebrow { margin:0 0 4px; font-size:0.68rem; font-weight:700; letter-spacing:0.08em; color:#8b95a5; text-transform:uppercase; }
    .modal__header h2 { margin:0; font-size:1.05rem; color:#1a1a2e; font-weight:700; }
    .modal__subtitle { margin:4px 0 0; color:#667085; font-size:0.78rem; line-height:1.5; }
    .modal__close {
      border:none; background:transparent; color:#8b95a5;
      width:32px; height:32px; border-radius:8px; cursor:pointer;
      display:inline-grid; place-items:center; padding:0;
    }
    .modal__close svg { width:16px; height:16px; fill:currentColor; }
    .modal__close:hover { background:#f1f3f5; color:#475467; }

    /* ── Tracking table ── */
    .tracking-table { display:block; width:100%; overflow-x:auto; border:1px solid #e5e7eb; border-radius:10px; }
    .tracking-table table { width:100%; min-width:860px; border-collapse:collapse; }
    .tracking-table th, .tracking-table td {
      padding:11px 14px; text-align:left; border-bottom:1px solid #f1f3f5;
      vertical-align:top; font-size:0.82rem; color:#344054; line-height:1.45;
    }
    .tracking-table th { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; background:#f8fafc; font-weight:600; }
    .tracking-table__num { color:#8b95a5; font-weight:600; font-size:0.76rem; width:40px; }
    .tracking-table tbody tr:hover { background:#fafbfc; }

    /* ── Tracking cards (mobile) ── */
    .tracking-cards { display:none; gap:10px; }
    .tracking-card { border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:14px; display:grid; gap:10px; }
    .tracking-card__row { display:grid; gap:3px; }
    .tracking-card__row span { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; font-weight:600; }
    .tracking-card__row strong { color:#1a1a2e; font-size:0.82rem; line-height:1.45; overflow-wrap:anywhere; word-break:break-word; }

    /* ── Pagination ── */
    .pagination { display:flex; align-items:center; justify-content:center; gap:12px; margin-top:16px; flex-wrap:wrap; }
    .pagination__status { color:#667085; font-size:0.8rem; font-weight:600; min-width:60px; text-align:center; }

    /* ── Responsive ── */
    @media (max-width: 920px) {
      .page { padding:16px 18px 24px; }
      .content-grid { grid-template-columns:1fr; }
      .form-grid { grid-template-columns:1fr; }
    }
    @media (max-width: 720px) {
      .page { padding:14px 14px 20px; }
      .page__header { flex-direction:column; align-items:stretch; gap:12px; }
      .context-bar { flex-direction:column; gap:0; }
      .context-bar__divider { width:100%; height:1px; }
      .context-bar__item--status { min-width:0; }
      .alert-banner { flex-direction:column; align-items:stretch; }
      .action-bar { flex-direction:column; align-items:stretch; }
      .action-bar__buttons { flex-direction:column; }
      .action-bar__buttons .btn { width:100%; }
      .form-actions { flex-direction:column; }
      .form-actions .btn { width:100%; }
      .field-item { flex-direction:column; gap:4px; }
      .field-item__value { text-align:left; }
      .pagination > * { flex:1; }
      .pagination__status { text-align:center; }
    }
    @media (max-width: 480px) {
      .page__header h1 { font-size:1.18rem; }
      .card__header { padding:14px 14px 10px; }
      .field-item { padding:9px 14px; }
      .tracking-summary { padding:12px 14px; }
      .review-preview { padding:10px 14px; }
      .btn--full { margin:10px 14px; width:calc(100% - 28px); }
      .modal { width:calc(100vw - 16px); max-height:calc(100vh - 16px); padding:16px; border-radius:12px; }
      .tracking-table { display:none; }
      .tracking-cards { display:grid; }
    }
    @media (min-width: 481px) {
      .tracking-table { display:block; }
      .tracking-cards { display:none; }
    }
  `]
})
export class EvidenceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly evidencesService = inject(EvidencesService);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

  readonly evidence = signal<EvidenceDetail | null>(null);
  readonly loading = signal(true);
  readonly savingUpdate = signal(false);
  readonly subsanationModalOpen = signal(false);
  readonly trackingModalOpen = signal(false);
  readonly trackingPage = signal(1);
  readonly errorMessage = signal('');
  readonly canUpdateEvidence = computed(() =>
    this.authService.featureAccess()?.canManageEvidences ?? false
  );

  readonly updateForm = this.fb.group({
    title: ['', [Validators.required]],
    detail: [''],
    expectedDate: ['']
  });

  private evidenceId = 0;

  constructor() {
    this.evidenceId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.loadEvidence();
  }

  openSubsanationModal(): void {
    if (!this.canUpdateEvidence() || this.evidence()?.statusCode !== 'OBSERVED') {
      return;
    }

    this.subsanationModalOpen.set(true);
  }

  closeSubsanationModal(): void {
    this.subsanationModalOpen.set(false);
  }

  openTrackingModal(): void {
    this.trackingPage.set(1);
    this.trackingModalOpen.set(true);
  }

  closeTrackingModal(): void {
    this.trackingModalOpen.set(false);
  }

  pagedReviews() {
    const reviews = this.evidence()?.reviews ?? [];
    const pageSize = 4;
    const start = (this.trackingPage() - 1) * pageSize;
    return reviews.slice(start, start + pageSize);
  }

  trackingTotalPages(): number {
    const total = this.evidence()?.reviews.length ?? 0;
    return Math.max(1, Math.ceil(total / 4));
  }

  previousTrackingPage(): void {
    this.trackingPage.update((page) => Math.max(1, page - 1));
  }

  nextTrackingPage(): void {
    this.trackingPage.update((page) => Math.min(this.trackingTotalPages(), page + 1));
  }

  backToGoalLink(): string[] {
    const goalId = this.evidence()?.goalId;
    return goalId
      ? this.cicloNavService.moduleRoute('metas', String(goalId), 'evidencias')
      : this.cicloNavService.moduleRoute('metas');
  }

  reviewQualificationDisplay(review: EvidenceReview): string | null {
    return resolveQualificationHistoryLabel({
      qualificationName: review.qualificationName,
      qualificationCode: review.qualificationCode
    });
  }

  submitSubsanation(): void {
    if (!this.canUpdateEvidence()) {
      this.errorMessage.set('No cuenta con permisos para actualizar evidencias.');
      return;
    }
    if (this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      this.errorMessage.set('Complete la informacion minima para la subsanacion.');
      return;
    }

    const raw = this.updateForm.getRawValue();
    const currentEvidence = this.evidence();
    const payload: EvidenceUpsertRequest = {
      title: (raw.title ?? '').trim(),
      detail: (raw.detail ?? '').trim() || null,
      evidenceTypeCode: currentEvidence?.evidenceTypeCode ?? 'AVANCE',
      expectedFormatCode: currentEvidence?.expectedFormatCode ?? 'OTRO',
      expectedDate: raw.expectedDate || null
    };

    this.savingUpdate.set(true);
    this.errorMessage.set('');
    this.evidencesService.updateEvidence(this.evidenceId, payload).subscribe({
      next: (evidence) => {
        this.evidence.set(evidence);
        this.patchUpdateForm(evidence);
        this.savingUpdate.set(false);
        this.closeSubsanationModal();
        this.toastService.success('Subsanacion exitosa', 'La evidencia fue actualizada correctamente.');
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.savingUpdate.set(false);
      }
    });
  }

  private loadEvidence(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.evidencesService.getEvidence(this.evidenceId).subscribe({
      next: (evidence) => {
        this.evidence.set(evidence);
        this.patchUpdateForm(evidence);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  private patchUpdateForm(evidence: EvidenceDetail): void {
    this.updateForm.reset({
      title: evidence.title,
      detail: evidence.detail ?? '',
      expectedDate: evidence.expectedDate ?? ''
    });
  }
}
