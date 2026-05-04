import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { finalize, take } from 'rxjs';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { HrAssignmentSummary } from '../../../../core/hr/hr.models';
import { HrService } from '../../../../core/hr/hr.service';
import { Indicator } from '../../../../core/indicators/indicators.models';
import { IndicatorsService } from '../../../../core/indicators/indicators.service';
import {
  GoalChangeRequestCreateRequest,
  GoalChangeRequestType,
  GoalDetail,
  GoalOrhSubmissionCreateRequest,
  GoalSummary,
  GoalUpsertRequest,
  MAX_GOAL_SCORE
} from '../../../../core/goals/goals.models';
import { GoalsService } from '../../../../core/goals/goals.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

function parsePercentNumber(value: unknown): number | null {
  const text = String(value ?? '').trim().replace(/%/g, '').replace(',', '.');
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
}

function sanitizePercentText(value: unknown): string {
  const original = String(value ?? '');
  const hasPercent = original.includes('%');
  let text = original.replace(/%/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = text.indexOf('.');

  if (firstDot >= 0) {
    text = `${text.slice(0, firstDot + 1)}${text.slice(firstDot + 1).replace(/\./g, '')}`;
  }

  if (!text) {
    return '';
  }

  const parsed = Number(text);
  if (Number.isFinite(parsed) && parsed > 100) {
    text = '100';
  }

  return hasPercent ? `${text}%` : text;
}

const DEFAULT_EXPECTED_VALUE_HINT =
  'Ingrese un numero de 0 a 100. Puede incluir %.';

function normalizedValueTypeLabel(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** How the Valor esperado input formats % suffix and accepts typing. */
type ExpectedValueInputKind = 'numeric' | 'percentage' | 'unknown';

function resolveExpectedValueInputKind(indicator: Indicator | null): ExpectedValueInputKind {
  const rawName = indicator?.valueTypeName?.trim();
  if (!rawName) {
    return 'unknown';
  }
  const label = normalizedValueTypeLabel(rawName);
  if (label === 'numerico') {
    return 'numeric';
  }
  if (label === 'porcentaje') {
    return 'percentage';
  }
  return 'unknown';
}

/** Digits / single decimal dot, capped 0–100; strips % and other chars. */
function sanitizeExpectedValueNumericCore(value: unknown): string {
  let text = String(value ?? '').replace(/%/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = text.indexOf('.');

  if (firstDot >= 0) {
    text = `${text.slice(0, firstDot + 1)}${text.slice(firstDot + 1).replace(/\./g, '')}`;
  }

  if (!text) {
    return '';
  }

  const parsed = Number(text);
  if (Number.isFinite(parsed) && parsed > 100) {
    text = '100';
  }

  return text;
}

function sanitizeExpectedValueForKind(value: unknown, kind: ExpectedValueInputKind): string {
  if (kind === 'unknown') {
    return sanitizePercentText(value);
  }

  const core = sanitizeExpectedValueNumericCore(value);
  if (!core) {
    return '';
  }

  return kind === 'percentage' ? `${core}%` : core;
}

function percentRangeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return null;
    }

    return parsePercentNumber(raw) === null ? { percentRange: true } : null;
  };
}

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
                  <th>Meta</th>
                  <th>Evaluado</th>
                  <th>Indicador</th>
                  <th>Valor esperado</th>
                  <th>Peso</th>
                  <th>Fecha final</th>
                  <th>Evidencia</th>
                  <th class="th--stat">Val. alc.</th>
                  <th class="th--stat">Punt.</th>
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
                    <td>{{ formatDate(goal.endDate) }}</td>
                    <td class="td--evidence">{{ goal.evidenceCount }}</td>
                    <td class="td--stat">{{ formatAchievedPercent(goal) }}</td>
                    <td class="td--stat">{{ formatCalculatedScore(goal) }}</td>
                    <td class="td--actions-col">
                      <div class="actions-cell">
                        <a
                          [routerLink]="['/dashboard/metas', goal.id, 'evidencias']"
                          class="btn btn--icon btn--outline"
                          aria-label="Evidencias"
                          title="Evidencias"
                        >
                          <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M4.7 10.8h10.6v-1.6H4.7v1.6Zm0-4h10.6V5.2H4.7v1.6Zm0 8h7.2v-1.6H4.7v1.6Z"/>
                          </svg>
                        </a>
                        @if (canReviewGoals()) {
                          <button
                            type="button"
                            class="btn btn--icon btn--outline"
                            aria-label="Calificar"
                            title="Calificar"
                            (click)="openCalificarModal(goal)"
                          >
                            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M15.3 4.7 9 11l-2.3-2.3-1.1 1.1L9 13.2l7.4-7.4-1.1-1.1ZM4 16h9v-1.6H4V16Z"/>
                            </svg>
                          </button>
                        }
                        @if (canManageGoals()) {
                          <button
                            type="button"
                            class="btn btn--icon btn--ghost"
                            aria-label="Editar"
                            title="Editar"
                            (click)="openEditModal(goal.id)"
                          >
                            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M4 14.5V16h1.5l7.7-7.7-1.5-1.5L4 14.5Zm10.9-7.8a1.1 1.1 0 0 0 0-1.6l-1-1a1.1 1.1 0 0 0-1.6 0l-.8.8L14 7.5l.9-.8Z"/>
                            </svg>
                          </button>
                        }
                        @if (hasSecondaryActions(goal)) {
                          <button
                            type="button"
                            class="btn btn--icon actions-menu-trigger"
                            aria-haspopup="menu"
                            aria-label="Mas acciones"
                            title="Mas acciones"
                            [attr.popovertarget]="goalMorePopoverId(goal.id)"
                          >
                            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M3 5h14v1.6H3V5Zm0 4.2h14v1.6H3V9.2Zm0 4.2h14V15H3v-1.6Z"/>
                            </svg>
                          </button>
                          <div
                            class="goal-more-popover"
                            popover="auto"
                            role="menu"
                            [attr.id]="goalMorePopoverId(goal.id)"
                            (toggle)="onGoalMorePopoverToggle($event)"
                          >
                              @if (evaluatedIdFor(goal); as evaluatedId) {
                                @if (canViewFinalEvaluations() || canViewDocuments() || canViewImprovements()) {
                                  <span class="actions-menu__group-label" role="presentation">Consulta</span>
                                }
                                @if (canViewFinalEvaluations()) {
                                  <a [routerLink]="['/dashboard/evaluacion-final', evaluatedId]" role="menuitem">
                                    <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                                      <path d="M10 4.2c-3.6 0-6.6 2.4-7.7 5.8 1.1 3.4 4.1 5.8 7.7 5.8s6.6-2.4 7.7-5.8c-1.1-3.4-4.1-5.8-7.7-5.8Zm0 9.6a3.8 3.8 0 1 1 0-7.6 3.8 3.8 0 0 1 0 7.6Zm0-6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z"/>
                                    </svg>
                                    Ver evaluacion
                                  </a>
                                }
                                @if (canViewDocuments()) {
                                  <a routerLink="/dashboard/documentos" [queryParams]="{ evaluatedId: evaluatedId }" role="menuitem">
                                    <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                                      <path d="M6 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.4L11.6 2H6Zm5 1.2L14.8 7H12a1 1 0 0 1-1-1V3.2ZM7 10h6v1.5H7V10Zm0 3h4v1.5H7V13Z"/>
                                    </svg>
                                    Documentos
                                  </a>
                                }
                                @if (canViewImprovements()) {
                                  <a
                                    routerLink="/dashboard/oportunidades-mejora"
                                    [queryParams]="{ evaluatedId: evaluatedId }"
                                    role="menuitem"
                                  >
                                    <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                                      <path d="M10 2.4a5.6 5.6 0 0 0-3.4 10v1.4c0 .5.4 1 1 1H12.4c.6 0 1-.5 1-1v-1.4a5.6 5.6 0 0 0-3.4-10Zm-1.6 14.2c0 .5.4 1 1 1h1.2c.6 0 1-.5 1-1v-.4H8.4v.4Z"/>
                                    </svg>
                                    Oportunidades
                                  </a>
                                }
                              }
                              @if (canRequestGoalChange()) {
                                @if (canViewFinalEvaluations() || canViewDocuments() || canViewImprovements()) {
                                  <span class="actions-menu__divider" role="separator" aria-hidden="true"></span>
                                }
                                <span class="actions-menu__group-label" role="presentation">Trabajo</span>
                                <button
                                  type="button"
                                  class="actions-menu__button"
                                  (click)="openChangeRequestModal(goal)"
                                  role="menuitem"
                                >
                                  <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M4 14.5V16h1.5l7.7-7.7-1.5-1.5L4 14.5Zm10.9-7.8a1.1 1.1 0 0 0 0-1.6l-1-1a1.1 1.1 0 0 0-1.6 0l-.8.8L14 7.5l.9-.8Z"/>
                                  </svg>
                                  Solicitar modificacion
                                </button>
                              }
                              @if (canSendGoalToOrh()) {
                                <span class="actions-menu__divider" role="separator" aria-hidden="true"></span>
                                <span class="actions-menu__group-label" role="presentation">Envio</span>
                                <button
                                  type="button"
                                  class="actions-menu__button actions-menu__button--primary"
                                  (click)="openOrhSubmissionModal(goal)"
                                  role="menuitem"
                                >
                                  <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M3.4 16.6 17 10 3.4 3.4 3.4 8.6 13 10l-9.6 1.4Z"/>
                                  </svg>
                                  Enviar a ORH
                                </button>
                              }
                          </div>
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
                  <div class="goal-card__field">
                    <span>Fecha final</span>
                    <strong>{{ formatDate(goal.endDate) }}</strong>
                  </div>
                  <div class="goal-card__field">
                    <span>Evidencia</span>
                    <strong>{{ goal.evidenceCount }}</strong>
                  </div>
                  <div class="goal-card__field">
                    <span>Val. alc.</span>
                    <strong>{{ formatAchievedPercent(goal) }}</strong>
                  </div>
                  <div class="goal-card__field">
                    <span>Punt.</span>
                    <strong>{{ formatCalculatedScore(goal) }}</strong>
                  </div>
                </div>
                <div class="goal-card__actions">
                  <a [routerLink]="['/dashboard/metas', goal.id, 'evidencias']" class="btn btn--outline btn--sm btn--full">Evidencias</a>
                  @if (canReviewGoals()) {
                    <button type="button" class="btn btn--outline btn--sm btn--full" (click)="openCalificarModal(goal)">Calificar</button>
                  }
                  @if (canManageGoals()) {
                    <button type="button" class="btn btn--ghost btn--sm btn--full" (click)="openEditModal(goal.id)">Editar</button>
                  }
                  @if (hasSecondaryActions(goal)) {
                    <details class="actions-menu actions-menu--mobile">
                      <summary class="actions-menu-summary">Mas acciones</summary>
                      <div class="actions-menu__panel">
                        @if (evaluatedIdFor(goal); as evaluatedId) {
                          @if (canViewFinalEvaluations() || canViewDocuments() || canViewImprovements()) {
                            <span class="actions-menu__group-label" role="presentation">Consulta</span>
                          }
                          @if (canViewFinalEvaluations()) {
                            <a [routerLink]="['/dashboard/evaluacion-final', evaluatedId]">
                              <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M10 4.2c-3.6 0-6.6 2.4-7.7 5.8 1.1 3.4 4.1 5.8 7.7 5.8s6.6-2.4 7.7-5.8c-1.1-3.4-4.1-5.8-7.7-5.8Zm0 9.6a3.8 3.8 0 1 1 0-7.6 3.8 3.8 0 0 1 0 7.6Zm0-6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z"/>
                              </svg>
                              Ver evaluacion
                            </a>
                          }
                          @if (canViewDocuments()) {
                            <a routerLink="/dashboard/documentos" [queryParams]="{ evaluatedId: evaluatedId }">
                              <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M6 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.4L11.6 2H6Zm5 1.2L14.8 7H12a1 1 0 0 1-1-1V3.2ZM7 10h6v1.5H7V10Zm0 3h4v1.5H7V13Z"/>
                              </svg>
                              Documentos
                            </a>
                          }
                          @if (canViewImprovements()) {
                            <a routerLink="/dashboard/oportunidades-mejora" [queryParams]="{ evaluatedId: evaluatedId }">
                              <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                                <path d="M10 2.4a5.6 5.6 0 0 0-3.4 10v1.4c0 .5.4 1 1 1H12.4c.6 0 1-.5 1-1v-1.4a5.6 5.6 0 0 0-3.4-10Zm-1.6 14.2c0 .5.4 1 1 1h1.2c.6 0 1-.5 1-1v-.4H8.4v.4Z"/>
                              </svg>
                              Oportunidades
                            </a>
                          }
                        }
                        @if (canRequestGoalChange()) {
                          @if (canViewFinalEvaluations() || canViewDocuments() || canViewImprovements()) {
                            <span class="actions-menu__divider" role="separator" aria-hidden="true"></span>
                          }
                          <span class="actions-menu__group-label" role="presentation">Trabajo</span>
                          <button
                            type="button"
                            class="actions-menu__button"
                            (click)="openChangeRequestModal(goal)"
                          >
                            <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M4 14.5V16h1.5l7.7-7.7-1.5-1.5L4 14.5Zm10.9-7.8a1.1 1.1 0 0 0 0-1.6l-1-1a1.1 1.1 0 0 0-1.6 0l-.8.8L14 7.5l.9-.8Z"/>
                            </svg>
                            Solicitar modificacion
                          </button>
                        }
                        @if (canSendGoalToOrh()) {
                          <span class="actions-menu__divider" role="separator" aria-hidden="true"></span>
                          <span class="actions-menu__group-label" role="presentation">Envio</span>
                          <button
                            type="button"
                            class="actions-menu__button actions-menu__button--primary"
                            (click)="openOrhSubmissionModal(goal)"
                          >
                            <svg class="actions-menu__icon" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M3.4 16.6 17 10 3.4 3.4 3.4 8.6 13 10l-9.6 1.4Z"/>
                            </svg>
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

      <!-- Modal: calificar meta -->
      @if (calificarModalOpen()) {
        @if (ratingTargetGoal(); as tg) {
        <div class="modal-backdrop" (click)="closeCalificarModal()"></div>
        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="goal-calificar-title">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">Metas</p>
              <h2 id="goal-calificar-title">Valor alcanzado</h2>
            </div>
            <button type="button" class="modal__close" (click)="closeCalificarModal()" aria-label="Cerrar modal">
              <svg viewBox="0 0 20 20"><path d="M14.3 5.7l-1-1L10 8l-3.3-3.3-1 1L9 9l-3.3 3.3 1 1L10 10l3.3 3.3 1-1L11 9l3.3-3.3Z"/></svg>
            </button>
          </div>
          @if (ratingFormError()) {
            <div class="alert alert--error" role="alert">
              <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
              </svg>
              <span>{{ ratingFormError() }}</span>
            </div>
          }
          <div class="form-grid">
            <label class="field field--full">
              <span class="field__label">Meta</span>
              <textarea class="field__readonly" rows="4" readonly>{{ tg.title }}</textarea>
            </label>
            <label class="field">
              <span class="field__label">Valor</span>
              <input type="text" class="field__readonly" readonly [value]="formatPercentPlain(tg.expectedValue)" />
            </label>
            <label class="field">
              <span class="field__label">Peso</span>
              <input type="text" class="field__readonly" readonly [value]="formatPercentPlain(tg.weight)" />
            </label>
            <label class="field field--full">
              <span class="field__label">Valor alcanzado <span class="field__required">*</span></span>
              <input
                type="text"
                inputmode="decimal"
                [value]="ratingAchievedDraft()"
                (input)="onRatingAchievedInput($event)"
                placeholder="0"
              />
              <small class="field__hint">
                Registre el valor alcanzado real (puede superar el valor meta).
                El puntaje por meta no excederá 120 puntos.
              </small>
            </label>
            <label class="field field--full">
              <span class="field__label">Puntaje calculado</span>
              <input type="text" class="field__readonly" readonly [value]="ratingPreviewScoreLabel()" />
            </label>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn--ghost" (click)="closeCalificarModal()">Cancelar</button>
            <button type="button" class="btn btn--primary" [disabled]="savingRating()" (click)="submitCalificarMeta()">
              @if (savingRating()) {
                <span class="loading-spinner loading-spinner--sm"></span>
              }
              Calificar
            </button>
          </div>
        </section>
        }
      }

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
              <div class="indicator-combo" (click)="$event.stopPropagation()">
                <button
                  type="button"
                  class="indicator-combo__control"
                  [class.indicator-combo__control--placeholder]="!selectedIndicator()"
                  (click)="toggleIndicatorDropdown($event)"
                  [attr.aria-expanded]="indicatorDropdownOpen()"
                >
                  <span>{{ selectedIndicatorLabel() || 'Buscar indicador...' }}</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.6 7.6 10 12l4.4-4.4 1.1 1.1L10 14.2 4.5 8.7l1.1-1.1Z"/>
                  </svg>
                </button>

                @if (indicatorDropdownOpen()) {
                  <div class="indicator-combo__panel">
                    <input
                      #indicatorSearchInput
                      type="text"
                      [value]="indicatorSearch()"
                      placeholder="Buscar indicador..."
                      (input)="onIndicatorSearch($event)"
                      (keydown.escape)="closeIndicatorDropdown()"
                    />
                    <div class="indicator-combo__list">
                      @for (indicator of filteredIndicators(); track indicator.id) {
                        <button type="button" class="indicator-combo__option" (click)="selectIndicator(indicator)">
                          <strong>{{ indicator.code }}</strong>
                          <span>{{ indicator.name }}</span>
                        </button>
                      } @empty {
                        <div class="indicator-combo__empty">No se encontraron indicadores.</div>
                      }
                    </div>
                  </div>
                }
              </div>
              <input type="hidden" formControlName="indicatorId" />
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
              <input
                type="text"
                formControlName="expectedValue"
                inputmode="decimal"
                placeholder="0 a 100"
                (input)="sanitizeExpectedValueControl()"
              />
              <small class="field__hint">{{ expectedValueHintText() }}</small>
            </label>

            <label class="field">
              <span class="field__label">Peso (%) <span class="field__required">*</span></span>
              <input
                type="text"
                formControlName="weight"
                inputmode="decimal"
                placeholder="0 a 100%"
                (input)="sanitizePercentControl('weight')"
              />
              <small class="field__hint">Ingrese un numero de 0 a 100. Puede incluir %.</small>
            </label>

            <label class="field">
              <span class="field__label">Plazo inicial <span class="field__required">*</span></span>
              <input type="date" formControlName="startDate" />
            </label>

            <label class="field">
              <span class="field__label">Plazo final <span class="field__required">*</span></span>
              <input type="date" formControlName="endDate" />
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

      @if (changeRequestGoal(); as rqGoal) {
        <div class="modal-backdrop goal-modal-backdrop--layered" role="presentation"></div>
        <section
          class="modal modal--operational"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-request-title"
        >
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow modal__eyebrow--accent">Solicitud sobre meta</p>
              <h2 id="change-request-title">Solicitar modificacion</h2>
            </div>
            <button
              type="button"
              class="modal__close modal__close--bordered"
              aria-label="Cerrar"
              [disabled]="changeRequestSubmitting()"
              (click)="closeChangeRequestModal()"
            >
              ×
            </button>
          </div>

          <div class="modal-panel modal-panel--muted">
            <div class="modal-panel__kv">
              <span>Meta</span>
              <strong>{{ rqGoal.title }}</strong>
            </div>
            <div class="modal-panel__kv">
              <span>Evaluado</span>
              <strong>{{ rqGoal.evaluatedName || 'Sin evaluado' }}</strong>
            </div>
            <div class="modal-panel__kv">
              <span>Indicador</span>
              <strong>{{ rqGoal.indicatorName || 'Sin indicador' }}</strong>
            </div>
            <div class="modal-panel__kv">
              <span>Valor esperado</span>
              <strong>{{ rqGoal.expectedValue }}</strong>
            </div>
            <div class="modal-panel__kv">
              <span>Peso</span>
              <strong>{{ rqGoal.weight }}%</strong>
            </div>
          </div>

          @if (changeRequestError()) {
            <div class="alert alert--error modal-panel__alert" role="alert">
              <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
              </svg>
              <span>{{ changeRequestError() }}</span>
            </div>
          }

          <form class="modal-form" (submit)="submitChangeRequest($event)">
            <label class="modal-field">
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

            <label class="modal-field">
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

            <label class="modal-field">
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

            <div class="modal-form__actions">
              <button
                type="button"
                class="btn btn--outline-neutral btn--sm"
                [disabled]="changeRequestSubmitting()"
                (click)="closeChangeRequestModal()"
              >
                Cancelar
              </button>
              <button type="submit" class="btn btn--primary btn--sm" [disabled]="!canSubmitChangeRequest()">
                {{ changeRequestSubmitting() ? 'Enviando...' : 'Enviar solicitud' }}
              </button>
            </div>
          </form>
        </section>
      }

      @if (orhSubmissionGoal(); as orhGoal) {
        <div class="modal-backdrop goal-modal-backdrop--layered" role="presentation"></div>
        <section
          class="modal modal--operational"
          role="dialog"
          aria-modal="true"
          aria-labelledby="orh-submission-title"
        >
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow modal__eyebrow--accent">Remision formal</p>
              <h2 id="orh-submission-title">Enviar a ORH</h2>
            </div>
            <button
              type="button"
              class="modal__close modal__close--bordered"
              aria-label="Cerrar"
              [disabled]="orhSubmissionSubmitting()"
              (click)="closeOrhSubmissionModal()"
            >
              ×
            </button>
          </div>

          <div class="modal-panel modal-panel--muted">
            <div class="modal-panel__kv">
              <span>Meta</span>
              <strong>{{ orhGoal.title }}</strong>
            </div>
            <div class="modal-panel__kv">
              <span>Evaluado</span>
              <strong>{{ orhGoal.evaluatedName || 'Sin evaluado' }}</strong>
            </div>
            <div class="modal-panel__kv">
              <span>Indicador</span>
              <strong>{{ orhGoal.indicatorName || 'Sin indicador' }}</strong>
            </div>
            <div class="modal-panel__kv">
              <span>Valor esperado</span>
              <strong>{{ orhGoal.expectedValue }}</strong>
            </div>
            <div class="modal-panel__kv">
              <span>Peso</span>
              <strong>{{ orhGoal.weight }}%</strong>
            </div>
          </div>

          @if (orhSubmissionError()) {
            <div class="alert alert--error modal-panel__alert" role="alert">
              <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
              </svg>
              <span>{{ orhSubmissionError() }}</span>
            </div>
          }

          <form class="modal-form" (submit)="submitOrhSubmission($event)">
            <p class="modal-form__help">
              Esta accion registra la remision formal de la meta a ORH para conocimiento o atencion futura.
            </p>

            <label class="modal-field">
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

            <div class="modal-form__actions">
              <button
                type="button"
                class="btn btn--outline-neutral btn--sm"
                [disabled]="orhSubmissionSubmitting()"
                (click)="closeOrhSubmissionModal()"
              >
                Cancelar
              </button>
              <button type="submit" class="btn btn--primary btn--sm" [disabled]="!canSubmitOrhSubmission()">
                {{ orhSubmissionSubmitting() ? 'Enviando...' : 'Enviar a ORH' }}
              </button>
            </div>
          </form>
        </section>
      }
    </section>
  `,
  styles: [`
    :host { display:block; min-width:0; }

    /* â”€â”€ Page layout â”€â”€ */
    .page { padding:20px 24px 28px; max-width:1120px; margin:0 auto; min-width:0; overflow-x:clip; }

    /* â”€â”€ Breadcrumb â”€â”€ */
    .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:16px; font-size:0.75rem; flex-wrap:wrap; }
    .breadcrumb__link { color:#7f1714; text-decoration:none; font-weight:500; }
    .breadcrumb__link:hover { text-decoration:underline; }
    .breadcrumb__sep { color:#b0b8c4; }
    .breadcrumb__current { color:#667085; font-weight:500; }

    /* â”€â”€ Page header â”€â”€ */
    .page__header { display:flex; justify-content:space-between; gap:16px; align-items:flex-end; margin-bottom:20px; flex-wrap:wrap; min-width:0; }
    .page__header-left { min-width:0; }
    .page__eyebrow { margin:0 0 6px; font-size:0.7rem; font-weight:700; letter-spacing:0.1em; color:#8b95a5; text-transform:uppercase; }
    .page__header h1 { margin:0; color:#1a1a2e; font-size:1.5rem; font-weight:700; line-height:1.2; letter-spacing:-0.01em; }
    .page__subtitle { margin:6px 0 0; color:#667085; max-width:720px; font-size:0.84rem; line-height:1.55; }
    .page__actions { display:flex; gap:8px; flex-wrap:wrap; }

    /* â”€â”€ Alert â”€â”€ */
    .alert { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; margin-bottom:16px; font-size:0.82rem; }
    .alert--error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
    .alert__icon { width:18px; height:18px; fill:currentColor; flex:0 0 auto; }

    /* â”€â”€ Buttons â”€â”€ */
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:36px; padding:0 16px; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.15s ease; text-decoration:none; border:none; white-space:nowrap; }
    .btn__icon { width:15px; height:15px; fill:currentColor; flex:0 0 auto; }
    .btn--sm { min-height:32px; padding:0 12px; font-size:0.78rem; }
    .btn--xs { min-height:28px; padding:0 10px; font-size:0.74rem; border-radius:6px; }
    .btn--icon { min-height:30px; height:30px; width:30px; padding:0; gap:0; border-radius:6px; flex:0 0 auto; }
    .btn--icon .btn__icon { width:15px; height:15px; }
    .btn--icon.actions-menu-trigger { background:#fff; border:1px solid #d0d5dd; color:#475467; }
    .btn--icon.actions-menu-trigger:hover { background:#f9fafb; border-color:#98a2b3; color:#1a1a2e; }
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

    /* â”€â”€ Card panel â”€â”€ */
    .card {
      border-radius:12px;
      background:#fff;
      border:1px solid #e5e7eb;
      box-shadow:0 1px 3px rgba(0,0,0,0.04);
      overflow:visible;
    }
    .card__header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; border-bottom:1px solid #f1f3f5; flex-wrap:wrap; }
    .card__header-left { display:flex; align-items:flex-start; gap:12px; }
    .card__header-icon { width:32px; height:32px; border-radius:8px; background:rgba(127,23,20,0.06); display:grid; place-items:center; flex:0 0 auto; }
    .card__header-icon svg { width:16px; height:16px; fill:#7f1714; }
    .card__title { margin:0; font-size:0.95rem; color:#1a1a2e; font-weight:700; line-height:1.3; }
    .card__desc { margin:2px 0 0; color:#8b95a5; font-size:0.76rem; line-height:1.4; }
    .card__count { font-size:0.76rem; color:#667085; font-weight:600; background:#f1f3f5; padding:4px 10px; border-radius:999px; white-space:nowrap; }

    /* â”€â”€ Loading â”€â”€ */
    .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 16px; color:#667085; font-size:0.84rem; }
    .loading-spinner { width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#7f1714; border-radius:50%; animation:spin 0.7s linear infinite; }
    .loading-spinner--sm { width:14px; height:14px; border-width:2px; border-color:rgba(255,255,255,0.3); border-top-color:#fff; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* â”€â”€ Empty state â”€â”€ */
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:48px 18px; text-align:center; }
    .empty-state__icon { width:32px; height:32px; fill:#c4ccd6; }
    .empty-state p { margin:0; color:#8b95a5; font-size:0.84rem; }

    /* â”€â”€ Desktop table â”€â”€ */
    .desktop-table {
      display:block;
      width:100%;
      overflow-x:clip;
      overflow-y:visible;
    }
    table { width:100%; border-collapse:collapse; table-layout:auto; }
    th, td { padding:9px 10px; text-align:left; border-bottom:1px solid #f1f3f5; vertical-align:middle; font-size:0.70rem; }
    th { font-size:0.56rem; text-transform:uppercase; letter-spacing:0.06em; color:#566376; background:#e9e9e996; font-weight:600; }
    td { color:#344054; line-height:1.45; }
    .th--num, .td--num { width:36px; text-align:center; color:#8b95a5; font-weight:600; font-size:0.74rem; }
    .th--actions { text-align:right; overflow:visible; white-space:nowrap; width:1%; }
    td.td--actions-col { overflow:visible; vertical-align:middle; white-space:nowrap; width:1%; max-width:none; min-width:0; }
    .td--title { font-weight:600; color:#1a1a2e; max-width:260px; overflow-wrap:anywhere; }
    .td--evidence { font-weight:700; color:#1a1a2e; text-align:center; }
    tbody tr:hover { background:#fafbfc; }
    .actions-cell {
      display:flex;
      gap:6px;
      justify-content:flex-end;
      align-items:center;
      flex-wrap:nowrap;
      min-width:0;
    }

    .actions-menu { position:relative; }
    .actions-menu-summary {
      align-items:center;
      background:#fff;
      border:1px solid #d0d5dd;
      border-radius:6px;
      color:#475467;
      cursor:pointer;
      display:inline-flex;
      font-size:0.74rem;
      font-weight:600;
      justify-content:center;
      list-style:none;
      min-height:28px;
      padding:0 10px;
      user-select:none;
    }
    .actions-menu summary::-webkit-details-marker { display:none; }
    .actions-menu-summary:hover { background:#f9fafb; border-color:#98a2b3; }
    .actions-menu-trigger {
      font:inherit;
      appearance:none;
      -webkit-appearance:none;
      align-items:center;
      background:#fff;
      border:1px solid #d0d5dd;
      border-radius:6px;
      color:#475467;
      cursor:pointer;
      display:inline-flex;
      font-size:0.74rem;
      font-weight:600;
      justify-content:center;
      min-height:28px;
      padding:0 10px;
      user-select:none;
    }
    .actions-menu-trigger:hover { background:#f9fafb; border-color:#98a2b3; }
    .goal-more-popover {
      border:none;
      border-radius:10px;
      box-shadow:0 16px 40px rgba(15,23,42,0.18);
      display:grid;
      gap:2px;
      margin:0;
      min-width:212px;
      padding:6px;
      width:max-content;
      box-sizing:border-box;
      background:#fff;
      border-inline:1px solid #e5e7eb;
      border-block:1px solid #e5e7eb;
      opacity:0;
      visibility:hidden;
      transition:opacity 0.08s ease;
    }
    .goal-more-popover.goal-more-popover--anchored {
      opacity:1;
      visibility:visible;
    }
    .goal-more-popover::backdrop {
      background:transparent;
      pointer-events:auto;
    }
    .goal-more-popover:focus-visible {
      outline:2px solid rgba(127,23,20,0.35);
      outline-offset:2px;
    }
    .goal-more-popover a:hover,
    .goal-more-popover .actions-menu__button:hover {
      background:rgba(127,23,20,0.06);
      color:#7f1714;
    }
    .goal-more-popover a,
    .goal-more-popover .actions-menu__button {
      background:transparent;
      border:0;
      border-radius:6px;
      color:#0f172a;
      cursor:pointer;
      font-family:inherit;
      font-size:0.78rem;
      font-weight:600;
      padding:9px 10px 9px 32px;
      text-align:left;
      text-decoration:none;
      width:100%;
      box-sizing:border-box;
      display:flex;
      align-items:center;
      gap:8px;
      position:relative;
    }
    .goal-more-popover .actions-menu__button { width:100%; }
    .goal-more-popover .actions-menu__icon {
      position:absolute;
      left:9px;
      top:50%;
      transform:translateY(-50%);
      width:14px;
      height:14px;
      fill:#7f1714;
      opacity:0.85;
      flex:0 0 auto;
    }
    .goal-more-popover .actions-menu__group-label,
    .actions-menu__panel .actions-menu__group-label {
      display:block;
      padding:8px 10px 4px;
      font-size:0.62rem;
      font-weight:700;
      letter-spacing:0.08em;
      text-transform:uppercase;
      color:#94a3b8;
      pointer-events:none;
    }
    .goal-more-popover .actions-menu__divider,
    .actions-menu__panel .actions-menu__divider {
      height:1px;
      background:#eef0f3;
      margin:4px 0;
    }
    .goal-more-popover .actions-menu__button--primary,
    .actions-menu__panel .actions-menu__button--primary {
      color:#7f1714;
      font-weight:700;
      background:rgba(127,23,20,0.04);
    }
    .goal-more-popover .actions-menu__button--primary:hover,
    .actions-menu__panel .actions-menu__button--primary:hover {
      background:rgba(127,23,20,0.10);
    }
    .goal-more-popover .actions-menu__button--primary .actions-menu__icon,
    .actions-menu__panel .actions-menu__button--primary .actions-menu__icon {
      opacity:1;
    }
    .actions-menu__panel {
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius:8px;
      box-shadow:0 14px 38px rgba(15,23,42,0.12);
      display:grid;
      gap:4px;
      min-width:176px;
      padding:8px;
      position:absolute;
      right:0;
      top:calc(100% + 6px);
      z-index:85;
    }
    .actions-menu__panel a,
    .actions-menu__button {
      background:transparent;
      border:0;
      border-radius:6px;
      color:#0f172a;
      cursor:pointer;
      font-size:0.78rem;
      font-weight:600;
      padding:9px 10px 9px 32px;
      text-align:left;
      text-decoration:none;
      display:flex;
      align-items:center;
      gap:8px;
      position:relative;
    }
    .actions-menu__panel .actions-menu__icon {
      position:absolute;
      left:9px;
      top:50%;
      transform:translateY(-50%);
      width:14px;
      height:14px;
      fill:#7f1714;
      opacity:0.85;
      flex:0 0 auto;
    }
    .actions-menu__panel a:hover,
    .actions-menu__button:hover {
      background:rgba(127,23,20,0.06);
      color:#7f1714;
    }
    .actions-menu--mobile .actions-menu-summary { width:100%; justify-content:center; }
    .actions-menu--mobile .actions-menu__panel { position:static; margin-top:8px; width:100%; }

    /* â”€â”€ Mobile cards â”€â”€ */
    .mobile-cards { display:none; padding:12px; gap:10px; }
    .goal-card { border:1px solid #e5e7eb; border-radius:10px; background:#fff; padding:14px; display:flex; flex-direction:column; gap:10px; }
    .goal-card__top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .goal-card__title { color:#1a1a2e; font-size:0.86rem; line-height:1.35; overflow-wrap:anywhere; }
    .goal-card__weight { font-size:0.74rem; font-weight:700; color:#7f1714; background:rgba(127,23,20,0.08); padding:3px 10px; border-radius:999px; white-space:nowrap; }
    .goal-card__meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .goal-card__field { display:flex; flex-direction:column; gap:2px; }
    .goal-card__field span { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.06em; color:#8b95a5; font-weight:600; }
    .goal-card__field strong { color:#344054; font-size:0.78rem; font-weight:500; line-height:1.4; overflow-wrap:anywhere; }
    .goal-card__actions { display:grid; grid-template-columns:1fr; gap:8px; }

    /* â”€â”€ Pagination â”€â”€ */
    .pagination { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 18px; border-top:1px solid #f1f3f5; flex-wrap:wrap; }
    .pagination__info { font-size:0.76rem; color:#667085; font-weight:500; }
    .pagination__controls { display:flex; align-items:center; gap:4px; }
    .pagination__page { font-size:0.78rem; color:#1a1a2e; font-weight:600; min-width:52px; text-align:center; }

    /* â”€â”€ Context bar (modal) â”€â”€ */
    .context-bar { display:flex; align-items:stretch; gap:0; margin-bottom:4px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
    .context-bar__item { flex:1; padding:12px 14px; display:flex; flex-direction:column; gap:3px; min-width:0; }
    .context-bar__divider { width:1px; background:#e5e7eb; flex:0 0 1px; }
    .context-bar__label { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:700; }
    .context-bar__value { color:#1a1a2e; font-size:0.82rem; font-weight:600; line-height:1.4; overflow-wrap:anywhere; word-break:break-word; }

    /* â”€â”€ Table tweaks â”€â”€ */
    .th--stat, .td--stat { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; font-size:0.70rem; }
    .field__readonly {
      background:#f9fafb;
      color:#475467;
      cursor:default;
    }
    textarea.field__readonly {
      resize:vertical;
      min-height:92px;
    }

    /* â”€â”€ Form â”€â”€ */
    .form-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; padding:4px 0 0; min-width:0; }
    .field { display:grid; gap:6px; min-width:0; }
    .field__label { font-size:0.78rem; color:#344054; font-weight:600; }
    .field__required { color:#dc2626; }
    .field__hint { color:#8b95a5; font-size:0.7rem; line-height:1.35; }
    .field--full, .form-actions { grid-column:1 / -1; }
    input, textarea, select { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px; padding:9px 12px; font:inherit; background:#fff; color:#1a1a2e; box-sizing:border-box; font-size:0.84rem; min-height:38px; }
    input:focus, textarea:focus, select:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    textarea { resize:vertical; min-height:88px; max-width:100%; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:6px; min-width:0; }

    .indicator-combo { position:relative; min-width:0; }
    .indicator-combo__control { width:100%; min-height:38px; border:1px solid #d0d5dd; border-radius:8px; background:#fff; color:#1a1a2e; padding:9px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; font:inherit; font-size:0.84rem; cursor:pointer; text-align:left; }
    .indicator-combo__control:hover { border-color:#98a2b3; }
    .indicator-combo__control:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    .indicator-combo__control span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .indicator-combo__control svg { width:16px; height:16px; fill:#667085; flex:0 0 auto; }
    .indicator-combo__control--placeholder { color:#8b95a5; }
    .indicator-combo__panel { position:absolute; z-index:120; top:calc(100% + 6px); left:0; right:0; padding:8px; border:1px solid #d0d5dd; border-radius:10px; background:#fff; box-shadow:0 16px 42px rgba(15,23,42,0.14); display:grid; gap:8px; }
    .indicator-combo__panel input { min-height:34px; font-size:0.8rem; }
    .indicator-combo__list { display:grid; gap:4px; max-height:220px; overflow:auto; }
    .indicator-combo__option { border:none; background:#fff; border-radius:8px; padding:9px 10px; text-align:left; cursor:pointer; display:grid; gap:2px; color:#1a1a2e; }
    .indicator-combo__option:hover { background:#f8fafc; }
    .indicator-combo__option strong { font-size:0.76rem; font-weight:700; color:#7f1714; }
    .indicator-combo__option span { font-size:0.78rem; color:#475467; line-height:1.35; overflow-wrap:anywhere; }
    .indicator-combo__empty { color:#8b95a5; font-size:0.78rem; padding:10px; text-align:center; }

    /* â”€â”€ Modal â”€â”€ */
    .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,0.35); z-index:90; backdrop-filter:blur(2px); }
    .modal { position:fixed; inset:50% auto auto 50%; transform:translate(-50%,-50%); width:min(720px, calc(100vw - 32px)); max-height:calc(100vh - 32px); overflow:auto; border-radius:14px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 20px 60px rgba(15,23,42,0.15); padding:22px; z-index:100; display:grid; gap:14px; }
    .modal__header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .modal__eyebrow { margin:0 0 4px; font-size:0.68rem; font-weight:700; letter-spacing:0.08em; color:#8b95a5; text-transform:uppercase; }
    .modal__header h2 { margin:0; font-size:1.05rem; color:#1a1a2e; font-weight:700; }
    .modal__subtitle { margin:4px 0 0; color:#667085; font-size:0.78rem; line-height:1.5; }
    .modal__close { border:none; background:transparent; color:#8b95a5; width:32px; height:32px; border-radius:8px; cursor:pointer; display:inline-grid; place-items:center; padding:0; }
    .modal__close svg { width:16px; height:16px; fill:currentColor; }
    .modal__close:hover { background:#f1f3f5; color:#475467; }
    .modal__eyebrow--accent { color:#2563eb; }
    .modal__close--bordered {
      border:1px solid #d0d5dd;
      background:#fff;
      color:#475467;
      font-size:1.2rem;
      line-height:1;
    }
    .goal-modal-backdrop--layered { z-index:115; }
    .modal.modal--operational { z-index:125; padding:0; gap:0; overflow:hidden; display:block; }
    .modal--operational > .modal__header { padding:18px 22px; border-bottom:1px solid #e5e7eb; }
    .modal-panel {
      display:grid;
      gap:12px;
      grid-template-columns:repeat(2, minmax(0,1fr));
      padding:16px 22px;
      border-bottom:1px solid #e5e7eb;
    }
    .modal-panel--muted { background:#f8fafc; }
    .modal-panel__kv { display:flex; flex-direction:column; gap:4px; min-width:0; }
    .modal-panel__kv span { font-size:0.72rem; font-weight:700; letter-spacing:0.06em; color:#8b95a5; text-transform:uppercase; }
    .modal-panel__kv strong { color:#1a1a2e; font-size:0.86rem; overflow-wrap:anywhere; }
    .modal-panel__alert { margin:0 22px; }
    .modal-form { display:grid; gap:14px; padding:18px 22px 22px; }
    .modal-form__help { margin:0; color:#475467; font-size:0.82rem; line-height:1.5; }
    .modal-field { display:grid; gap:6px; }
    .modal-field span { font-size:0.72rem; font-weight:700; color:#667085; text-transform:uppercase; letter-spacing:0.05em; }
    .modal-field select,
    .modal-field textarea {
      width:100%;
      border:1px solid #d0d5dd;
      border-radius:8px;
      padding:10px 12px;
      font:inherit;
      font-size:0.84rem;
      box-sizing:border-box;
      min-height:40px;
      background:#fff;
      color:#1a1a2e;
    }
    .modal-field textarea { resize:vertical; line-height:1.45; }
    .modal-field select:focus,
    .modal-field textarea:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    .modal-form__actions { display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; }

    /* â”€â”€ Responsive â”€â”€ */
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
      .modal-panel { grid-template-columns:1fr; }
      .modal-form__actions { flex-direction:column-reverse; }
      .modal-form__actions .btn { width:100%; }
      .pagination { flex-direction:column; align-items:center; }
    }
    @media (max-width: 560px) {
      .modal { width:calc(100vw - 16px); max-height:calc(100vh - 16px); padding:16px; border-radius:12px; }
    }
  `]
})
export class GoalListComponent {
  @ViewChild('indicatorSearchInput') private indicatorSearchInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly hrService = inject(HrService);
  private readonly indicatorsService = inject(IndicatorsService);
  private readonly goalsService = inject(GoalsService);
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly toastService = inject(UiToastService);

  readonly goals = signal<GoalSummary[]>([]);
  readonly assignments = signal<HrAssignmentSummary[]>([]);
  readonly indicators = signal<Indicator[]>([]);
  readonly selectedIndicator = signal<Indicator | null>(null);
  readonly indicatorSearch = signal('');
  readonly indicatorDropdownOpen = signal(false);
  private readonly goalActionsRepositionHandlers = new WeakMap<HTMLElement, () => void>();
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

  readonly expectedValueHintText = computed(() => {
    const indicator = this.selectedIndicator();
    switch (resolveExpectedValueInputKind(indicator)) {
      case 'numeric':
        return 'El valor ingresado se considera en Cantidad(Valor entero)';
      case 'percentage':
        return 'El valor ingresado se considera en Porcentaje';
      default:
        return DEFAULT_EXPECTED_VALUE_HINT;
    }
  });

  readonly calificarModalOpen = signal(false);
  readonly ratingTargetGoal = signal<GoalSummary | null>(null);
  readonly savingRating = signal(false);
  readonly ratingAchievedDraft = signal('');
  readonly ratingFormError = signal('');

  readonly evaluatedIdsByAssignment = signal<Record<number, number>>({});
  readonly evaluationLookupLoaded = signal(false);
  readonly evaluationLookupLoading = signal(false);
  readonly sessionReady = signal(false);

  readonly changeRequestGoal = signal<GoalSummary | null>(null);
  readonly changeRequestType = signal<GoalChangeRequestType | ''>('');
  readonly changeRequestReason = signal('');
  readonly changeRequestComment = signal('');
  readonly changeRequestSubmitting = signal(false);
  readonly changeRequestError = signal('');

  readonly orhSubmissionGoal = signal<GoalSummary | null>(null);
  readonly orhSubmissionComment = signal('');
  readonly orhSubmissionSubmitting = signal(false);
  readonly orhSubmissionError = signal('');

  readonly changeRequestTypes: ReadonlyArray<{ value: GoalChangeRequestType; label: string }> = [
    { value: 'TITULO', label: 'Titulo de la meta' },
    { value: 'DESCRIPCION', label: 'Descripcion' },
    { value: 'INDICADOR', label: 'Indicador' },
    { value: 'VALOR_ESPERADO', label: 'Valor esperado' },
    { value: 'PESO', label: 'Peso' },
    { value: 'OTRO', label: 'Otro' }
  ];

  readonly canReviewGoals = computed(() => this.authService.featureAccess()?.canReviewEvidences ?? false);

  readonly ratingPreviewScoreLabel = computed(() => {
    const g = this.ratingTargetGoal();
    const draft = this.ratingAchievedDraft().trim().replace(/%/g, '').replace(',', '.');
    if (!g || draft === '') {
      return '—';
    }
    const achieved = Number(draft);
    const expected = g.expectedValue;
    const weight = g.weight;
    if (
      !Number.isFinite(achieved) ||
      achieved < 0 ||
      !Number.isFinite(expected) ||
      expected <= 0 ||
      !Number.isFinite(weight)
    ) {
      return '—';
    }
    const proportional = (achieved * weight) / expected;
    const capped = Math.min(MAX_GOAL_SCORE, proportional);
    return capped.toFixed(2);
  });

  readonly form = this.fb.group({
    assignmentId: [null as number | null, [Validators.required]],
    indicatorId: [null as number | null, [Validators.required]],
    title: ['', [Validators.required]],
    description: [''],
    expectedValue: [null as string | null, [Validators.required, percentRangeValidator()]],
    weight: [null as string | null, [Validators.required, percentRangeValidator()]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]]
  });

  private pendingRouteMode: 'list' | 'create' | 'edit' = 'list';
  private pendingRouteGoalId: number | null = null;
  private handledRouteKey = '';

  constructor() {
    this.authService
      .me()
      .pipe(take(1))
      .subscribe({
        next: () => this.markSessionReady(),
        error: () => this.markSessionReady()
      });

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

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}/${year}`;
  }

  goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
  }

  formatAchievedPercent(goal: GoalSummary): string {
    if (goal.achievedValue == null || goal.expectedValue == null || goal.expectedValue === 0) {
      return '—';
    }
    return `${((goal.achievedValue / goal.expectedValue) * 100).toFixed(2)}%`;
  }

  formatCalculatedScore(goal: GoalSummary): string {
    if (goal.calculatedScore == null || !Number.isFinite(goal.calculatedScore)) {
      return '—';
    }
    return Number(goal.calculatedScore).toFixed(2);
  }

  formatPercentPlain(value: number): string {
    return `${value}%`;
  }

  openCalificarModal(goal: GoalSummary): void {
    if (!this.canReviewGoals()) {
      return;
    }
    this.ratingFormError.set('');
    this.ratingTargetGoal.set(goal);
    const initial =
      goal.achievedValue != null && Number.isFinite(goal.achievedValue) ? String(goal.achievedValue) : '';
    this.ratingAchievedDraft.set(initial);
    this.calificarModalOpen.set(true);
  }

  closeCalificarModal(): void {
    this.calificarModalOpen.set(false);
    this.ratingTargetGoal.set(null);
    this.ratingAchievedDraft.set('');
    this.ratingFormError.set('');
    this.savingRating.set(false);
  }

  onRatingAchievedInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    let raw = el.value.replace(/,/g, '.').replace(/[^\d.]/g, '');
    const firstDot = raw.indexOf('.');
    if (firstDot >= 0) {
      raw = `${raw.slice(0, firstDot + 1)}${raw.slice(firstDot + 1).replace(/\./g, '')}`;
    }
    if (raw !== el.value) {
      el.value = raw;
    }
    this.ratingAchievedDraft.set(raw);
  }

  submitCalificarMeta(): void {
    const g = this.ratingTargetGoal();
    if (!this.canReviewGoals() || !g) {
      return;
    }
    const text = this.ratingAchievedDraft().trim().replace(/%/g, '').replace(',', '.');
    const achieved = Number(text);
    if (text === '' || !Number.isFinite(achieved) || achieved < 0) {
      this.ratingFormError.set('Ingrese un valor alcanzado valido mayor o igual a 0.');
      return;
    }
    const expected = g.expectedValue;
    if (Number.isFinite(expected) && expected > 0 && achieved > expected * 2) {
      const confirmed = window.confirm(
        `El valor alcanzado (${achieved}) supera el doble del valor meta (${expected}). ¿Confirma que desea registrarlo?`
      );
      if (!confirmed) {
        return;
      }
    }
    this.ratingFormError.set('');
    this.savingRating.set(true);
    this.goalsService.rateGoalAchievement(g.id, { achievedValue: achieved }).subscribe({
      next: (detail: GoalDetail) => {
        this.goals.update((rows) =>
          rows.map((row) =>
            row.id === detail.id
              ? {
                  ...row,
                  achievedValue: detail.achievedValue ?? null,
                  calculatedScore: detail.calculatedScore ?? null
                }
              : row
          )
        );
        this.toastService.success('Calificación registrada', 'La meta fue calificada correctamente.');
        this.closeCalificarModal();
      },
      error: (error: Error) => {
        this.ratingFormError.set(error.message || 'No fue posible registrar la calificacion.');
        this.savingRating.set(false);
      }
    });
  }

  markSessionReady(): void {
    this.sessionReady.set(true);
    this.tryLoadEvaluationLookup();
  }

  evaluatedIdFor(goal: GoalSummary): number | null {
    return this.evaluatedIdsByAssignment()[goal.assignmentId] ?? null;
  }

  hasSecondaryActions(goal: GoalSummary): boolean {
    return (
      this.canRequestGoalChange() ||
      this.canSendGoalToOrh() ||
      (this.evaluatedIdFor(goal) !== null &&
        (this.canViewFinalEvaluations() || this.canViewDocuments() || this.canViewImprovements()))
    );
  }

  canViewFinalEvaluations(): boolean {
    return this.authService.canAccessFeature('finalEvaluationsView');
  }

  canViewDocuments(): boolean {
    return this.authService.canAccessFeature('documents');
  }

  canViewImprovements(): boolean {
    return this.authService.canAccessFeature('improvements');
  }

  canRequestGoalChange(): boolean {
    const actor = this.authService.functionalActor();
    return (
      this.authService.canAccessFeature('goalsView') &&
      (actor === 'EVALUADOR' || actor === 'EVALUADO' || actor === 'EVALUADOR_Y_EVALUADO')
    );
  }

  canSendGoalToOrh(): boolean {
    const actor = this.authService.functionalActor();
    return (
      this.authService.canAccessFeature('goalsView') &&
      (actor === 'EVALUADOR' || actor === 'EVALUADOR_Y_EVALUADO')
    );
  }

  goalMorePopoverId(goalId: number): string {
    return `goal-more-pop-${goalId}`;
  }

  onGoalMorePopoverToggle(event: Event): void {
    const toggleEvent = event as ToggleEvent;
    const panel = toggleEvent.target;
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    if (toggleEvent.newState !== 'open') {
      panel.classList.remove('goal-more-popover--anchored');
      panel.style.top = '';
      panel.style.right = '';
      panel.style.left = '';
      panel.style.position = '';
      panel.style.margin = '';
      panel.style.boxSizing = '';
      panel.style.maxHeight = '';
      panel.style.maxWidth = '';
      panel.style.overflowY = '';
      this.detachGoalActionsReposition(panel);
      return;
    }

    this.scheduleAnchorGoalActionsPopover(panel, 0);
    this.attachGoalActionsReposition(panel);
  }

  private dismissGoalActionsPopover(goalId: number): void {
    const panel = document.getElementById(this.goalMorePopoverId(goalId)) as HTMLElement & {
      hidePopover?: () => void;
    };
    if (typeof panel?.hidePopover === 'function') {
      panel.hidePopover();
    }
  }

  private scheduleAnchorGoalActionsPopover(panel: HTMLElement, attempt: number): void {
    requestAnimationFrame(() => {
      const ok = this.anchorGoalActionsPopover(panel);
      if (!ok && attempt < 3) {
        this.scheduleAnchorGoalActionsPopover(panel, attempt + 1);
        return;
      }
      panel.classList.add('goal-more-popover--anchored');
    });
  }

  private attachGoalActionsReposition(panel: HTMLElement): void {
    this.detachGoalActionsReposition(panel);
    const handler = () => this.anchorGoalActionsPopover(panel);
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    this.goalActionsRepositionHandlers.set(panel, handler);
  }

  private detachGoalActionsReposition(panel: HTMLElement): void {
    const handler = this.goalActionsRepositionHandlers.get(panel);
    if (!handler) {
      return;
    }
    window.removeEventListener('scroll', handler, true);
    window.removeEventListener('resize', handler);
    this.goalActionsRepositionHandlers.delete(panel);
  }

  private anchorGoalActionsPopover(panel: HTMLElement): boolean {
    if (!panel.id) {
      return false;
    }

    const trigger = document.querySelector<HTMLElement>(
      `[popovertarget="${CSS.escape(panel.id)}"]`
    );
    if (!trigger) {
      return false;
    }

    const r = trigger.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      return false;
    }

    const gutter = 6;
    const pad = 8;
    panel.style.margin = '0';
    panel.style.boxSizing = 'border-box';
    panel.style.position = 'fixed';

    panel.style.right = `${Math.max(pad, window.innerWidth - r.right)}px`;
    panel.style.left = 'auto';

    let topPx = r.bottom + gutter;
    panel.style.top = `${topPx}px`;

    panel.style.maxHeight = `${window.innerHeight - topPx - pad}px`;

    requestAnimationFrame(() => {
      let bounds = panel.getBoundingClientRect();
      if (bounds.bottom > window.innerHeight - pad) {
        topPx = Math.max(pad, r.top - bounds.height - gutter);
        panel.style.top = `${topPx}px`;
        panel.style.maxHeight = `${Math.max(pad * 4, window.innerHeight - topPx - pad)}px`;
        bounds = panel.getBoundingClientRect();
      }

      if (bounds.top < pad) {
        panel.style.top = `${pad}px`;
        panel.style.maxHeight = `${window.innerHeight - 2 * pad}px`;
      }

      panel.style.overflowY = panel.scrollHeight > panel.clientHeight + 4 ? 'auto' : '';

      const b2 = panel.getBoundingClientRect();
      if (b2.right > window.innerWidth - pad) {
        panel.style.right = `${pad}px`;
      }
      if (b2.left < pad) {
        panel.style.left = `${pad}px`;
        panel.style.right = 'auto';
        panel.style.maxWidth = `${window.innerWidth - 2 * pad}px`;
      }
    });

    return true;
  }

  openChangeRequestModal(goal: GoalSummary): void {
    this.dismissGoalActionsPopover(goal.id);
    this.changeRequestError.set('');
    this.changeRequestGoal.set(goal);
    this.changeRequestType.set('');
    this.changeRequestReason.set('');
    this.changeRequestComment.set('');
  }

  closeChangeRequestModal(): void {
    if (this.changeRequestSubmitting()) {
      return;
    }
    this.changeRequestGoal.set(null);
    this.changeRequestType.set('');
    this.changeRequestReason.set('');
    this.changeRequestComment.set('');
    this.changeRequestError.set('');
  }

  updateChangeRequestType(event: Event): void {
    this.changeRequestType.set(this.modalEventTextValue(event) as GoalChangeRequestType | '');
    this.changeRequestError.set('');
  }

  updateChangeRequestReason(event: Event): void {
    this.changeRequestReason.set(this.modalEventTextValue(event));
    this.changeRequestError.set('');
  }

  updateChangeRequestComment(event: Event): void {
    this.changeRequestComment.set(this.modalEventTextValue(event));
    this.changeRequestError.set('');
  }

  canSubmitChangeRequest(): boolean {
    return (
      !this.changeRequestSubmitting() &&
      this.changeRequestGoal() !== null &&
      this.changeRequestType() !== '' &&
      this.changeRequestReason().trim().length > 0
    );
  }

  submitChangeRequest(event: Event): void {
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
    this.changeRequestError.set('');

    this.goalsService
      .createGoalChangeRequest(goal.id, payload)
      .pipe(finalize(() => this.changeRequestSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.changeRequestGoal.set(null);
          this.changeRequestType.set('');
          this.changeRequestReason.set('');
          this.changeRequestComment.set('');
          this.changeRequestError.set('');
          this.toastService.success(
            'Solicitud registrada',
            `Solicitud de modificacion registrada para la meta "${goal.title}".`
          );
        },
        error: (error: unknown) =>
          this.changeRequestError.set(this.resolveOperationalError(error, 'No se pudo registrar la solicitud de modificacion.'))
      });
  }

  openOrhSubmissionModal(goal: GoalSummary): void {
    this.dismissGoalActionsPopover(goal.id);
    this.orhSubmissionError.set('');
    this.orhSubmissionGoal.set(goal);
    this.orhSubmissionComment.set('');
  }

  closeOrhSubmissionModal(): void {
    if (this.orhSubmissionSubmitting()) {
      return;
    }
    this.orhSubmissionGoal.set(null);
    this.orhSubmissionComment.set('');
    this.orhSubmissionError.set('');
  }

  updateOrhSubmissionComment(event: Event): void {
    this.orhSubmissionComment.set(this.modalEventTextValue(event));
    this.orhSubmissionError.set('');
  }

  canSubmitOrhSubmission(): boolean {
    return (
      !this.orhSubmissionSubmitting() &&
      this.orhSubmissionGoal() !== null &&
      this.orhSubmissionComment().length <= 1000
    );
  }

  submitOrhSubmission(event: Event): void {
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
    this.orhSubmissionError.set('');

    this.goalsService
      .createGoalOrhSubmission(goal.id, payload)
      .pipe(finalize(() => this.orhSubmissionSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.orhSubmissionGoal.set(null);
          this.orhSubmissionComment.set('');
          this.orhSubmissionError.set('');
          this.toastService.success('Envio registrado', `Envio a ORH registrado para la meta "${goal.title}".`);
        },
        error: (error: unknown) =>
          this.orhSubmissionError.set(this.resolveOperationalError(error, 'No se pudo registrar el envio a ORH.'))
      });
  }

  openCreateModal(): void {
    this.router.navigate(['/dashboard/goals/new']);
  }

  openEditModal(goalId: number): void {
    this.router.navigate(['/dashboard/goals', goalId]);
  }

  @HostListener('document:click')
  closeIndicatorDropdown(): void {
    this.indicatorDropdownOpen.set(false);
  }

  toggleIndicatorDropdown(event: Event): void {
    event.stopPropagation();
    if (this.indicatorDropdownOpen()) {
      this.closeIndicatorDropdown();
      return;
    }

    this.indicatorSearch.set(this.selectedIndicatorLabel());
    this.indicatorDropdownOpen.set(true);
    setTimeout(() => this.indicatorSearchInput?.nativeElement.focus());
  }

  onIndicatorSearch(event: Event): void {
    this.indicatorSearch.set((event.target as HTMLInputElement).value);
  }

  filteredIndicators(): Indicator[] {
    const query = this.indicatorSearch().trim().toLowerCase();
    if (!query) {
      return this.indicators().slice(0, 20);
    }

    return this.indicators()
      .filter((indicator) => {
        const code = indicator.code.toLowerCase();
        const name = indicator.name.toLowerCase();
        return code.includes(query) || name.includes(query);
      })
      .slice(0, 20);
  }

  selectIndicator(indicator: Indicator): void {
    this.selectedIndicator.set(indicator);
    this.indicatorSearch.set(this.formatIndicator(indicator));
    this.form.controls.indicatorId.setValue(indicator.id);
    this.form.controls.indicatorId.markAsDirty();
    this.form.controls.indicatorId.updateValueAndValidity();
    this.closeIndicatorDropdown();
    this.sanitizeExpectedValueControl();
  }

  selectedIndicatorLabel(): string {
    const indicator = this.selectedIndicator();
    return indicator ? this.formatIndicator(indicator) : '';
  }

  sanitizePercentControl(controlName: 'weight'): void {
    const control = this.form.controls[controlName];
    const sanitized = sanitizePercentText(control.value);
    if (control.value !== sanitized) {
      control.setValue(sanitized, { emitEvent: false });
    }
  }

  sanitizeExpectedValueControl(): void {
    const control = this.form.controls.expectedValue;
    const kind = resolveExpectedValueInputKind(this.selectedIndicator());
    const sanitized = sanitizeExpectedValueForKind(control.value, kind);
    if (control.value !== sanitized) {
      control.setValue(sanitized, { emitEvent: false });
    }
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingGoalId.set(null);
    this.selectedGoal.set(null);
    this.selectedIndicator.set(null);
    this.indicatorSearch.set('');
    this.indicatorDropdownOpen.set(false);
    this.formError.set('');
    this.saving.set(false);
    this.handledRouteKey = '';
    this.form.reset({
      assignmentId: null,
      indicatorId: null,
      title: '',
      description: '',
      expectedValue: null,
      weight: null,
      startDate: '',
      endDate: ''
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
    const expectedValue = parsePercentNumber(raw.expectedValue);
    const weight = parsePercentNumber(raw.weight);
    const startDate = raw.startDate ?? '';
    const endDate = raw.endDate ?? '';

    if (expectedValue === null || weight === null) {
      this.formError.set('Valor esperado y Peso deben ser numeros entre 0 y 100. Puede incluir el simbolo %.');
      return;
    }
    if (!startDate || !endDate) {
      this.formError.set('Plazo inicial y Plazo final son obligatorios.');
      return;
    }
    if (startDate > endDate) {
      this.formError.set('El plazo final no puede ser menor que el plazo inicial.');
      return;
    }

    const payload: GoalUpsertRequest = {
      assignmentId: raw.assignmentId as number,
      indicatorId: raw.indicatorId as number,
      title: (raw.title ?? '').trim(),
      description: (raw.description ?? '').trim() || null,
      expectedValue,
      weight,
      startDate,
      endDate
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
        this.tryLoadEvaluationLookup();
        this.syncRouteIntent();
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar las metas activas.');
        this.loading.set(false);
      }
    });
  }

  private tryLoadEvaluationLookup(): void {
    const relevantAssignmentIds = this.relevantAssignmentIdsFromGoals();

    if (
      this.evaluationLookupLoaded() ||
      this.evaluationLookupLoading() ||
      !this.sessionReady() ||
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

  private relevantAssignmentIdsFromGoals(): Set<number> {
    return new Set(
      this.goals()
        .map((goal) => goal.assignmentId)
        .filter((assignmentId) => Number.isFinite(assignmentId) && assignmentId > 0)
    );
  }

  private modalEventTextValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  private resolveOperationalError(error: unknown, fallback: string): string {
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
      this.selectedIndicator.set(null);
      this.indicatorSearch.set('');
      this.indicatorDropdownOpen.set(false);
      this.formError.set('');
      this.modalOpen.set(true);
      this.form.reset({
        assignmentId: null,
        indicatorId: null,
        title: '',
        description: '',
        expectedValue: null,
        weight: null,
        startDate: '',
        endDate: ''
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
          this.syncSelectedIndicator(goal.indicatorId);
          this.modalOpen.set(true);
          this.form.reset({
            assignmentId: goal.assignmentId,
            indicatorId: goal.indicatorId,
            title: goal.title,
            description: goal.description ?? '',
            expectedValue: String(goal.expectedValue),
            weight: String(goal.weight),
            startDate: goal.startDate,
            endDate: goal.endDate
          });
          this.sanitizeExpectedValueControl();
        },
        error: (error: Error) => {
          this.formError.set(error.message || 'No fue posible cargar el detalle de la meta.');
        }
      });
      return;
    }

    this.handledRouteKey = routeKey;
  }

  private syncSelectedIndicator(indicatorId: number): void {
    const indicator = this.indicators().find((item) => item.id === indicatorId) ?? null;
    this.selectedIndicator.set(indicator);
    this.indicatorSearch.set(indicator ? this.formatIndicator(indicator) : '');
    this.indicatorDropdownOpen.set(false);
  }

  private formatIndicator(indicator: Indicator): string {
    return `${indicator.code} - ${indicator.name}`;
  }
}

