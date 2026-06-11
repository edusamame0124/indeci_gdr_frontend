import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import {
  AssignmentDetailResponse,
  AssignmentListItemResponse,
  AssignmentPersonOptionResponse,
  AssignmentStatus,
  AssignmentStatusFilter,
  AssignmentSummaryByPersonResponse,
  CreateAssignmentRequest,
  ResolvedFunctionalActor,
  UpdateAssignmentRequest
} from '../../../../core/admin/assignments.models';
import { AssignmentsService } from '../../../../core/admin/assignments.service';
import { CycleOptionResponse } from '../../../../core/admin/cycles.models';
import { CyclesService } from '../../../../core/admin/cycles.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';

type TabKey = 'relations' | 'summary';
type AssignmentModalMode = 'create' | 'edit';
type StatusToggleTarget = { assignment: AssignmentListItemResponse; nextStatus: AssignmentStatus };
type PersonRole = 'evaluator' | 'evaluated';

@Component({
  selector: 'app-participacion-gdr',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="workspace">
      <div class="workspace__container">
        <nav class="breadcrumb" aria-label="Ruta de navegacion">
          <a [routerLink]="cicloNavService.boardRoute()">{{ cicloNavService.boardLabel() }}</a>
          <span>/</span>
          <a routerLink="/dashboard/admin/users">Administracion del sistema</a>
          <span>/</span>
          <span>Participacion GDR por ciclo</span>
        </nav>

        <header class="workspace__hero">
          <div>
            <p class="workspace__eyebrow">Administracion del sistema</p>
            <h1 class="workspace__title">Participacion GDR por ciclo</h1>
            <p class="workspace__subtitle">
              Define quien evalua a quien en cada ciclo. El sistema calcula automaticamente el actor
              funcional (Evaluador, Evaluado o Mixto) a partir de las relaciones registradas. El actor
              funcional no se asigna manualmente.
            </p>
          </div>

          <div class="workspace__actions">
            <button
              class="button button--primary"
              type="button"
              [disabled]="!canCreateRelation()"
              (click)="openCreateModal()"
            >
              <svg class="button__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
              </svg>
              Nueva relacion
            </button>
            <a [routerLink]="cicloNavService.boardRoute()" class="button button--secondary">
              <svg class="button__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.5 4.5 4 10l5.5 5.5 1.1-1.1-3.6-3.6H16v-1.6H7l3.6-3.6-1.1-1.1Z"/>
              </svg>
              Volver al dashboard
            </a>
          </div>
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

        <section class="filters">
          <label class="filters__field" for="cycle-select">
            <span>Ciclo</span>
            <select
              id="cycle-select"
              [value]="selectedCycleId() ?? ''"
              [disabled]="loading() || cycles().length === 0"
              (change)="onCycleChange(eventValue($event))"
            >
              @for (cycle of cycles(); track cycle.id) {
                <option [value]="cycle.id">
                  {{ cycle.name }} {{ cycle.active ? '(activo)' : '' }}
                </option>
              }
            </select>
          </label>

          <label class="filters__field" for="status-filter">
            <span>Estado</span>
            <select
              id="status-filter"
              [value]="statusFilter()"
              [disabled]="loading()"
              (change)="onStatusFilterChange(eventValue($event))"
            >
              <option value="ACTIVE">Activas</option>
              <option value="INACTIVE">Inactivas</option>
              <option value="ALL">Todas</option>
            </select>
          </label>

          <label class="filters__field filters__field--grow" for="search-input">
            <span>Buscar</span>
            <input
              id="search-input"
              type="search"
              maxlength="120"
              placeholder="Nombre, DNI o unidad..."
              [value]="searchQuery()"
              [disabled]="loading()"
              (input)="onSearchChange(eventValue($event))"
            />
          </label>
        </section>

        @if (showHelpBanner()) {
          <aside class="help-banner" role="note">
            <div class="help-banner__body">
              <strong>Como se calcula el actor funcional</strong>
              <ul>
                <li>Si una persona aparece como <strong>evaluadora</strong> de alguien, queda como <strong>EVALUADOR</strong>.</li>
                <li>Si aparece como <strong>evaluada</strong> por alguien, queda como <strong>EVALUADO</strong>.</li>
                <li>Si aparece en <strong>ambos lados</strong>, queda como <strong>MIXTO</strong> (Evaluador y Evaluado).</li>
                <li>Si <strong>no aparece</strong> en ninguna relacion del ciclo, queda como <strong>Sin rol funcional GDR</strong>.</li>
              </ul>
            </div>
            <button type="button" class="button button--compact button--secondary" (click)="dismissHelpBanner()">
              Ocultar ayuda
            </button>
          </aside>
        }

        @if (selectedCycle() && !isCycleEditable()) {
          <div class="alert alert--warning" role="status">
            <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 2 1.5 17h17L10 2Zm0 5.4 5.6 9.6H4.4L10 7.4Zm-.9 3.6h1.8v3.6H9.1V11Zm0 4.5h1.8v1.5H9.1v-1.5Z"/>
            </svg>
            <span>
              Este ciclo no esta activo. La pantalla esta en modo solo lectura.
            </span>
          </div>
        }

        <nav class="tabs" role="tablist" aria-label="Vistas del modulo">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeTab() === 'relations'"
            class="tabs__item"
            [class.tabs__item--active]="activeTab() === 'relations'"
            (click)="onTabChange('relations')"
          >
            Relaciones del ciclo
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeTab() === 'summary'"
            class="tabs__item"
            [class.tabs__item--active]="activeTab() === 'summary'"
            (click)="onTabChange('summary')"
          >
            Resumen por persona
          </button>
        </nav>

        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando informacion...</span>
          </div>
        } @else if (activeTab() === 'relations') {
          <section class="panel">
            <div class="panel__header">
              <div>
                <p class="panel__eyebrow">Relaciones del ciclo</p>
                <h2 class="panel__title">{{ selectedCycle()?.name || 'Sin ciclo seleccionado' }}</h2>
                <p class="panel__desc">
                  Listado de pares evaluador a evaluado registrados para el ciclo seleccionado.
                </p>
              </div>
              <span class="panel__count">{{ filteredAssignments().length }} relaciones</span>
            </div>

            @if (filteredAssignments().length === 0) {
              <div class="empty-state">
                <strong>Aun no se han registrado relaciones para este ciclo.</strong>
                @if (canCreateRelation()) {
                  <span>Use Nueva relacion para comenzar.</span>
                }
              </div>
            } @else {
              <div class="data-table" role="region" aria-label="Relaciones del ciclo">
                <table>
                  <thead>
                    <tr>
                      <th>Evaluador</th>
                      <th>Evaluado</th>
                      <th>Unidad del evaluado</th>
                      <th>Estado</th>
                      <th>Creada</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of filteredAssignments(); track item.id) {
                      <tr>
                        <td>
                          <div class="person-cell">
                            <strong>{{ item.evaluator.displayName }}</strong>
                            <small>{{ item.evaluator.documentNumber }} - {{ item.evaluator.orgUnitName || 'Sin unidad' }}</small>
                          </div>
                        </td>
                        <td>
                          <div class="person-cell">
                            <strong>{{ item.evaluated.displayName }}</strong>
                            <small>{{ item.evaluated.documentNumber }}</small>
                          </div>
                        </td>
                        <td>{{ item.evaluated.orgUnitName || 'Sin unidad' }}</td>
                        <td>
                          <span [class]="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
                        </td>
                        <td>{{ item.createdAt | date:'dd/MM/yyyy' }}</td>
                        <td>
                          <div class="actions-cell">
                            <button
                              type="button"
                              class="button button--compact button--secondary"
                              [disabled]="!isCycleEditable()"
                              (click)="openEditModal(item)"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              class="button button--compact"
                              [class.button--danger]="item.status === 'ACTIVE'"
                              [class.button--primary]="item.status !== 'ACTIVE'"
                              [disabled]="!isCycleEditable()"
                              (click)="openStatusConfirm(item)"
                            >
                              {{ item.status === 'ACTIVE' ? 'Inactivar' : 'Activar' }}
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="data-cards" aria-label="Relaciones del ciclo">
                @for (item of filteredAssignments(); track item.id) {
                  <article class="data-card">
                    <div class="data-card__header">
                      <div>
                        <span class="data-card__eyebrow">Evaluador</span>
                        <strong>{{ item.evaluator.displayName }}</strong>
                        <small>{{ item.evaluator.documentNumber }}</small>
                      </div>
                      <span [class]="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
                    </div>
                    <div class="data-card__row">
                      <span class="data-card__eyebrow">Evaluado</span>
                      <strong>{{ item.evaluated.displayName }}</strong>
                      <small>{{ item.evaluated.documentNumber }} - {{ item.evaluated.orgUnitName || 'Sin unidad' }}</small>
                    </div>
                    <div class="data-card__row">
                      <span class="data-card__eyebrow">Creada</span>
                      <span>{{ item.createdAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                    <div class="data-card__actions">
                      <button
                        type="button"
                        class="button button--secondary"
                        [disabled]="!isCycleEditable()"
                        (click)="openEditModal(item)"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        class="button"
                        [class.button--danger]="item.status === 'ACTIVE'"
                        [class.button--primary]="item.status !== 'ACTIVE'"
                        [disabled]="!isCycleEditable()"
                        (click)="openStatusConfirm(item)"
                      >
                        {{ item.status === 'ACTIVE' ? 'Inactivar' : 'Activar' }}
                      </button>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        } @else {
          <section class="panel">
            <div class="panel__header">
              <div>
                <p class="panel__eyebrow">Resumen por persona</p>
                <h2 class="panel__title">Actor funcional resultante</h2>
                <p class="panel__desc">
                  Conteo de participacion por persona. El actor funcional se calcula automaticamente.
                </p>
              </div>
              <label class="toggle">
                <input
                  type="checkbox"
                  [checked]="showOnlyWithoutRole()"
                  (change)="toggleOnlyWithoutRole()"
                />
                <span>Solo personas sin rol funcional</span>
              </label>
            </div>

            @if (filteredSummary().length === 0) {
              <div class="empty-state">
                <strong>No hay personas elegibles para mostrar con los filtros actuales.</strong>
              </div>
            } @else {
              <div class="data-table" role="region" aria-label="Resumen por persona">
                <table>
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>DNI</th>
                      <th>Unidad</th>
                      <th>Veces evaluador</th>
                      <th>Veces evaluado</th>
                      <th>Actor funcional</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of filteredSummary(); track row.personId) {
                      <tr>
                        <td><strong>{{ row.displayName }}</strong></td>
                        <td>{{ row.documentNumber }}</td>
                        <td>{{ row.orgUnitName || 'Sin unidad' }}</td>
                        <td>{{ row.asEvaluatorCount }}</td>
                        <td>{{ row.asEvaluatedCount }}</td>
                        <td>
                          <span [class]="actorClass(row.resolvedFunctionalActor)">
                            {{ actorLabel(row.resolvedFunctionalActor) }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="data-cards" aria-label="Resumen por persona">
                @for (row of filteredSummary(); track row.personId) {
                  <article class="data-card">
                    <div class="data-card__header">
                      <div>
                        <span class="data-card__eyebrow">Persona</span>
                        <strong>{{ row.displayName }}</strong>
                        <small>{{ row.documentNumber }}</small>
                      </div>
                      <span [class]="actorClass(row.resolvedFunctionalActor)">
                        {{ actorLabel(row.resolvedFunctionalActor) }}
                      </span>
                    </div>
                    <div class="data-card__grid">
                      <div>
                        <span class="data-card__eyebrow">Unidad</span>
                        <span>{{ row.orgUnitName || 'Sin unidad' }}</span>
                      </div>
                      <div>
                        <span class="data-card__eyebrow">Como evaluador</span>
                        <span>{{ row.asEvaluatorCount }}</span>
                      </div>
                      <div>
                        <span class="data-card__eyebrow">Como evaluado</span>
                        <span>{{ row.asEvaluatedCount }}</span>
                      </div>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        }

        @if (assignmentModalMode(); as mode) {
          <div class="modal-backdrop" role="presentation">
            <section class="modal" role="dialog" aria-modal="true" aria-labelledby="assignment-modal-title">
              <div class="modal__header">
                <div>
                  <p class="modal__eyebrow">Relacion GDR</p>
                  <h2 id="assignment-modal-title">
                    {{ mode === 'create' ? 'Nueva relacion' : 'Editar relacion' }}
                  </h2>
                </div>
                <button
                  class="modal__close"
                  type="button"
                  aria-label="Cerrar"
                  [disabled]="submitting()"
                  (click)="closeModal()"
                >
                  x
                </button>
              </div>

              @if (modalError()) {
                <div class="alert alert--error modal__alert" role="alert">
                  <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                  </svg>
                  <span>{{ modalError() }}</span>
                </div>
              }

              <form class="modal__form" (submit)="submitAssignment($event)">
                <p class="modal__help">
                  Ciclo: <strong>{{ selectedCycle()?.name }}</strong>
                </p>

                <div class="form-field">
                  <label for="evaluator-search"><span>Persona evaluadora</span></label>
                  @if (selectedEvaluator()) {
                    <div class="selected-person">
                      <div>
                        <strong>{{ selectedEvaluator()!.displayName }}</strong>
                        <small>{{ selectedEvaluator()!.documentNumber }} - {{ selectedEvaluator()!.orgUnitName || 'Sin unidad' }}</small>
                      </div>
                      <button
                        type="button"
                        class="button button--compact button--secondary"
                        [disabled]="submitting()"
                        (click)="clearSelectedPerson('evaluator')"
                      >
                        Cambiar
                      </button>
                    </div>
                  } @else {
                    <input
                      id="evaluator-search"
                      type="search"
                      maxlength="120"
                      placeholder="Buscar por nombre, DNI o unidad..."
                      [value]="evaluatorQuery()"
                      [disabled]="submitting()"
                      (input)="onPersonSearchInput('evaluator', eventValue($event))"
                    />
                    @if (evaluatorResults().length > 0) {
                      <ul class="suggest-list">
                        @for (option of evaluatorResults(); track option.personId) {
                          <li>
                            <button
                              type="button"
                              [disabled]="submitting()"
                              (click)="selectPerson('evaluator', option)"
                            >
                              <strong>{{ option.displayName }}</strong>
                              <small>{{ option.documentNumber }} - {{ option.orgUnitName || 'Sin unidad' }}</small>
                            </button>
                          </li>
                        }
                      </ul>
                    } @else if (evaluatorSearched()) {
                      <small class="suggest-empty">No se encontraron personas elegibles.</small>
                    }
                  }
                </div>

                <div class="form-field">
                  <label for="evaluated-search"><span>Persona evaluada</span></label>
                  @if (selectedEvaluated()) {
                    <div class="selected-person">
                      <div>
                        <strong>{{ selectedEvaluated()!.displayName }}</strong>
                        <small>{{ selectedEvaluated()!.documentNumber }} - {{ selectedEvaluated()!.orgUnitName || 'Sin unidad' }}</small>
                      </div>
                      <button
                        type="button"
                        class="button button--compact button--secondary"
                        [disabled]="submitting()"
                        (click)="clearSelectedPerson('evaluated')"
                      >
                        Cambiar
                      </button>
                    </div>
                  } @else {
                    <input
                      id="evaluated-search"
                      type="search"
                      maxlength="120"
                      placeholder="Buscar por nombre, DNI o unidad..."
                      [value]="evaluatedQuery()"
                      [disabled]="submitting()"
                      (input)="onPersonSearchInput('evaluated', eventValue($event))"
                    />
                    @if (evaluatedResults().length > 0) {
                      <ul class="suggest-list">
                        @for (option of evaluatedResults(); track option.personId) {
                          <li>
                            <button
                              type="button"
                              [disabled]="submitting()"
                              (click)="selectPerson('evaluated', option)"
                            >
                              <strong>{{ option.displayName }}</strong>
                              <small>{{ option.documentNumber }} - {{ option.orgUnitName || 'Sin unidad' }}</small>
                            </button>
                          </li>
                        }
                      </ul>
                    } @else if (evaluatedSearched()) {
                      <small class="suggest-empty">No se encontraron personas elegibles.</small>
                    }
                  }
                </div>

                <p class="modal__help">
                  El evaluador y el evaluado no pueden ser la misma persona. Solo aparecen personas
                  con usuario activo y rol GDR_USUARIO.
                </p>

                <div class="modal__actions">
                  <button class="button button--secondary" type="button" [disabled]="submitting()" (click)="closeModal()">
                    Cancelar
                  </button>
                  <button class="button button--primary" type="submit" [disabled]="!canSubmitAssignment()">
                    {{ submitting() ? 'Guardando...' : 'Guardar' }}
                  </button>
                </div>
              </form>
            </section>
          </div>
        }

        @if (statusToggleTarget(); as target) {
          <div class="modal-backdrop" role="presentation">
            <section class="modal modal--small" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
              <div class="modal__header">
                <div>
                  <p class="modal__eyebrow">Estado de la relacion</p>
                  <h2 id="status-modal-title">
                    {{ target.nextStatus === 'ACTIVE' ? 'Activar relacion' : 'Inactivar relacion' }}
                  </h2>
                </div>
                <button
                  class="modal__close"
                  type="button"
                  aria-label="Cerrar"
                  [disabled]="submitting()"
                  (click)="closeStatusConfirm()"
                >
                  x
                </button>
              </div>

              @if (modalError()) {
                <div class="alert alert--error modal__alert" role="alert">
                  <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                  </svg>
                  <span>{{ modalError() }}</span>
                </div>
              }

              <div class="modal__body">
                <p>
                  Se cambiara el estado de la relacion
                  <strong>{{ target.assignment.evaluator.displayName }} a {{ target.assignment.evaluated.displayName }}</strong>
                  a <strong>{{ statusLabel(target.nextStatus) }}</strong>.
                </p>
              </div>

              <div class="modal__actions modal__actions--padded">
                <button class="button button--secondary" type="button" [disabled]="submitting()" (click)="closeStatusConfirm()">
                  Cancelar
                </button>
                <button class="button button--primary" type="button" [disabled]="submitting()" (click)="confirmStatusToggle()">
                  {{ submitting() ? 'Actualizando...' : 'Confirmar' }}
                </button>
              </div>
            </section>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; width: 100%; }
    .workspace { min-height: 100%; padding: 28px 0 40px; width: 100%; }
    .workspace__container {
      display: grid;
      gap: 18px;
      margin: 0 auto;
      width: min(100% - 40px, 1280px);
    }
    .breadcrumb {
      align-items: center; color: #64748b; display: flex; flex-wrap: wrap;
      font-size: 0.82rem; gap: 8px;
    }
    .breadcrumb a { color: #0077A8; font-weight: 700; text-decoration: none; }
    .workspace__hero {
      align-items: flex-start; display: flex; gap: 16px; justify-content: space-between;
    }
    .workspace__actions {
      align-items: center; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end;
    }
    .workspace__eyebrow, .panel__eyebrow {
      color: #D96500; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em;
      margin: 0 0 6px; text-transform: uppercase;
    }
    .workspace__title { color: #0f172a; font-size: clamp(1.35rem, 2.4vw, 2rem); line-height: 1.15; margin: 0; }
    .workspace__subtitle { color: #64748b; font-size: 0.92rem; line-height: 1.55; margin: 8px 0 0; max-width: 760px; }

    .button {
      align-items: center; border: 1px solid transparent; border-radius: 8px; cursor: pointer;
      display: inline-flex; font: inherit; font-size: 0.84rem; font-weight: 800;
      justify-content: center; min-height: 38px; padding: 9px 14px; text-decoration: none; white-space: nowrap;
    }
    .button--primary { background: #0077A8; border-color: #0077A8; color: #ffffff; }
    .button--secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .button--danger { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .button--compact { font-size: 0.78rem; min-height: 32px; padding: 7px 10px; }
    .button:disabled { cursor: not-allowed; opacity: 0.65; }

    .alert {
      align-items: center; border-radius: 8px; display: flex; font-size: 0.86rem; gap: 10px; padding: 12px 14px;
    }
    .alert--error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .alert--success { background: #ecfdf3; border: 1px solid #bbf7d0; color: #166534; }
    .alert--warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .alert__icon { fill: currentColor; flex: 0 0 auto; height: 18px; width: 18px; }

    .filters {
      align-items: flex-end; background: #ffffff; border: 1px solid #dbe3ef; border-radius: 8px;
      display: flex; flex-wrap: wrap; gap: 14px; padding: 14px 16px;
    }
    .filters__field { display: grid; gap: 6px; min-width: 180px; }
    .filters__field--grow { flex: 1; min-width: 220px; }
    .filters__field span {
      color: #64748b; font-size: 0.74rem; font-weight: 800; text-transform: uppercase;
    }
    .filters__field input, .filters__field select {
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a;
      font: inherit; min-height: 40px; padding: 8px 12px; width: 100%;
    }
    .filters__field input:focus, .filters__field select:focus {
      border-color: #2563eb; outline: 3px solid rgba(37, 99, 235, 0.16);
    }

    .help-banner {
      align-items: flex-start; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
      color: #1e3a8a; display: flex; gap: 14px; justify-content: space-between; padding: 14px 16px;
    }
    .help-banner__body { display: grid; gap: 6px; }
    .help-banner__body strong { font-size: 0.92rem; }
    .help-banner__body ul { list-style: disc; margin: 0 0 0 18px; padding: 0; font-size: 0.86rem; }
    .help-banner__body li { line-height: 1.5; }

    .tabs {
      border-bottom: 1px solid #e2e8f0; display: flex; gap: 4px;
    }
    .tabs__item {
      background: transparent; border: none; border-bottom: 3px solid transparent; color: #64748b;
      cursor: pointer; font: inherit; font-size: 0.92rem; font-weight: 700; padding: 12px 14px;
    }
    .tabs__item--active { border-color: #0077A8; color: #0077A8; }

    .panel {
      background: #ffffff; border: 1px solid #dbe3ef; border-radius: 8px; padding: 18px 18px 4px;
    }
    .panel__header {
      align-items: flex-start; display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between;
      margin-bottom: 12px;
    }
    .panel__title { color: #0f172a; font-size: 1.1rem; margin: 0; }
    .panel__desc { color: #64748b; font-size: 0.86rem; margin: 4px 0 0; }
    .panel__count {
      background: #f1f5f9; border-radius: 999px; color: #475569; font-size: 0.78rem;
      font-weight: 800; padding: 6px 12px;
    }

    .toggle {
      align-items: center; cursor: pointer; display: inline-flex; font-size: 0.86rem; gap: 8px;
    }
    .toggle input { height: 16px; width: 16px; }

    .empty-state {
      background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; color: #475569;
      display: grid; gap: 4px; padding: 24px; text-align: center;
    }

    .loading-state {
      align-items: center; color: #64748b; display: flex; gap: 12px; justify-content: center;
      padding: 32px;
    }
    .loading-spinner {
      animation: spin 0.9s linear infinite; border: 3px solid #e2e8f0; border-top-color: #0077A8;
      border-radius: 50%; height: 22px; width: 22px;
    }

    .data-table {
      border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; overflow: auto;
    }
    .data-table table { border-collapse: collapse; min-width: 720px; width: 100%; }
    .data-table th, .data-table td {
      border-bottom: 1px solid #e2e8f0; font-size: 0.86rem; padding: 10px 12px; text-align: left;
      vertical-align: top;
    }
    .data-table thead th {
      background: #f1f5f9; color: #475569; font-size: 0.74rem; font-weight: 800;
      letter-spacing: 0.04em; text-transform: uppercase;
    }
    .person-cell { display: grid; gap: 2px; }
    .person-cell strong { color: #0f172a; font-size: 0.9rem; }
    .person-cell small { color: #64748b; font-size: 0.78rem; }
    .actions-cell { align-items: center; display: flex; flex-wrap: wrap; gap: 6px; }

    .data-cards { display: none; padding: 0 0 12px; }
    .data-card {
      background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; display: grid; gap: 10px;
      margin-bottom: 12px; padding: 14px 16px;
    }
    .data-card__header { align-items: flex-start; display: flex; gap: 12px; justify-content: space-between; }
    .data-card__header strong { color: #0f172a; }
    .data-card__header small { color: #64748b; font-size: 0.78rem; }
    .data-card__row { display: grid; gap: 2px; }
    .data-card__row strong { color: #0f172a; }
    .data-card__row small { color: #64748b; font-size: 0.78rem; }
    .data-card__grid {
      display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .data-card__grid div { display: grid; gap: 2px; }
    .data-card__eyebrow {
      color: #64748b; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    }
    .data-card__actions { display: flex; flex-wrap: wrap; gap: 8px; }

    .status-badge {
      border-radius: 999px; font-size: 0.74rem; font-weight: 800; padding: 4px 10px;
    }
    .status-badge--active { background: #ecfdf3; color: #166534; }
    .status-badge--inactive { background: #f1f5f9; color: #475569; }

    .actor-badge {
      border-radius: 999px; font-size: 0.74rem; font-weight: 800; padding: 4px 10px;
    }
    .actor-badge--evaluador { background: #eff6ff; color: #1d4ed8; }
    .actor-badge--evaluado { background: #ecfdf3; color: #166534; }
    .actor-badge--mixto { background: #f5f3ff; color: #6d28d9; }
    .actor-badge--sin-rol { background: #f1f5f9; color: #475569; }

    .modal-backdrop {
      align-items: center; background: rgba(15, 23, 42, 0.44); display: flex; inset: 0;
      justify-content: center; padding: 20px; position: fixed; z-index: 100;
    }
    .modal {
      background: #ffffff; border: 1px solid #dbe3ef; border-radius: 8px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24); max-height: calc(100vh - 40px);
      overflow: auto; width: min(640px, 100%);
    }
    .modal--small { width: min(520px, 100%); }
    .modal__header {
      align-items: flex-start; border-bottom: 1px solid #e2e8f0; display: flex; gap: 16px;
      justify-content: space-between; padding: 18px 20px;
    }
    .modal__eyebrow { color: #2563eb; font-size: 0.76rem; font-weight: 800; margin: 0 0 6px; text-transform: uppercase; }
    .modal h2 { color: #0f172a; font-size: 1.25rem; margin: 0; }
    .modal__close {
      align-items: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;
      color: #334155; cursor: pointer; display: inline-flex; font-size: 1.5rem; font-weight: 700;
      height: 36px; justify-content: center; line-height: 1; width: 36px;
    }
    .modal__close:disabled { cursor: not-allowed; opacity: 0.65; }
    .modal__alert { margin: 16px 20px 0; }
    .modal__form { display: grid; gap: 16px; padding: 20px; }
    .modal__help, .modal__body { color: #475569; font-size: 0.92rem; line-height: 1.5; }
    .modal__body { padding: 18px 20px; }
    .modal__body p, .modal__help { margin: 0; }

    .form-field { display: grid; gap: 7px; }
    .form-field span {
      color: #64748b; font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
    }
    .form-field input {
      background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a;
      font: inherit; min-height: 42px; padding: 10px 12px; width: 100%;
    }
    .form-field input:focus { border-color: #2563eb; outline: 3px solid rgba(37, 99, 235, 0.16); }

    .selected-person {
      align-items: flex-start; background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 8px;
      display: flex; gap: 12px; justify-content: space-between; padding: 10px 12px;
    }
    .selected-person div { display: grid; gap: 2px; }
    .selected-person strong { color: #0f172a; }
    .selected-person small { color: #64748b; font-size: 0.78rem; }

    .suggest-list {
      background: #ffffff; border: 1px solid #dbe3ef; border-radius: 8px; list-style: none;
      margin: 0; max-height: 220px; overflow: auto; padding: 4px;
    }
    .suggest-list li { margin: 0; }
    .suggest-list button {
      background: transparent; border: none; cursor: pointer; display: grid; gap: 2px;
      padding: 8px 10px; text-align: left; width: 100%;
    }
    .suggest-list button:hover { background: #f1f5f9; }
    .suggest-list strong { color: #0f172a; font-size: 0.9rem; }
    .suggest-list small { color: #64748b; font-size: 0.78rem; }
    .suggest-empty { color: #64748b; font-size: 0.82rem; }

    .modal__actions { display: flex; gap: 10px; justify-content: flex-end; }
    .modal__actions--padded { border-top: 1px solid #e2e8f0; padding: 16px 20px 20px; }

    /* Ajuste visual corporativo para alinear el modulo con Metas e Indicadores. */
    .workspace {
      background: #f6f8fb;
      padding: 20px 0 32px;
    }

    .workspace__container {
      gap: 14px;
      width: min(1180px, calc(100% - 48px));
    }

    .breadcrumb {
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 600;
      gap: 7px;
      margin-bottom: 2px;
    }

    .breadcrumb a {
      color: #0077A8;
      font-weight: 700;
    }

    .workspace__hero {
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
      gap: 18px;
      padding: 4px 0 18px;
    }

    .workspace__eyebrow,
    .panel__eyebrow {
      color: #D96500;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    .workspace__title {
      color: #0f172a;
      font-size: clamp(1.50rem, 2.00vw, 1.80rem);
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.08;
      margin: 0;
    }

    .workspace__subtitle {
      color: #536179;
      font-size: 0.94rem;
      line-height: 1.55;
      margin: 10px 0 0;
      max-width: 720px;
    }

    .workspace__actions {
      align-items: center;
      gap: 10px;
      padding-top: 2px;
    }

    .button {
      align-items: center;
      border-radius: 8px;
      box-shadow: none;
      font-size: 0.86rem;
      font-weight: 800;
      min-height: 38px;
      padding: 0 14px;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }

    .button:hover:not(:disabled) {
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
      transform: none;
    }

    .button--primary {
      background: #0077A8;
      border-color: #0077A8;
      color: #ffffff;
    }

    .button--primary:hover:not(:disabled) {
      background: #005E8C;
      border-color: #005E8C;
    }

    .button--secondary,
    .button--ghost {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .button--secondary:hover:not(:disabled),
    .button--ghost:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .button--danger {
      background: #fff7f7;
      border-color: #fecaca;
      color: #991b1b;
    }

    .button--danger:hover:not(:disabled) {
      background: #fee2e2;
      border-color: #fca5a5;
    }

    .filters,
    .panel,
    .empty-state,
    .error-state,
    .loading-state {
      background: #ffffff;
      border: 1px solid #dbe3ef;
      border-radius: 10px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .filters {
      gap: 14px;
      grid-template-columns: 180px 180px minmax(260px, 1fr);
      padding: 14px 16px;
    }

    .filters__field {
      gap: 6px;
    }

    .filters__field label,
    .form-field label {
      color: #64748b;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .filters__field input,
    .filters__field select,
    .form-field input,
    .form-field select,
    .form-field textarea {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      font-size: 0.9rem;
      min-height: 40px;
      padding: 9px 12px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .filters__field input:focus,
    .filters__field select:focus,
    .form-field input:focus,
    .form-field select:focus,
    .form-field textarea:focus {
      border-color: #0077A8;
      box-shadow: 0 0 0 3px rgba(0, 119, 168, 0.12);
      outline: none;
    }

    .help-banner {
      background: #ffffff;
      border: 1px solid #dbe3ef;
      border-left: 4px solid #0077A8;
      border-radius: 10px;
      color: #334155;
      padding: 15px 16px;
    }

    .help-banner h2 {
      color: #0f172a;
      font-size: 0.92rem;
      margin: 0 0 8px;
    }

    .help-banner ul {
      color: #475569;
      font-size: 0.84rem;
      line-height: 1.55;
    }

    .help-banner li::marker {
      color: #D96500;
    }

    .tabs {
      border-bottom: 1px solid #dbe3ef;
      gap: 8px;
      margin-top: 2px;
    }

    .tabs__item {
      border-bottom: 2px solid transparent;
      color: #64748b;
      font-size: 0.88rem;
      font-weight: 800;
      padding: 12px 14px;
    }

    .tabs__item:hover {
      color: #0077A8;
    }

    .tabs__item--active {
      border-bottom-color: #0077A8;
      color: #0077A8;
    }

    .panel {
      overflow: hidden;
    }

    .panel__header {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 16px 18px;
    }

    .panel__title {
      color: #0f172a;
      font-size: 1.05rem;
      font-weight: 800;
      margin: 0;
    }

    .panel__desc {
      color: #64748b;
      font-size: 0.84rem;
      margin-top: 6px;
    }

    .panel__count {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      color: #334155;
      font-size: 0.78rem;
      font-weight: 800;
      padding: 6px 10px;
    }

    .data-table {
      background: #ffffff;
    }

    .data-table table {
      min-width: 920px;
    }

    .data-table th {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0;
      padding: 11px 16px;
      text-transform: uppercase;
    }

    .data-table td {
      border-bottom: 1px solid #e8eef6;
      color: #1f2937;
      font-size: 0.86rem;
      padding: 13px 16px;
      vertical-align: middle;
    }

    .data-table tbody tr:hover {
      background: #fafbfc;
    }

    .person-cell__name {
      color: #0f172a;
      font-size: 0.9rem;
      font-weight: 800;
    }

    .person-cell__meta {
      color: #64748b;
      font-size: 0.76rem;
      margin-top: 3px;
    }

    .actions-cell {
      gap: 8px;
      justify-content: flex-end;
    }

    .status-badge,
    .actor-badge {
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 5px 9px;
      white-space: nowrap;
    }

    .status-badge--active,
    .actor-badge--evaluador {
      background: #ecfdf5;
      color: #047857;
    }

    .status-badge--inactive {
      background: #f1f5f9;
      color: #475569;
    }

    .actor-badge--evaluado {
      background: #eff6ff;
      color: #1d4ed8;
    }

    .actor-badge--mixto {
      background: #fff7ed;
      color: #c2410c;
    }

    .actor-badge--none {
      background: #f1f5f9;
      color: #64748b;
    }

    .data-card {
      background: #ffffff;
      border: 1px solid #dbe3ef;
      border-radius: 10px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      padding: 14px;
    }

    .data-card__label {
      color: #64748b;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .data-card__actions {
      border-top: 1px solid #e2e8f0;
      gap: 8px;
      padding-top: 12px;
    }

    .modal__content {
      border: 1px solid #dbe3ef;
      border-radius: 12px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
    }

    .modal__header {
      border-bottom: 1px solid #e2e8f0;
      padding: 18px 20px;
    }

    .modal__title {
      color: #0f172a;
      font-size: 1.08rem;
      font-weight: 800;
    }

    .modal__body {
      padding: 18px 20px;
    }

    .modal__actions,
    .modal__actions--padded {
      border-top: 1px solid #e2e8f0;
      padding: 14px 20px 18px;
    }

    .button {
      border: 1px solid transparent;
      border-radius: 8px;
      box-shadow: none;
      font-size: 0.8rem;
      font-weight: 700;
      gap: 7px;
      letter-spacing: 0;
      min-height: 36px;
      padding: 0 14px;
    }

    .button__icon {
      display: block;
      flex: 0 0 auto;
      height: 15px;
      width: 15px;
    }

    .workspace__actions .button {
      min-height: 38px;
      padding: 0 16px;
    }

    .button--compact {
      border-radius: 6px;
      font-size: 0.74rem;
      min-height: 28px;
      padding: 0 10px;
    }

    .button--primary {
      background: #0077A8;
      border-color: #0077A8;
      box-shadow: 0 1px 3px rgba(0, 119, 168, 0.2);
      color: #ffffff;
    }

    .button--primary:hover:not(:disabled) {
      background: #005E8C;
      border-color: #005E8C;
      box-shadow: 0 2px 6px rgba(0, 119, 168, 0.25);
    }

    .button--secondary,
    .button--ghost {
      background: #ffffff;
      border-color: #d0d5dd;
      color: #475467;
    }

    .button--secondary:hover:not(:disabled),
    .button--ghost:hover:not(:disabled) {
      background: #f9fafb;
      border-color: #98a2b3;
      color: #344054;
    }

    .actions-cell .button--secondary {
      background: transparent;
      border-color: #e5e7eb;
      color: #475467;
    }

    .actions-cell .button--secondary:hover:not(:disabled) {
      background: #f9fafb;
      border-color: #d0d5dd;
    }

    .button--danger {
      background: #ffffff;
      border-color: #f1b8b8;
      color: #991b1b;
    }

    .button--danger:hover:not(:disabled) {
      background: #fef2f2;
      border-color: #ef9a9a;
      color: #991b1b;
    }

    .button:disabled {
      box-shadow: none;
      opacity: 0.48;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 920px) {
      .workspace__hero, .panel__header { flex-direction: column; }
      .workspace__actions { justify-content: stretch; width: 100%; }
      .workspace__actions .button { flex: 1; }
      .data-table { display: none; }
      .data-cards { display: block; }
      .modal__actions { flex-direction: column-reverse; }
      .data-card__grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .workspace__container { width: min(100% - 24px, 1180px); }
      .button { width: 100%; }
      .modal-backdrop { align-items: flex-end; padding: 12px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipacionGdrComponent {
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly cyclesService = inject(CyclesService);
  private readonly route = inject(ActivatedRoute);
  readonly cicloNavService = inject(CicloNavService);

  protected readonly cycles = signal<CycleOptionResponse[]>([]);
  protected readonly selectedCycleId = signal<number | null>(null);
  protected readonly assignments = signal<AssignmentListItemResponse[]>([]);
  protected readonly summary = signal<AssignmentSummaryByPersonResponse[]>([]);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly modalError = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<AssignmentStatusFilter>('ACTIVE');
  protected readonly activeTab = signal<TabKey>('relations');
  protected readonly showHelpBanner = signal(true);
  protected readonly showOnlyWithoutRole = signal(false);

  protected readonly assignmentModalMode = signal<AssignmentModalMode | null>(null);
  protected readonly editingAssignmentId = signal<number | null>(null);
  protected readonly selectedEvaluator = signal<AssignmentPersonOptionResponse | null>(null);
  protected readonly selectedEvaluated = signal<AssignmentPersonOptionResponse | null>(null);
  protected readonly evaluatorQuery = signal('');
  protected readonly evaluatedQuery = signal('');
  protected readonly evaluatorResults = signal<AssignmentPersonOptionResponse[]>([]);
  protected readonly evaluatedResults = signal<AssignmentPersonOptionResponse[]>([]);
  protected readonly evaluatorSearched = signal(false);
  protected readonly evaluatedSearched = signal(false);

  protected readonly statusToggleTarget = signal<StatusToggleTarget | null>(null);

  protected readonly selectedCycle = computed<CycleOptionResponse | null>(() => {
    const id = this.selectedCycleId();
    if (id === null) {
      return null;
    }
    return this.cycles().find((cycle) => cycle.id === id) ?? null;
  });

  protected readonly isCycleEditable = computed<boolean>(() => {
    const cycle = this.selectedCycle();
    return cycle !== null && cycle.status === 'ACTIVE';
  });

  protected readonly canCreateRelation = computed<boolean>(
    () => this.isCycleEditable() && !this.loading() && !this.submitting()
  );

  protected readonly filteredAssignments = computed<AssignmentListItemResponse[]>(() => {
    return this.assignments();
  });

  protected readonly filteredSummary = computed<AssignmentSummaryByPersonResponse[]>(() => {
    const data = this.summary();
    if (!this.showOnlyWithoutRole()) {
      return data;
    }
    return data.filter((row) => row.resolvedFunctionalActor === 'SIN_ROL_FUNCIONAL_GDR');
  });

  constructor() {
    const initialSearch = this.route.snapshot.queryParamMap.get('q');
    if (initialSearch && initialSearch.trim().length > 0) {
      this.searchQuery.set(initialSearch.trim());
    }
    this.bootstrap();
  }

  protected eventValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected statusLabel(status: AssignmentStatus | string): string {
    return status === 'ACTIVE' ? 'Activa' : 'Inactiva';
  }

  protected statusClass(status: AssignmentStatus | string): string {
    return status === 'ACTIVE'
      ? 'status-badge status-badge--active'
      : 'status-badge status-badge--inactive';
  }

  protected actorLabel(actor: ResolvedFunctionalActor): string {
    switch (actor) {
      case 'EVALUADOR':
        return 'Evaluador';
      case 'EVALUADO':
        return 'Evaluado';
      case 'EVALUADOR_Y_EVALUADO':
        return 'Mixto';
      default:
        return 'Sin rol';
    }
  }

  protected actorClass(actor: ResolvedFunctionalActor): string {
    switch (actor) {
      case 'EVALUADOR':
        return 'actor-badge actor-badge--evaluador';
      case 'EVALUADO':
        return 'actor-badge actor-badge--evaluado';
      case 'EVALUADOR_Y_EVALUADO':
        return 'actor-badge actor-badge--mixto';
      default:
        return 'actor-badge actor-badge--sin-rol';
    }
  }

  protected onCycleChange(value: string): void {
    const id = Number(value);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }
    this.selectedCycleId.set(id);
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.refreshCycleData();
  }

  protected onStatusFilterChange(value: string): void {
    const filter = (value as AssignmentStatusFilter) ?? 'ACTIVE';
    this.statusFilter.set(filter);
    this.reloadAssignments();
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.reloadAssignments();
  }

  protected onTabChange(tab: TabKey): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
  }

  protected toggleOnlyWithoutRole(): void {
    this.showOnlyWithoutRole.set(!this.showOnlyWithoutRole());
  }

  protected dismissHelpBanner(): void {
    this.showHelpBanner.set(false);
  }

  protected openCreateModal(): void {
    if (!this.canCreateRelation()) {
      return;
    }
    this.successMessage.set(null);
    this.modalError.set(null);
    this.assignmentModalMode.set('create');
    this.editingAssignmentId.set(null);
    this.selectedEvaluator.set(null);
    this.selectedEvaluated.set(null);
    this.evaluatorQuery.set('');
    this.evaluatedQuery.set('');
    this.evaluatorResults.set([]);
    this.evaluatedResults.set([]);
    this.evaluatorSearched.set(false);
    this.evaluatedSearched.set(false);
  }

  protected openEditModal(item: AssignmentListItemResponse): void {
    if (!this.isCycleEditable()) {
      return;
    }
    this.successMessage.set(null);
    this.modalError.set(null);
    this.assignmentModalMode.set('edit');
    this.editingAssignmentId.set(item.id);
    this.selectedEvaluator.set({
      personId: item.evaluator.personId,
      documentNumber: item.evaluator.documentNumber,
      displayName: item.evaluator.displayName,
      orgUnitId: item.evaluator.orgUnitId,
      orgUnitCode: item.evaluator.orgUnitCode,
      orgUnitName: item.evaluator.orgUnitName
    });
    this.selectedEvaluated.set({
      personId: item.evaluated.personId,
      documentNumber: item.evaluated.documentNumber,
      displayName: item.evaluated.displayName,
      orgUnitId: item.evaluated.orgUnitId,
      orgUnitCode: item.evaluated.orgUnitCode,
      orgUnitName: item.evaluated.orgUnitName
    });
    this.evaluatorQuery.set('');
    this.evaluatedQuery.set('');
    this.evaluatorResults.set([]);
    this.evaluatedResults.set([]);
    this.evaluatorSearched.set(false);
    this.evaluatedSearched.set(false);
  }

  protected closeModal(): void {
    if (this.submitting()) {
      return;
    }
    this.assignmentModalMode.set(null);
    this.editingAssignmentId.set(null);
    this.modalError.set(null);
  }

  protected clearSelectedPerson(role: PersonRole): void {
    if (role === 'evaluator') {
      this.selectedEvaluator.set(null);
      this.evaluatorQuery.set('');
      this.evaluatorResults.set([]);
      this.evaluatorSearched.set(false);
    } else {
      this.selectedEvaluated.set(null);
      this.evaluatedQuery.set('');
      this.evaluatedResults.set([]);
      this.evaluatedSearched.set(false);
    }
  }

  protected onPersonSearchInput(role: PersonRole, value: string): void {
    if (role === 'evaluator') {
      this.evaluatorQuery.set(value);
    } else {
      this.evaluatedQuery.set(value);
    }
    if (value.trim().length < 2) {
      if (role === 'evaluator') {
        this.evaluatorResults.set([]);
        this.evaluatorSearched.set(false);
      } else {
        this.evaluatedResults.set([]);
        this.evaluatedSearched.set(false);
      }
      return;
    }
    this.assignmentsService.searchPersons(value).subscribe({
      next: (results) => {
        if (role === 'evaluator') {
          this.evaluatorResults.set(results);
          this.evaluatorSearched.set(true);
        } else {
          this.evaluatedResults.set(results);
          this.evaluatedSearched.set(true);
        }
      },
      error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo consultar personas elegibles.'))
    });
  }

  protected selectPerson(role: PersonRole, option: AssignmentPersonOptionResponse): void {
    if (role === 'evaluator') {
      this.selectedEvaluator.set(option);
      this.evaluatorResults.set([]);
      this.evaluatorQuery.set('');
      this.evaluatorSearched.set(false);
    } else {
      this.selectedEvaluated.set(option);
      this.evaluatedResults.set([]);
      this.evaluatedQuery.set('');
      this.evaluatedSearched.set(false);
    }
    this.modalError.set(null);
  }

  protected canSubmitAssignment(): boolean {
    if (this.submitting()) {
      return false;
    }
    const evaluator = this.selectedEvaluator();
    const evaluated = this.selectedEvaluated();
    if (!evaluator || !evaluated) {
      return false;
    }
    if (evaluator.personId === evaluated.personId) {
      return false;
    }
    return this.selectedCycleId() !== null;
  }

  protected submitAssignment(event: Event): void {
    event.preventDefault();
    if (!this.canSubmitAssignment()) {
      this.modalError.set('Seleccione un evaluador y un evaluado distintos.');
      return;
    }
    const mode = this.assignmentModalMode();
    if (!mode) {
      return;
    }
    const evaluator = this.selectedEvaluator()!;
    const evaluated = this.selectedEvaluated()!;
    const cycleId = this.selectedCycleId()!;

    this.submitting.set(true);
    this.modalError.set(null);
    this.successMessage.set(null);

    if (mode === 'create') {
      const payload: CreateAssignmentRequest = {
        cycleId,
        evaluatorPersonId: evaluator.personId,
        evaluatedPersonId: evaluated.personId
      };
      this.assignmentsService
        .create(payload)
        .pipe(finalize(() => this.submitting.set(false)))
        .subscribe({
          next: (created) => this.applyMutationResult(
            created,
            'Relacion creada correctamente. El contexto GDR del ciclo fue asegurado para ambos usuarios vinculados.'
          ),
          error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo crear la relacion.'))
        });
      return;
    }

    const id = this.editingAssignmentId();
    if (id === null) {
      this.submitting.set(false);
      this.modalError.set('No se pudo identificar la relacion a editar.');
      return;
    }

    const payload: UpdateAssignmentRequest = {
      evaluatorPersonId: evaluator.personId,
      evaluatedPersonId: evaluated.personId
    };
    this.assignmentsService
      .update(id, payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (updated) => this.applyMutationResult(
          updated,
          'Relacion actualizada correctamente. El contexto GDR del ciclo fue asegurado para ambos usuarios vinculados.'
        ),
        error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo actualizar la relacion.'))
      });
  }

  protected openStatusConfirm(assignment: AssignmentListItemResponse): void {
    if (!this.isCycleEditable()) {
      return;
    }
    this.successMessage.set(null);
    this.modalError.set(null);
    this.statusToggleTarget.set({
      assignment,
      nextStatus: assignment.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });
  }

  protected closeStatusConfirm(): void {
    if (this.submitting()) {
      return;
    }
    this.statusToggleTarget.set(null);
    this.modalError.set(null);
  }

  protected confirmStatusToggle(): void {
    const target = this.statusToggleTarget();
    if (!target) {
      return;
    }
    this.submitting.set(true);
    this.modalError.set(null);
    this.successMessage.set(null);
    this.assignmentsService
      .updateStatus(target.assignment.id, { status: target.nextStatus })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (updated) => {
          this.statusToggleTarget.set(null);
          this.applyMutationResult(
            updated,
            updated.status === 'ACTIVE'
              ? 'Relacion activada correctamente. El contexto GDR del ciclo fue asegurado para ambos usuarios vinculados.'
              : 'Estado de la relacion actualizado correctamente.'
          );
        },
        error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo actualizar el estado.'))
      });
  }

  private bootstrap(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cyclesService.listAll().subscribe({
      next: (cycles) => {
        this.cycles.set(cycles);
        const initial = cycles.find((cycle) => cycle.active) ?? cycles[0] ?? null;
        if (initial) {
          this.selectedCycleId.set(initial.id);
          this.refreshCycleData();
        } else {
          this.loading.set(false);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar la lista de ciclos.'));
      }
    });
  }

  private refreshCycleData(): void {
    const cycleId = this.selectedCycleId();
    if (cycleId === null) {
      return;
    }
    this.loading.set(true);
    forkJoin({
      assignments: this.assignmentsService.list(cycleId, this.searchQuery(), this.statusFilter()),
      summary: this.assignmentsService.summary(cycleId)
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ assignments, summary }) => {
          this.assignments.set(assignments);
          this.summary.set(summary);
        },
        error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar la informacion del ciclo.'))
      });
  }

  private reloadAssignments(): void {
    const cycleId = this.selectedCycleId();
    if (cycleId === null) {
      return;
    }
    this.loading.set(true);
    this.assignmentsService
      .list(cycleId, this.searchQuery(), this.statusFilter())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (assignments) => this.assignments.set(assignments),
        error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar las relaciones.'))
      });
  }

  private applyMutationResult(detail: AssignmentDetailResponse, successMessage: string): void {
    this.assignmentModalMode.set(null);
    this.editingAssignmentId.set(null);
    this.selectedEvaluator.set(null);
    this.selectedEvaluated.set(null);
    this.successMessage.set(successMessage);
    this.refreshCycleData();
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message && error.message.trim().length > 0) {
      return error.message;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error?: { message?: unknown } }).error?.message === 'string'
    ) {
      return (error as { error: { message: string } }).error.message;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string' &&
      ((error as { message: string }).message).trim().length > 0
    ) {
      return (error as { message: string }).message;
    }

    return fallback;
  }
}
