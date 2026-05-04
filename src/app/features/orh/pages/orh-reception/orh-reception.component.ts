import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserSessionResponse } from '../../../../core/auth/auth.models';
import {
  OrhGoalChangeRequestItemResponse,
  OrhGoalSubmissionItemResponse,
  ReviewOrhReceptionRequest
} from '../../../../core/orh/orh-reception.models';
import { OrhReceptionService } from '../../../../core/orh/orh-reception.service';

type ReceptionTab = 'changeRequests' | 'submissions';
type ReviewTarget =
  | { type: 'changeRequest'; item: OrhGoalChangeRequestItemResponse }
  | { type: 'submission'; item: OrhGoalSubmissionItemResponse };

@Component({
  selector: 'app-orh-reception',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="workspace">
      <div class="workspace__container">
        <nav class="breadcrumb" aria-label="Ruta de navegacion">
          <a routerLink="/dashboard">Dashboard</a>
          <span>/</span>
          <span>Recepcion ORH</span>
        </nav>

        <header class="workspace__hero">
          <div>
            <p class="workspace__eyebrow">ORH institucional</p>
            <h1 class="workspace__title">Recepcion ORH</h1>
            <p class="workspace__subtitle">
              Consulta inicial de solicitudes y envios recibidos para revision institucional.
            </p>
          </div>

          <a routerLink="/dashboard" class="button button--secondary">Volver al dashboard</a>
        </header>

        @if (profile(); as currentProfile) {
          <section class="context-bar" aria-label="Contexto operativo">
            <div class="context-bar__item">
              <span class="context-bar__label">Ciclo activo</span>
              <span class="context-bar__value">{{ currentProfile.context.cycleName || 'Sin ciclo activo' }}</span>
            </div>
            <div class="context-bar__divider"></div>
            <div class="context-bar__item">
              <span class="context-bar__label">Actor funcional</span>
              <span class="context-bar__value">{{ currentProfile.context.functionalActor }}</span>
            </div>
            <div class="context-bar__divider"></div>
            <div class="context-bar__item">
              <span class="context-bar__label">Unidad organica</span>
              <span class="context-bar__value">{{ currentProfile.context.orgUnitName || 'Sin unidad vinculada' }}</span>
            </div>
          </section>
        }

        @if (errorMessage()) {
          <div class="alert alert--error" role="alert">
            <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        @if (successMessage()) {
          <div class="alert alert--success" role="status">
            <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm3.8 5.9-4.4 4.4-2.2-2.2-1.1 1.1 3.3 3.3 5.5-5.5-1.1-1.1Z"/>
            </svg>
            <span>{{ successMessage() }}</span>
          </div>
        }

        <section class="reception-panel">
          <div class="reception-panel__header">
            <div>
              <p class="reception-panel__eyebrow">Bandeja de lectura</p>
              <h2 class="reception-panel__title">Registros recibidos</h2>
              <p class="reception-panel__desc">
                La recepcion ORH se muestra en secciones separadas. Esta version solo permite dejar constancia
                minima de revision, sin aprobar, rechazar ni atender el fondo del registro.
              </p>
            </div>
          </div>

          <div class="tabs" role="tablist" aria-label="Secciones de recepcion ORH">
            <button
              type="button"
              role="tab"
              [class.tabs__button--active]="activeTab() === 'changeRequests'"
              [attr.aria-selected]="activeTab() === 'changeRequests'"
              (click)="setActiveTab('changeRequests')"
            >
              Solicitudes de modificacion
              <span>{{ changeRequests().length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              [class.tabs__button--active]="activeTab() === 'submissions'"
              [attr.aria-selected]="activeTab() === 'submissions'"
              (click)="setActiveTab('submissions')"
            >
              Envios a ORH
              <span>{{ submissions().length }}</span>
            </button>
          </div>

          @if (loading()) {
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <span>Cargando recepcion ORH...</span>
            </div>
          } @else if (activeTab() === 'changeRequests') {
            @if (changeRequests().length === 0) {
              <div class="empty-state">
                <strong>No hay solicitudes de modificacion pendientes.</strong>
                <span>Cuando existan solicitudes activas del ciclo, apareceran en esta seccion.</span>
              </div>
            } @else {
              <div class="data-table" role="region" aria-label="Solicitudes de modificacion">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Meta</th>
                      <th>Evaluado</th>
                      <th>Tipo</th>
                      <th>Solicitante</th>
                      <th>Estado</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of changeRequests(); track item.id) {
                      <tr>
                        <td>{{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                        <td>
                          <div class="primary-cell">
                            <strong>{{ item.goalTitle || 'Sin meta' }}</strong>
                            <span>{{ item.indicatorName || 'Sin indicador' }}</span>
                          </div>
                        </td>
                        <td>{{ item.evaluatedName || 'Sin evaluado' }}</td>
                        <td>{{ item.requestTypeName || item.requestType }}</td>
                        <td>{{ item.requestedByUsername || 'Sin usuario' }}</td>
                        <td>
                          <span [class]="changeRequestStatusClass(item.status)">
                            {{ item.statusName || item.status }}
                          </span>
                        </td>
                        <td>
                          @if (canReviewChangeRequest(item)) {
                            <button
                              class="button button--action"
                              type="button"
                              (click)="openReviewModal('changeRequest', item)"
                            >
                              Marcar como revisado
                            </button>
                          } @else {
                            <span class="muted-text">Sin accion</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="cards-list" aria-label="Solicitudes de modificacion">
                @for (item of changeRequests(); track item.id) {
                  <article class="record-card">
                    <div class="record-card__header">
                      <div>
                        <span class="record-card__date">{{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                        <h3>{{ item.goalTitle || 'Sin meta' }}</h3>
                      </div>
                      <span [class]="changeRequestStatusClass(item.status)">
                        {{ item.statusName || item.status }}
                      </span>
                    </div>
                    <dl class="record-card__details">
                      <div>
                        <dt>Evaluado</dt>
                        <dd>{{ item.evaluatedName || 'Sin evaluado' }}</dd>
                      </div>
                      <div>
                        <dt>Tipo</dt>
                        <dd>{{ item.requestTypeName || item.requestType }}</dd>
                      </div>
                      <div>
                        <dt>Solicitante</dt>
                        <dd>{{ item.requestedByUsername || 'Sin usuario' }}</dd>
                      </div>
                      <div>
                        <dt>Indicador</dt>
                        <dd>{{ item.indicatorName || 'Sin indicador' }}</dd>
                      </div>
                    </dl>
                    @if (canReviewChangeRequest(item)) {
                      <button
                        class="button button--action"
                        type="button"
                        (click)="openReviewModal('changeRequest', item)"
                      >
                        Marcar como revisado
                      </button>
                    }
                  </article>
                }
              </div>
            }
          } @else {
            @if (submissions().length === 0) {
              <div class="empty-state">
                <strong>No hay envios a ORH recibidos.</strong>
                <span>Cuando existan remisiones activas del ciclo, apareceran en esta seccion.</span>
              </div>
            } @else {
              <div class="data-table" role="region" aria-label="Envios a ORH">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Meta</th>
                      <th>Evaluado</th>
                      <th>Enviado por</th>
                      <th>Actor</th>
                      <th>Estado</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of submissions(); track item.id) {
                      <tr>
                        <td>{{ item.submittedAt | date:'dd/MM/yyyy HH:mm' }}</td>
                        <td>
                          <div class="primary-cell">
                            <strong>{{ item.goalTitle || 'Sin meta' }}</strong>
                            <span>{{ item.indicatorName || 'Sin indicador' }}</span>
                          </div>
                        </td>
                        <td>{{ item.evaluatedName || 'Sin evaluado' }}</td>
                        <td>{{ item.submittedByUsername || 'Sin usuario' }}</td>
                        <td>{{ item.submittedFunctionalActor || 'Sin actor' }}</td>
                        <td>
                          <span [class]="submissionStatusClass(item.status)">
                            {{ item.statusName || item.status }}
                          </span>
                        </td>
                        <td>
                          @if (canReviewSubmission(item)) {
                            <button
                              class="button button--action"
                              type="button"
                              (click)="openReviewModal('submission', item)"
                            >
                              Marcar como revisado
                            </button>
                          } @else {
                            <span class="muted-text">Sin accion</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="cards-list" aria-label="Envios a ORH">
                @for (item of submissions(); track item.id) {
                  <article class="record-card">
                    <div class="record-card__header">
                      <div>
                        <span class="record-card__date">{{ item.submittedAt | date:'dd/MM/yyyy HH:mm' }}</span>
                        <h3>{{ item.goalTitle || 'Sin meta' }}</h3>
                      </div>
                      <span [class]="submissionStatusClass(item.status)">
                        {{ item.statusName || item.status }}
                      </span>
                    </div>
                    <dl class="record-card__details">
                      <div>
                        <dt>Evaluado</dt>
                        <dd>{{ item.evaluatedName || 'Sin evaluado' }}</dd>
                      </div>
                      <div>
                        <dt>Enviado por</dt>
                        <dd>{{ item.submittedByUsername || 'Sin usuario' }}</dd>
                      </div>
                      <div>
                        <dt>Actor</dt>
                        <dd>{{ item.submittedFunctionalActor || 'Sin actor' }}</dd>
                      </div>
                      <div>
                        <dt>Indicador</dt>
                        <dd>{{ item.indicatorName || 'Sin indicador' }}</dd>
                      </div>
                    </dl>
                    @if (canReviewSubmission(item)) {
                      <button
                        class="button button--action"
                        type="button"
                        (click)="openReviewModal('submission', item)"
                      >
                        Marcar como revisado
                      </button>
                    }
                  </article>
                }
              </div>
            }
          }
        </section>

        @if (reviewTarget(); as target) {
          <div class="modal-backdrop" role="presentation">
            <section
              class="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-modal-title"
            >
              <div class="modal__header">
                <div>
                  <p class="modal__eyebrow">Revision ORH</p>
                  <h2 id="review-modal-title">Marcar como revisado</h2>
                </div>
                <button
                  class="modal__close"
                  type="button"
                  aria-label="Cerrar"
                  [disabled]="reviewSubmitting()"
                  (click)="closeReviewModal()"
                >
                  x
                </button>
              </div>

              <div class="modal__context">
                <div>
                  <span>Tipo de registro</span>
                  <strong>{{ reviewTypeLabel(target) }}</strong>
                </div>
                <div>
                  <span>Meta</span>
                  <strong>{{ reviewGoalTitle(target) }}</strong>
                </div>
                <div>
                  <span>Evaluado</span>
                  <strong>{{ reviewEvaluatedName(target) }}</strong>
                </div>
                <div>
                  <span>Fecha principal</span>
                  <strong>{{ reviewDate(target) | date:'dd/MM/yyyy HH:mm' }}</strong>
                </div>
                <div>
                  <span>Estado actual</span>
                  <strong>{{ reviewStatusLabel(target) }}</strong>
                </div>
              </div>

              @if (reviewError()) {
                <div class="alert alert--error modal__alert" role="alert">
                  <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                  </svg>
                  <span>{{ reviewError() }}</span>
                </div>
              }

              <form class="modal__form" (submit)="submitReview($event)">
                <p class="modal__help">
                  Esta accion solo registra que ORH reviso el registro. No aprueba, rechaza ni resuelve el fondo.
                </p>

                <label class="form-field" for="orh-review-comment">
                  <span>Comentario ORH opcional</span>
                  <textarea
                    id="orh-review-comment"
                    rows="4"
                    maxlength="1000"
                    placeholder="Agregue un comentario breve si corresponde."
                    [value]="reviewComment()"
                    [disabled]="reviewSubmitting()"
                    (input)="updateReviewComment($event)"
                  ></textarea>
                </label>

                <div class="modal__actions">
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="reviewSubmitting()"
                    (click)="closeReviewModal()"
                  >
                    Cancelar
                  </button>
                  <button
                    class="button button--primary"
                    type="submit"
                    [disabled]="!canSubmitReview()"
                  >
                    {{ reviewSubmitting() ? 'Registrando...' : 'Confirmar revision' }}
                  </button>
                </div>
              </form>
            </section>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      width: 100%;
    }

    .workspace {
      min-height: 100%;
      padding: 28px 0 40px;
      width: 100%;
    }

    .workspace__container {
      display: grid;
      gap: 18px;
      margin: 0 auto;
      width: min(100% - 40px, 1180px);
    }

    .breadcrumb {
      align-items: center;
      color: #64748b;
      display: flex;
      flex-wrap: wrap;
      font-size: 0.82rem;
      gap: 8px;
    }

    .breadcrumb a {
      color: #7f1714;
      font-weight: 700;
      text-decoration: none;
    }

    .workspace__hero {
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }

    .workspace__eyebrow,
    .reception-panel__eyebrow {
      color: #7f1714;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .workspace__title {
      color: #0f172a;
      font-size: clamp(1.35rem, 2.4vw, 2rem);
      line-height: 1.15;
      margin: 0;
    }

    .workspace__subtitle {
      color: #64748b;
      font-size: 0.92rem;
      line-height: 1.55;
      margin: 8px 0 0;
      max-width: 760px;
    }

    .button {
      align-items: center;
      border-radius: 8px;
      display: inline-flex;
      font-size: 0.86rem;
      font-weight: 800;
      justify-content: center;
      min-height: 38px;
      padding: 9px 14px;
      text-decoration: none;
      white-space: nowrap;
    }

    .button--secondary {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }

    .button--primary,
    .button--action {
      background: #7f1714;
      border: 1px solid #7f1714;
      color: #ffffff;
    }

    .button--action {
      cursor: pointer;
      font-size: 0.78rem;
      min-height: 32px;
      padding: 7px 10px;
      white-space: normal;
    }

    .button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .context-bar {
      align-items: stretch;
      background: #ffffff;
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      display: flex;
      overflow: hidden;
    }

    .context-bar__item {
      display: grid;
      flex: 1;
      gap: 4px;
      min-width: 0;
      padding: 14px 16px;
    }

    .context-bar__divider {
      background: #e2e8f0;
      flex: 0 0 1px;
      width: 1px;
    }

    .context-bar__label {
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .context-bar__value {
      color: #0f172a;
      font-size: 0.9rem;
      font-weight: 750;
      overflow-wrap: anywhere;
    }

    .alert {
      align-items: center;
      border-radius: 8px;
      display: flex;
      font-size: 0.86rem;
      gap: 10px;
      padding: 12px 14px;
    }

    .alert--error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .alert--success {
      background: #ecfdf3;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    .alert__icon {
      fill: currentColor;
      flex: 0 0 auto;
      height: 18px;
      width: 18px;
    }

    .reception-panel {
      background: #ffffff;
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }

    .reception-panel__header {
      border-bottom: 1px solid #e2e8f0;
      padding: 18px 20px;
    }

    .reception-panel__title {
      color: #0f172a;
      font-size: 1.1rem;
      margin: 0;
    }

    .reception-panel__desc {
      color: #64748b;
      font-size: 0.86rem;
      line-height: 1.5;
      margin: 8px 0 0;
      max-width: 760px;
    }

    .tabs {
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
      padding: 12px 16px;
    }

    .tabs button {
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #334155;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 800;
      gap: 8px;
      min-height: 36px;
      padding: 8px 12px;
    }

    .tabs button span {
      background: #f1f5f9;
      border-radius: 999px;
      color: #475569;
      font-size: 0.74rem;
      padding: 2px 7px;
    }

    .tabs__button--active {
      background: #7f1714 !important;
      border-color: #7f1714 !important;
      color: #ffffff !important;
    }

    .tabs__button--active span {
      background: rgba(255, 255, 255, 0.18) !important;
      color: #ffffff !important;
    }

    .loading-state,
    .empty-state {
      align-items: center;
      color: #64748b;
      display: grid;
      font-size: 0.9rem;
      gap: 8px;
      justify-items: center;
      padding: 42px 18px;
      text-align: center;
    }

    .loading-spinner {
      animation: spin 0.7s linear infinite;
      border: 2px solid #e2e8f0;
      border-radius: 50%;
      border-top-color: #7f1714;
      height: 20px;
      width: 20px;
    }

    .empty-state strong {
      color: #0f172a;
    }

    .data-table {
      overflow-x: auto;
    }

    table {
      border-collapse: collapse;
      min-width: 860px;
      width: 100%;
    }

    th {
      background: #f8fafc;
      color: #475569;
      font-size: 0.74rem;
      font-weight: 850;
      padding: 12px 14px;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    td {
      border-top: 1px solid #e2e8f0;
      color: #0f172a;
      font-size: 0.86rem;
      padding: 13px 14px;
      vertical-align: top;
    }

    .primary-cell {
      display: grid;
      gap: 4px;
      min-width: 240px;
    }

    .primary-cell strong {
      color: #0f172a;
      line-height: 1.35;
    }

    .primary-cell span {
      color: #64748b;
      font-size: 0.78rem;
      line-height: 1.35;
    }

    .status-badge {
      border-radius: 999px;
      display: inline-flex;
      font-size: 0.72rem;
      font-weight: 850;
      padding: 5px 9px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .status-badge--pending {
      background: #fff7ed;
      color: #c2410c;
    }

    .status-badge--sent {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .status-badge--reviewed {
      background: #ecfdf3;
      color: #047857;
    }

    .muted-text {
      color: #94a3b8;
      font-size: 0.78rem;
      font-weight: 750;
      white-space: nowrap;
    }

    .cards-list {
      display: none;
    }

    .record-card {
      border-top: 1px solid #e2e8f0;
      padding: 16px;
    }

    .record-card__header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .record-card__date {
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 750;
    }

    .record-card h3 {
      color: #0f172a;
      font-size: 1rem;
      line-height: 1.35;
      margin: 4px 0 0;
    }

    .record-card__details {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 0;
    }

    .record-card__details dt {
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 850;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .record-card__details dd {
      color: #0f172a;
      font-size: 0.9rem;
      font-weight: 720;
      margin: 0;
      overflow-wrap: anywhere;
    }

    .record-card .button--action {
      margin-top: 14px;
      width: 100%;
    }

    .modal-backdrop {
      align-items: center;
      background: rgba(15, 23, 42, 0.44);
      display: flex;
      inset: 0;
      justify-content: center;
      padding: 20px;
      position: fixed;
      z-index: 100;
    }

    .modal {
      background: #ffffff;
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
      max-height: calc(100vh - 40px);
      overflow: auto;
      width: min(680px, 100%);
    }

    .modal__header {
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 18px 20px;
    }

    .modal__eyebrow {
      color: #2563eb;
      font-size: 0.76rem;
      font-weight: 800;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .modal h2 {
      color: #0f172a;
      font-size: 1.25rem;
      margin: 0;
    }

    .modal__close {
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #334155;
      cursor: pointer;
      display: inline-flex;
      font-size: 1.5rem;
      font-weight: 700;
      height: 36px;
      justify-content: center;
      line-height: 1;
      width: 36px;
    }

    .modal__close:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .modal__context {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 18px 20px;
    }

    .modal__context div {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .modal__context span,
    .form-field span {
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .modal__context strong {
      color: #0f172a;
      font-size: 0.92rem;
      overflow-wrap: anywhere;
    }

    .modal__alert {
      margin: 16px 20px 0;
    }

    .modal__form {
      display: grid;
      gap: 16px;
      padding: 20px;
    }

    .modal__help {
      color: #475569;
      font-size: 0.92rem;
      line-height: 1.5;
      margin: 0;
    }

    .form-field {
      display: grid;
      gap: 7px;
    }

    .form-field textarea {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      font: inherit;
      line-height: 1.45;
      min-height: 96px;
      padding: 10px 12px;
      resize: vertical;
      width: 100%;
    }

    .form-field textarea:focus {
      border-color: #2563eb;
      outline: 3px solid rgba(37, 99, 235, 0.16);
    }

    .modal__actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 820px) {
      .workspace {
        padding-top: 24px;
      }

      .workspace__hero,
      .context-bar,
      .tabs {
        flex-direction: column;
      }

      .context-bar__divider {
        height: 1px;
        width: 100%;
      }

      .button--secondary,
      .tabs button {
        width: 100%;
      }

      .data-table {
        display: none;
      }

      .cards-list {
        display: block;
      }

      .modal__context {
        grid-template-columns: 1fr;
      }

      .modal__actions {
        flex-direction: column-reverse;
      }
    }

    @media (max-width: 560px) {
      .workspace__container {
        width: min(100% - 24px, 1180px);
      }

      .record-card__header,
      .record-card__details {
        grid-template-columns: 1fr;
      }

      .record-card__header {
        flex-direction: column;
      }

      .modal-backdrop {
        align-items: flex-end;
        padding: 12px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrhReceptionComponent {
  private readonly authService = inject(AuthService);
  private readonly orhReceptionService = inject(OrhReceptionService);

  protected readonly profile = signal<UserSessionResponse | null>(null);
  protected readonly changeRequests = signal<OrhGoalChangeRequestItemResponse[]>([]);
  protected readonly submissions = signal<OrhGoalSubmissionItemResponse[]>([]);
  protected readonly activeTab = signal<ReceptionTab>('changeRequests');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly reviewTarget = signal<ReviewTarget | null>(null);
  protected readonly reviewComment = signal('');
  protected readonly reviewSubmitting = signal(false);
  protected readonly reviewError = signal<string | null>(null);

  constructor() {
    this.loadProfile();
    this.loadReception();
  }

  protected setActiveTab(tab: ReceptionTab): void {
    this.activeTab.set(tab);
  }

  protected canReviewChangeRequest(item: OrhGoalChangeRequestItemResponse): boolean {
    return item.status === 'PENDIENTE';
  }

  protected canReviewSubmission(item: OrhGoalSubmissionItemResponse): boolean {
    return item.status === 'ENVIADO';
  }

  protected changeRequestStatusClass(status: string | null | undefined): string {
    return status === 'REVISADO'
      ? 'status-badge status-badge--reviewed'
      : 'status-badge status-badge--pending';
  }

  protected submissionStatusClass(status: string | null | undefined): string {
    return status === 'REVISADO'
      ? 'status-badge status-badge--reviewed'
      : 'status-badge status-badge--sent';
  }

  protected openReviewModal(type: ReviewTarget['type'], item: ReviewTarget['item']): void {
    this.successMessage.set(null);
    this.reviewError.set(null);
    this.reviewComment.set('');
    this.reviewTarget.set(type === 'changeRequest'
      ? { type, item: item as OrhGoalChangeRequestItemResponse }
      : { type, item: item as OrhGoalSubmissionItemResponse }
    );
  }

  protected closeReviewModal(): void {
    if (this.reviewSubmitting()) {
      return;
    }
    this.reviewTarget.set(null);
    this.reviewComment.set('');
    this.reviewError.set(null);
  }

  protected updateReviewComment(event: Event): void {
    this.reviewComment.set(this.eventValue(event));
    this.reviewError.set(null);
  }

  protected canSubmitReview(): boolean {
    return !this.reviewSubmitting()
      && this.reviewTarget() !== null
      && this.reviewComment().length <= 1000;
  }

  protected submitReview(event: Event): void {
    event.preventDefault();

    const target = this.reviewTarget();
    const comment = this.reviewComment().trim();

    if (!target) {
      this.reviewError.set('Seleccione un registro para marcar como revisado.');
      return;
    }

    if (comment.length > 1000) {
      this.reviewError.set('El comentario de revision ORH no puede exceder 1000 caracteres.');
      return;
    }

    const payload: ReviewOrhReceptionRequest = {
      comment: comment || null
    };

    this.reviewSubmitting.set(true);
    this.reviewError.set(null);
    this.successMessage.set(null);

    if (target.type === 'changeRequest') {
      this.orhReceptionService
        .reviewChangeRequest(target.item.id, payload)
        .pipe(finalize(() => this.reviewSubmitting.set(false)))
        .subscribe({
          next: (updated) => {
            this.changeRequests.set(this.changeRequests().map((item) =>
              item.id === updated.id ? updated : item
            ));
            this.closeReviewAfterSuccess();
          },
          error: (error) => this.reviewError.set(
            this.resolveErrorMessage(error, 'No se pudo marcar el registro como revisado.')
          )
        });
      return;
    }

    this.orhReceptionService
      .reviewSubmission(target.item.id, payload)
      .pipe(finalize(() => this.reviewSubmitting.set(false)))
      .subscribe({
        next: (updated) => {
          this.submissions.set(this.submissions().map((item) =>
            item.id === updated.id ? updated : item
          ));
          this.closeReviewAfterSuccess();
        },
        error: (error) => this.reviewError.set(
          this.resolveErrorMessage(error, 'No se pudo marcar el registro como revisado.')
        )
      });
  }

  protected reviewTypeLabel(target: ReviewTarget): string {
    return target.type === 'changeRequest' ? 'Solicitud de modificacion' : 'Envio a ORH';
  }

  protected reviewGoalTitle(target: ReviewTarget): string {
    return target.item.goalTitle || 'Sin meta';
  }

  protected reviewEvaluatedName(target: ReviewTarget): string {
    return target.item.evaluatedName || 'Sin evaluado';
  }

  protected reviewDate(target: ReviewTarget): string {
    return target.type === 'changeRequest'
      ? target.item.createdAt
      : target.item.submittedAt;
  }

  protected reviewStatusLabel(target: ReviewTarget): string {
    return target.item.statusName || target.item.status;
  }

  private closeReviewAfterSuccess(): void {
    this.reviewTarget.set(null);
    this.reviewComment.set('');
    this.reviewError.set(null);
    this.successMessage.set('Registro marcado como revisado.');
  }

  private loadProfile(): void {
    this.authService.me().subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar el contexto del usuario.'))
    });
  }

  private loadReception(): void {
    forkJoin({
      changeRequests: this.orhReceptionService.listChangeRequests(),
      submissions: this.orhReceptionService.listSubmissions()
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ changeRequests, submissions }) => {
          this.changeRequests.set(changeRequests);
          this.submissions.set(submissions);
        },
        error: (error) => this.errorMessage.set(
          this.resolveErrorMessage(error, 'No se pudo cargar la recepcion ORH.')
        )
      });
  }

  private eventValue(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error?: { message?: unknown } }).error?.message === 'string'
    ) {
      return (error as { error: { message: string } }).error.message;
    }

    return fallback;
  }
}
