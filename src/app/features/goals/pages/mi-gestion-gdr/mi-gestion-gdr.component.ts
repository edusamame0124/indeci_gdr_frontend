import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserSessionResponse } from '../../../../core/auth/auth.models';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import {
  GoalChangeRequestCreateRequest,
  GoalChangeRequestType,
  GoalOrhSubmissionCreateRequest,
  GoalSummary
} from '../../../../core/goals/goals.models';
import { GoalsService } from '../../../../core/goals/goals.service';

@Component({
  selector: 'app-mi-gestion-gdr',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="workspace">
      <div class="workspace__container">
        <nav class="breadcrumb" aria-label="Ruta de navegacion">
          <a routerLink="/dashboard">Dashboard</a>
          <span>/</span>
          <span>Mi gestion GDR</span>
        </nav>

        <header class="workspace__hero">
          <div>
            <p class="workspace__eyebrow">Mesa operativa</p>
            <h1 class="workspace__title">Mi gestion GDR</h1>
            <p class="workspace__subtitle">
              Revise sus metas accesibles y vaya directo al registro de evidencias sin salir del flujo operativo.
            </p>
          </div>

          <a routerLink="/dashboard" class="button button--secondary">Volver al dashboard</a>
        </header>

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

        <section class="goals-panel">
          <div class="goals-panel__header">
            <div>
              <p class="goals-panel__eyebrow">Metas accesibles</p>
              <h2 class="goals-panel__title">Listado operativo</h2>
              <p class="goals-panel__desc">
                El registro, revision y subsanacion se atienden dentro del modulo de evidencias de cada meta.
              </p>
            </div>
            <span class="goals-panel__count">{{ goals().length }} metas</span>
          </div>

          @if (loading()) {
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <span>Cargando metas accesibles...</span>
            </div>
          } @else if (!errorMessage() && goals().length === 0) {
            <div class="empty-state">
              <strong>No hay metas accesibles para mostrar.</strong>
              <span>Cuando existan metas asociadas a su alcance operativo, apareceran en esta mesa de trabajo.</span>
            </div>
          } @else if (goals().length > 0) {
            <div class="goals-table" role="region" aria-label="Metas accesibles">
              <table>
                <thead>
                  <tr>
                    <th class="col-meta">Meta</th>
                    <th class="col-person">Evaluado</th>
                    <th class="col-indicator">Indicador</th>
                    <th class="col-number">Valor esperado</th>
                    <th class="col-weight">Peso</th>
                    <th class="col-status">Estado</th>
                    <th class="col-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (goal of goals(); track goal.id) {
                    <tr>
                      <td>
                        <div class="goal-title">
                          <strong>{{ goal.title }}</strong>
                          <span>Meta ID {{ goal.id }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="text-cell">{{ goal.evaluatedName || 'Sin evaluado' }}</span>
                      </td>
                      <td>
                        <span class="text-cell text-cell--indicator">{{ goal.indicatorName || 'Sin indicador' }}</span>
                      </td>
                      <td>
                        <span class="metric-value">{{ goal.expectedValue }}</span>
                      </td>
                      <td>
                        <span class="weight-chip">{{ goal.weight }}%</span>
                      </td>
                      <td>
                        <span class="status-badge" [class]="statusClass(goal.status)">
                          {{ statusLabel(goal.status) }}
                        </span>
                      </td>
                      <td>
                        <div class="actions-cell">
                          <a
                            class="button button--primary button--compact"
                            [routerLink]="['/dashboard/metas', goal.id, 'evidencias']"
                          >
                            Gestionar evidencias
                          </a>

                          @if (hasSecondaryActions(goal)) {
                            <details class="actions-menu">
                              <summary>Mas acciones</summary>
                              <div class="actions-menu__panel">
                                @if (evaluatedIdFor(goal); as evaluatedId) {
                                  @if (canViewFinalEvaluations()) {
                                    <a [routerLink]="['/dashboard/evaluacion-final', evaluatedId]">
                                      Ver evaluacion
                                    </a>
                                  }
                                  @if (canViewDocuments()) {
                                    <a
                                      routerLink="/dashboard/documentos"
                                      [queryParams]="{ evaluatedId: evaluatedId }"
                                    >
                                      Documentos
                                    </a>
                                  }
                                  @if (canViewImprovements()) {
                                    <a
                                      routerLink="/dashboard/oportunidades-mejora"
                                      [queryParams]="{ evaluatedId: evaluatedId }"
                                    >
                                      Oportunidades
                                    </a>
                                  }
                                }
                                @if (canRequestGoalChange()) {
                                  <button
                                    class="actions-menu__button"
                                    type="button"
                                    (click)="openChangeRequestModal(goal)"
                                  >
                                    Solicitar modificacion
                                  </button>
                                }
                                @if (canSendGoalToOrh()) {
                                  <button
                                    class="actions-menu__button"
                                    type="button"
                                    (click)="openOrhSubmissionModal(goal)"
                                  >
                                    Enviar a ORH
                                  </button>
                                }
                              </div>
                            </details>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="goals-cards">
              @for (goal of goals(); track goal.id) {
                <article class="goal-card">
                  <div class="goal-card__header">
                    <div>
                      <span class="goal-card__meta">Meta ID {{ goal.id }}</span>
                      <h3>{{ goal.title }}</h3>
                    </div>
                    <span class="status-badge" [class]="statusClass(goal.status)">
                      {{ statusLabel(goal.status) }}
                    </span>
                  </div>

                  <dl class="goal-card__details">
                    <div>
                      <dt>Evaluado</dt>
                      <dd>{{ goal.evaluatedName || 'Sin evaluado' }}</dd>
                    </div>
                    <div>
                      <dt>Indicador</dt>
                      <dd>{{ goal.indicatorName || 'Sin indicador' }}</dd>
                    </div>
                    <div>
                      <dt>Valor esperado</dt>
                      <dd class="goal-card__metric">{{ goal.expectedValue }}</dd>
                    </div>
                    <div>
                      <dt>Peso</dt>
                      <dd>
                        <span class="weight-chip">{{ goal.weight }}%</span>
                      </dd>
                    </div>
                  </dl>

                  <div class="goal-card__actions">
                    <a
                      class="button button--primary"
                      [routerLink]="['/dashboard/metas', goal.id, 'evidencias']"
                    >
                      Gestionar evidencias
                    </a>

                    @if (hasSecondaryActions(goal)) {
                      <details class="actions-menu actions-menu--mobile">
                        <summary>Mas acciones</summary>
                        <div class="actions-menu__panel">
                          @if (evaluatedIdFor(goal); as evaluatedId) {
                            @if (canViewFinalEvaluations()) {
                              <a [routerLink]="['/dashboard/evaluacion-final', evaluatedId]">
                                Ver evaluacion
                              </a>
                            }
                            @if (canViewDocuments()) {
                              <a
                                routerLink="/dashboard/documentos"
                                [queryParams]="{ evaluatedId: evaluatedId }"
                              >
                                Documentos
                              </a>
                            }
                            @if (canViewImprovements()) {
                              <a
                                routerLink="/dashboard/oportunidades-mejora"
                                [queryParams]="{ evaluatedId: evaluatedId }"
                              >
                                Oportunidades
                              </a>
                            }
                          }
                          @if (canRequestGoalChange()) {
                            <button
                              class="actions-menu__button"
                              type="button"
                              (click)="openChangeRequestModal(goal)"
                            >
                              Solicitar modificacion
                            </button>
                          }
                          @if (canSendGoalToOrh()) {
                            <button
                              class="actions-menu__button"
                              type="button"
                              (click)="openOrhSubmissionModal(goal)"
                            >
                              Enviar a ORH
                            </button>
                          }
                        </div>
                      </details>
                    }
                  </div>
                </article>
              }
            </div>
          }
        </section>

        <p class="workspace__note">
          Esta tabla usa solo datos disponibles del listado actual de metas. Campos no expuestos por el backend,
          como evaluador, ciclo por meta, avance, evidencias o resultado, se mantienen fuera para no inventar
          informacion. El estado detallado de evidencias y revisiones se consulta dentro del modulo de evidencias.
        </p>

        @if (changeRequestGoal(); as selectedGoal) {
          <div class="modal-backdrop" role="presentation">
            <section
              class="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="change-request-title"
            >
              <div class="modal__header">
                <div>
                  <p class="modal__eyebrow">Solicitud sobre meta</p>
                  <h2 id="change-request-title">Solicitar modificacion</h2>
                </div>
                <button
                  class="modal__close"
                  type="button"
                  aria-label="Cerrar"
                  [disabled]="changeRequestSubmitting()"
                  (click)="closeChangeRequestModal()"
                >
                  x
                </button>
              </div>

              <div class="modal__context">
                <div>
                  <span>Meta</span>
                  <strong>{{ selectedGoal.title }}</strong>
                </div>
                <div>
                  <span>Evaluado</span>
                  <strong>{{ selectedGoal.evaluatedName || 'Sin evaluado' }}</strong>
                </div>
                <div>
                  <span>Indicador</span>
                  <strong>{{ selectedGoal.indicatorName || 'Sin indicador' }}</strong>
                </div>
                <div>
                  <span>Valor esperado</span>
                  <strong>{{ selectedGoal.expectedValue }}</strong>
                </div>
                <div>
                  <span>Peso</span>
                  <strong>{{ selectedGoal.weight }}%</strong>
                </div>
              </div>

              @if (changeRequestError()) {
                <div class="alert alert--error modal__alert" role="alert">
                  <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                  </svg>
                  <span>{{ changeRequestError() }}</span>
                </div>
              }

              <form class="modal__form" (submit)="submitChangeRequest($event)">
                <label class="form-field" for="change-request-type">
                  <span>Tipo de modificacion</span>
                  <select
                    id="change-request-type"
                    [value]="changeRequestType()"
                    [disabled]="changeRequestSubmitting()"
                    (change)="updateChangeRequestType($event)"
                  >
                    <option value="">Seleccione una opcion</option>
                    @for (option of changeRequestTypes; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                </label>

                <label class="form-field" for="change-request-reason">
                  <span>Motivo</span>
                  <textarea
                    id="change-request-reason"
                    rows="4"
                    maxlength="1000"
                    placeholder="Explique brevemente por que solicita la modificacion."
                    [value]="changeRequestReason()"
                    [disabled]="changeRequestSubmitting()"
                    (input)="updateChangeRequestReason($event)"
                  ></textarea>
                </label>

                <label class="form-field" for="change-request-comment">
                  <span>Comentario opcional</span>
                  <textarea
                    id="change-request-comment"
                    rows="3"
                    maxlength="1000"
                    placeholder="Agregue una precision adicional si corresponde."
                    [value]="changeRequestComment()"
                    [disabled]="changeRequestSubmitting()"
                    (input)="updateChangeRequestComment($event)"
                  ></textarea>
                </label>

                <div class="modal__actions">
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="changeRequestSubmitting()"
                    (click)="closeChangeRequestModal()"
                  >
                    Cancelar
                  </button>
                  <button
                    class="button button--primary"
                    type="submit"
                    [disabled]="!canSubmitChangeRequest()"
                  >
                    {{ changeRequestSubmitting() ? 'Enviando...' : 'Enviar solicitud' }}
                  </button>
                </div>
              </form>
            </section>
          </div>
        }

        @if (orhSubmissionGoal(); as selectedGoal) {
          <div class="modal-backdrop" role="presentation">
            <section
              class="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="orh-submission-title"
            >
              <div class="modal__header">
                <div>
                  <p class="modal__eyebrow">Remision formal</p>
                  <h2 id="orh-submission-title">Enviar a ORH</h2>
                </div>
                <button
                  class="modal__close"
                  type="button"
                  aria-label="Cerrar"
                  [disabled]="orhSubmissionSubmitting()"
                  (click)="closeOrhSubmissionModal()"
                >
                  x
                </button>
              </div>

              <div class="modal__context">
                <div>
                  <span>Meta</span>
                  <strong>{{ selectedGoal.title }}</strong>
                </div>
                <div>
                  <span>Evaluado</span>
                  <strong>{{ selectedGoal.evaluatedName || 'Sin evaluado' }}</strong>
                </div>
                <div>
                  <span>Indicador</span>
                  <strong>{{ selectedGoal.indicatorName || 'Sin indicador' }}</strong>
                </div>
                <div>
                  <span>Valor esperado</span>
                  <strong>{{ selectedGoal.expectedValue }}</strong>
                </div>
                <div>
                  <span>Peso</span>
                  <strong>{{ selectedGoal.weight }}%</strong>
                </div>
              </div>

              @if (orhSubmissionError()) {
                <div class="alert alert--error modal__alert" role="alert">
                  <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                  </svg>
                  <span>{{ orhSubmissionError() }}</span>
                </div>
              }

              <form class="modal__form" (submit)="submitOrhSubmission($event)">
                <p class="modal__help">
                  Esta accion registra la remision formal de la meta a ORH para conocimiento o atencion futura.
                </p>

                <label class="form-field" for="orh-submission-comment">
                  <span>Comentario opcional</span>
                  <textarea
                    id="orh-submission-comment"
                    rows="4"
                    maxlength="1000"
                    placeholder="Agregue un comentario breve para ORH si corresponde."
                    [value]="orhSubmissionComment()"
                    [disabled]="orhSubmissionSubmitting()"
                    (input)="updateOrhSubmissionComment($event)"
                  ></textarea>
                </label>

                <div class="modal__actions">
                  <button
                    class="button button--secondary"
                    type="button"
                    [disabled]="orhSubmissionSubmitting()"
                    (click)="closeOrhSubmissionModal()"
                  >
                    Cancelar
                  </button>
                  <button
                    class="button button--primary"
                    type="submit"
                    [disabled]="!canSubmitOrhSubmission()"
                  >
                    {{ orhSubmissionSubmitting() ? 'Enviando...' : 'Enviar a ORH' }}
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
    }

    .workspace {
      min-height: 100%;
      background: #f6f8fb;
      padding: 20px 0 28px;
    }

    .workspace__container {
      display: grid;
      gap: 14px;
      width: min(1120px, calc(100% - 48px));
      margin: 0 auto;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #667085;
      font-size: 0.75rem;
      margin-bottom: 0;
    }

    .breadcrumb a {
      color: #7f1714;
      text-decoration: none;
      font-weight: 600;
    }

    .breadcrumb a:hover {
      text-decoration: underline;
    }

    .workspace__hero {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 0;
    }

    .workspace__eyebrow,
    .goals-panel__eyebrow {
      color: #667085;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .workspace__title {
      color: #1a1a2e;
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
      margin: 0;
    }

    .workspace__subtitle {
      color: #667085;
      font-size: 0.84rem;
      line-height: 1.55;
      margin: 6px 0 0;
      max-width: 720px;
    }

    .alert {
      align-items: center;
      border-radius: 8px;
      display: flex;
      gap: 10px;
      margin-bottom: 0;
      padding: 12px 14px;
      font-size: 0.84rem;
    }

    .alert--error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .alert--success {
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      color: #047857;
    }

    .alert__icon {
      fill: currentColor;
      flex: 0 0 auto;
      height: 20px;
      width: 20px;
    }

    .goals-panel {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      overflow: visible;
    }

    .goals-panel__header {
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
    }

    .goals-panel__title {
      color: #1a1a2e;
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0;
    }

    .goals-panel__desc {
      color: #8b95a5;
      font-size: 0.76rem;
      line-height: 1.45;
      margin: 4px 0 0;
      max-width: 700px;
    }

    .goals-panel__count {
      background: #f1f3f5;
      border: 0;
      border-radius: 999px;
      color: #667085;
      font-size: 0.76rem;
      font-weight: 600;
      padding: 4px 10px;
      white-space: nowrap;
    }

    .loading-state,
    .empty-state {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 40px 16px;
      text-align: center;
    }

    .loading-state {
      color: #667085;
      font-size: 0.84rem;
      font-weight: 500;
    }

    .loading-spinner {
      animation: spin 0.7s linear infinite;
      border: 2px solid #e5e7eb;
      border-top-color: #7f1714;
      border-radius: 999px;
      height: 18px;
      width: 18px;
    }

    .empty-state strong {
      color: #0f172a;
      font-size: 1.05rem;
    }

    .empty-state span {
      color: #64748b;
      max-width: 560px;
    }

    .goals-table {
      overflow: visible;
    }

    table {
      border-collapse: collapse;
      min-width: 940px;
      width: 100%;
    }

    th,
    td {
      border-bottom: 1px solid #f1f3f5;
      color: #334155;
      font-size: 0.82rem;
      padding: 11px 14px;
      text-align: left;
      vertical-align: middle;
    }

    th {
      background: #f8fafc;
      color: #8b95a5;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .col-meta {
      width: 30%;
    }

    .col-person {
      width: 18%;
    }

    .col-indicator {
      width: 22%;
    }

    .col-number,
    .col-weight,
    .col-status,
    .col-actions {
      width: 1%;
    }

    tbody tr:hover {
      background: #fafbfc;
    }

    .goal-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-width: 420px;
    }

    .goal-title strong {
      color: #1a1a2e;
      line-height: 1.35;
    }

    .goal-title span,
    .goal-card__meta {
      color: #8b95a5;
      font-size: 0.76rem;
      font-weight: 600;
    }

    .text-cell {
      color: #1a1a2e;
      display: inline-block;
      font-weight: 600;
      line-height: 1.35;
      max-width: 260px;
      overflow-wrap: anywhere;
    }

    .text-cell--indicator {
      color: #334155;
      font-weight: 500;
      max-width: 320px;
    }

    .metric-value {
      color: #1a1a2e;
      display: inline-flex;
      font-size: 0.88rem;
      font-weight: 700;
      justify-content: flex-end;
      min-width: 48px;
    }

    .weight-chip {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      color: #344054;
      display: inline-flex;
      font-size: 0.76rem;
      font-weight: 700;
      line-height: 1;
      padding: 5px 10px;
      white-space: nowrap;
    }

    .status-badge {
      border-radius: 999px;
      display: inline-flex;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1;
      padding: 6px 10px;
      white-space: nowrap;
    }

    .status-badge--active {
      background: #ecfdf5;
      color: #047857;
    }

    .status-badge--draft {
      background: #f8fafc;
      color: #475569;
    }

    .status-badge--closed {
      background: #f1f5f9;
      color: #334155;
    }

    .status-badge--default {
      background: #f8fafc;
      color: #475569;
    }

    .button {
      align-items: center;
      border-radius: 8px;
      display: inline-flex;
      font-size: 0.8rem;
      font-weight: 600;
      justify-content: center;
      min-height: 36px;
      padding: 0 14px;
      text-decoration: none;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }

    .button--primary {
      background: #7f1714;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(127, 23, 20, 0.2);
    }

    .button--primary:hover {
      background: #951c18;
    }

    .button--secondary {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      white-space: nowrap;
    }

    .button--secondary:hover {
      border-color: #94a3b8;
      background: #f8fafc;
    }

    .button--compact {
      font-size: 0.74rem;
      min-height: 30px;
      padding: 0 10px;
    }

    .actions-cell {
      align-items: center;
      display: flex;
      gap: 8px;
      justify-content: flex-start;
      position: relative;
      white-space: nowrap;
    }

    .actions-menu {
      position: relative;
    }

    .actions-menu summary {
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #334155;
      cursor: pointer;
      display: inline-flex;
      font-size: 0.74rem;
      font-weight: 600;
      justify-content: center;
      list-style: none;
      min-height: 30px;
      padding: 0 10px;
      user-select: none;
    }

    .actions-menu summary::-webkit-details-marker {
      display: none;
    }

    .actions-menu summary:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .actions-menu__panel {
      background: #ffffff;
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
      display: grid;
      gap: 4px;
      min-width: 176px;
      padding: 8px;
      position: absolute;
      right: 0;
      top: calc(100% + 6px);
      z-index: 80;
    }

    .actions-menu__panel a,
    .actions-menu__button {
      background: transparent;
      border: 0;
      border-radius: 6px;
      color: #0f172a;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 9px 10px;
      text-decoration: none;
      text-align: left;
    }

    .actions-menu__panel a:hover,
    .actions-menu__button:hover {
      background: rgba(127, 23, 20, 0.06);
      color: #7f1714;
    }

    .goals-cards {
      display: none;
    }

    .workspace__note {
      color: #667085;
      font-size: 0.78rem;
      line-height: 1.5;
      margin: 0;
    }

    .goal-card {
      border-top: 1px solid #e2e8f0;
      padding: 18px;
    }

    .goal-card__header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .goal-card h3 {
      color: #0f172a;
      font-size: 1rem;
      line-height: 1.35;
      margin: 4px 0 0;
    }

    .goal-card__details {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 0 0 16px;
    }

    .goal-card__details div {
      min-width: 0;
    }

    .goal-card__details dt {
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 800;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .goal-card__details dd {
      color: #0f172a;
      font-size: 0.92rem;
      font-weight: 700;
      margin: 0;
      overflow-wrap: anywhere;
    }

    .goal-card__metric {
      font-size: 1rem;
      font-weight: 850;
    }

    .goal-card__actions {
      display: grid;
      gap: 10px;
    }

    .actions-menu--mobile summary {
      width: 100%;
    }

    .actions-menu--mobile .actions-menu__panel {
      position: static;
      margin-top: 8px;
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
      justify-content: space-between;
      gap: 16px;
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

    .form-field {
      display: grid;
      gap: 7px;
    }

    .modal__help {
      color: #475569;
      font-size: 0.92rem;
      line-height: 1.5;
      margin: 0;
    }

    .form-field select,
    .form-field textarea {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      font: inherit;
      min-height: 42px;
      padding: 10px 12px;
      width: 100%;
    }

    .form-field textarea {
      line-height: 1.45;
      resize: vertical;
    }

    .form-field select:focus,
    .form-field textarea:focus {
      border-color: #2563eb;
      outline: 3px solid rgba(37, 99, 235, 0.16);
    }

    .modal__actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .modal__actions .button {
      border: 0;
      cursor: pointer;
    }

    .modal__actions .button--secondary {
      border: 1px solid #cbd5e1;
    }

    .modal__actions .button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
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
      .goals-panel__header {
        flex-direction: column;
      }

      .button--secondary {
        width: 100%;
      }

      .goals-table {
        display: none;
      }

      .goals-cards {
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

      .goal-card__header,
      .goal-card__details {
        grid-template-columns: 1fr;
      }

      .goal-card__header {
        flex-direction: column;
      }

      .button--primary {
        width: 100%;
      }

      .modal-backdrop {
        align-items: flex-end;
        padding: 12px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiGestionGdrComponent {
  private readonly authService = inject(AuthService);
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly goalsService = inject(GoalsService);

  protected readonly profile = signal<UserSessionResponse | null>(null);
  protected readonly goals = signal<GoalSummary[]>([]);
  protected readonly evaluatedIdsByAssignment = signal<Record<number, number>>({});
  protected readonly evaluationLookupLoaded = signal(false);
  protected readonly evaluationLookupLoading = signal(false);
  protected readonly loadingProfile = signal(true);
  protected readonly loadingGoals = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly changeRequestGoal = signal<GoalSummary | null>(null);
  protected readonly changeRequestType = signal<GoalChangeRequestType | ''>('');
  protected readonly changeRequestReason = signal('');
  protected readonly changeRequestComment = signal('');
  protected readonly changeRequestSubmitting = signal(false);
  protected readonly changeRequestError = signal<string | null>(null);
  protected readonly orhSubmissionGoal = signal<GoalSummary | null>(null);
  protected readonly orhSubmissionComment = signal('');
  protected readonly orhSubmissionSubmitting = signal(false);
  protected readonly orhSubmissionError = signal<string | null>(null);
  protected readonly loading = computed(() => this.loadingProfile() || this.loadingGoals());
  protected readonly changeRequestTypes: ReadonlyArray<{ value: GoalChangeRequestType; label: string }> = [
    { value: 'TITULO', label: 'Titulo de la meta' },
    { value: 'DESCRIPCION', label: 'Descripcion' },
    { value: 'INDICADOR', label: 'Indicador' },
    { value: 'VALOR_ESPERADO', label: 'Valor esperado' },
    { value: 'PESO', label: 'Peso' },
    { value: 'OTRO', label: 'Otro' }
  ];

  constructor() {
    this.loadProfile();
    this.loadGoals();
  }

  protected statusLabel(status: string | null | undefined): string {
    if (!status) {
      return 'Sin estado';
    }

    const normalized = status.toUpperCase();
    const labels: Record<string, string> = {
      ACTIVE: 'Activo',
      ACTIVA: 'Activo',
      DRAFT: 'Borrador',
      BORRADOR: 'Borrador',
      CLOSED: 'Cerrado',
      CERRADO: 'Cerrado',
      APPROVED: 'Aprobado',
      APROBADO: 'Aprobado'
    };

    return labels[normalized] ?? status;
  }

  protected statusClass(status: string | null | undefined): string {
    const normalized = (status ?? '').toUpperCase();

    if (['ACTIVE', 'ACTIVA', 'APPROVED', 'APROBADO'].includes(normalized)) {
      return 'status-badge status-badge--active';
    }

    if (['DRAFT', 'BORRADOR'].includes(normalized)) {
      return 'status-badge status-badge--draft';
    }

    if (['CLOSED', 'CERRADO'].includes(normalized)) {
      return 'status-badge status-badge--closed';
    }

    return 'status-badge status-badge--default';
  }

  protected evaluatedIdFor(goal: GoalSummary): number | null {
    return this.evaluatedIdsByAssignment()[goal.assignmentId] ?? null;
  }

  protected hasSecondaryActions(goal: GoalSummary): boolean {
    return this.canRequestGoalChange() || this.canSendGoalToOrh() || (this.evaluatedIdFor(goal) !== null && (
      this.canViewFinalEvaluations() ||
      this.canViewDocuments() ||
      this.canViewImprovements()
    ));
  }

  protected canViewFinalEvaluations(): boolean {
    return this.authService.canAccessFeature('finalEvaluationsView');
  }

  protected canViewDocuments(): boolean {
    return this.authService.canAccessFeature('documents');
  }

  protected canViewImprovements(): boolean {
    return this.authService.canAccessFeature('improvements');
  }

  protected canRequestGoalChange(): boolean {
    const actor = this.profile()?.context.functionalActor;
    return this.authService.canAccessFeature('goalsView') && (
      actor === 'EVALUADOR' ||
      actor === 'EVALUADO' ||
      actor === 'EVALUADOR_Y_EVALUADO'
    );
  }

  protected canSendGoalToOrh(): boolean {
    const actor = this.profile()?.context.functionalActor;
    return this.authService.canAccessFeature('goalsView') && (
      actor === 'EVALUADOR' ||
      actor === 'EVALUADOR_Y_EVALUADO'
    );
  }

  protected openChangeRequestModal(goal: GoalSummary): void {
    this.successMessage.set(null);
    this.changeRequestError.set(null);
    this.changeRequestGoal.set(goal);
    this.changeRequestType.set('');
    this.changeRequestReason.set('');
    this.changeRequestComment.set('');
  }

  protected closeChangeRequestModal(): void {
    if (this.changeRequestSubmitting()) {
      return;
    }

    this.changeRequestGoal.set(null);
    this.changeRequestType.set('');
    this.changeRequestReason.set('');
    this.changeRequestComment.set('');
    this.changeRequestError.set(null);
  }

  protected updateChangeRequestType(event: Event): void {
    this.changeRequestType.set(this.eventValue(event) as GoalChangeRequestType | '');
    this.changeRequestError.set(null);
  }

  protected updateChangeRequestReason(event: Event): void {
    this.changeRequestReason.set(this.eventValue(event));
    this.changeRequestError.set(null);
  }

  protected updateChangeRequestComment(event: Event): void {
    this.changeRequestComment.set(this.eventValue(event));
    this.changeRequestError.set(null);
  }

  protected canSubmitChangeRequest(): boolean {
    return !this.changeRequestSubmitting()
      && this.changeRequestGoal() !== null
      && this.changeRequestType() !== ''
      && this.changeRequestReason().trim().length > 0;
  }

  protected submitChangeRequest(event: Event): void {
    event.preventDefault();

    const goal = this.changeRequestGoal();
    const requestType = this.changeRequestType();
    const reason = this.changeRequestReason().trim();
    const comment = this.changeRequestComment().trim();

    if (!goal || !requestType) {
      this.changeRequestError.set('Seleccione el tipo de modificacion solicitado.');
      return;
    }

    if (!reason) {
      this.changeRequestError.set('Ingrese el motivo de la solicitud.');
      return;
    }

    const payload: GoalChangeRequestCreateRequest = {
      requestType,
      reason,
      comment: comment || null
    };

    this.changeRequestSubmitting.set(true);
    this.changeRequestError.set(null);
    this.successMessage.set(null);

    this.goalsService
      .createGoalChangeRequest(goal.id, payload)
      .pipe(finalize(() => this.changeRequestSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.changeRequestGoal.set(null);
          this.changeRequestType.set('');
          this.changeRequestReason.set('');
          this.changeRequestComment.set('');
          this.successMessage.set(`Solicitud de modificacion registrada para la meta "${goal.title}".`);
        },
        error: (error) => this.changeRequestError.set(
          this.resolveErrorMessage(error, 'No se pudo registrar la solicitud de modificacion.')
        )
      });
  }

  protected openOrhSubmissionModal(goal: GoalSummary): void {
    this.successMessage.set(null);
    this.orhSubmissionError.set(null);
    this.orhSubmissionGoal.set(goal);
    this.orhSubmissionComment.set('');
  }

  protected closeOrhSubmissionModal(): void {
    if (this.orhSubmissionSubmitting()) {
      return;
    }

    this.orhSubmissionGoal.set(null);
    this.orhSubmissionComment.set('');
    this.orhSubmissionError.set(null);
  }

  protected updateOrhSubmissionComment(event: Event): void {
    this.orhSubmissionComment.set(this.eventValue(event));
    this.orhSubmissionError.set(null);
  }

  protected canSubmitOrhSubmission(): boolean {
    return !this.orhSubmissionSubmitting()
      && this.orhSubmissionGoal() !== null
      && this.orhSubmissionComment().length <= 1000;
  }

  protected submitOrhSubmission(event: Event): void {
    event.preventDefault();

    const goal = this.orhSubmissionGoal();
    const comment = this.orhSubmissionComment().trim();

    if (!goal) {
      this.orhSubmissionError.set('Seleccione una meta para enviar a ORH.');
      return;
    }

    if (comment.length > 1000) {
      this.orhSubmissionError.set('El comentario del envio a ORH no puede exceder 1000 caracteres.');
      return;
    }

    const payload: GoalOrhSubmissionCreateRequest = {
      comment: comment || null
    };

    this.orhSubmissionSubmitting.set(true);
    this.orhSubmissionError.set(null);
    this.successMessage.set(null);

    this.goalsService
      .createGoalOrhSubmission(goal.id, payload)
      .pipe(finalize(() => this.orhSubmissionSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.orhSubmissionGoal.set(null);
          this.orhSubmissionComment.set('');
          this.successMessage.set(`Envio a ORH registrado para la meta "${goal.title}".`);
        },
        error: (error) => this.orhSubmissionError.set(
          this.resolveErrorMessage(error, 'No se pudo registrar el envio a ORH.')
        )
      });
  }

  private loadProfile(): void {
    this.authService
      .me()
      .pipe(finalize(() => this.loadingProfile.set(false)))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.tryLoadEvaluationLookup();
        },
        error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar el contexto del usuario.'))
      });
  }

  private loadGoals(): void {
    this.goalsService
      .listGoals()
      .pipe(finalize(() => this.loadingGoals.set(false)))
      .subscribe({
        next: (goals) => {
          this.goals.set(goals);
          this.tryLoadEvaluationLookup();
        },
        error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar el listado de metas.'))
      });
  }

  private tryLoadEvaluationLookup(): void {
    const relevantAssignmentIds = this.relevantAssignmentIds();

    if (
      this.evaluationLookupLoaded() ||
      this.evaluationLookupLoading() ||
      !this.profile() ||
      !this.shouldLoadEvaluationLookup() ||
      relevantAssignmentIds.size === 0
    ) {
      return;
    }

    this.evaluationLookupLoading.set(true);

    this.finalEvaluationService
      .listFinalEvaluations()
      .pipe(finalize(() => this.evaluationLookupLoading.set(false)))
      .subscribe({
        next: (evaluations) => {
          const lookup = evaluations.reduce<Record<number, number>>((accumulator, evaluation) => {
            if (relevantAssignmentIds.has(evaluation.assignmentId)) {
              accumulator[evaluation.assignmentId] = evaluation.evaluatedId;
            }
            return accumulator;
          }, {});
          this.evaluatedIdsByAssignment.set(lookup);
          this.evaluationLookupLoaded.set(true);
        },
        error: () => {
          this.evaluatedIdsByAssignment.set({});
          this.evaluationLookupLoaded.set(true);
        }
      });
  }

  private shouldLoadEvaluationLookup(): boolean {
    return this.canViewFinalEvaluations() || this.canViewDocuments() || this.canViewImprovements();
  }

  private relevantAssignmentIds(): Set<number> {
    return new Set(
      this.goals()
        .map((goal) => goal.assignmentId)
        .filter((assignmentId) => Number.isFinite(assignmentId) && assignmentId > 0)
    );
  }

  private eventValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
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
