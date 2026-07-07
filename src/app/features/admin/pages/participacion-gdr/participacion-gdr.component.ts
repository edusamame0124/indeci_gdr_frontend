import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AssignmentListItemResponse, AssignmentPersonOptionResponse } from '../../../../core/admin/assignments.models';
import { AssignmentsService } from '../../../../core/admin/assignments.service';
import { CycleOptionResponse } from '../../../../core/admin/cycles.models';
import { CyclesService } from '../../../../core/admin/cycles.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { ParticipantsService } from '../../../../core/services/participants.service';
import { ParticipantListItemResponse } from '../../../../core/models/participants.models';

type ParticipantStatusFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';
type ParticipantRole = 'EVALUADOR' | 'EVALUADO';
type TabKey = 'participants' | 'generated_relations';

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
              Asigna a cada persona su rol GDR dentro del ciclo (Evaluador o Evaluado). Si una persona
              recibe ambos roles, el sistema la marca automaticamente como Mixto.
            </p>
          </div>

          <div class="workspace__actions">
            <button
              class="button button--primary"
              type="button"
              [disabled]="!canAssignRole()"
              (click)="openAssignModal()"
            >
              <svg class="button__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
              </svg>
              Nueva asignación de rol
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

          @if (currentTab() === 'participants') {
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
          }
        </section>

        @if (showHelpBanner()) {
          <aside class="help-banner" role="note">
            <div class="help-banner__body">
              <strong>Como se asignan los roles</strong>
              <ul>
                <li>Asigna a la persona el rol <strong>EVALUADOR</strong> o <strong>EVALUADO</strong> dentro del ciclo.</li>
                <li>Si una persona recibe <strong>ambos roles</strong>, el sistema la marca como <strong>MIXTO</strong>.</li>
                <li>Solo aparecen personas con usuario activo y rol GDR_USUARIO.</li>
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
            class="tabs__item"
            [class.tabs__item--active]="currentTab() === 'participants'"
            [attr.aria-selected]="currentTab() === 'participants'"
            (click)="switchTab('participants')"
          >
            Participantes del ciclo
          </button>
          <button
            type="button"
            role="tab"
            class="tabs__item"
            [class.tabs__item--active]="currentTab() === 'generated_relations'"
            [attr.aria-selected]="currentTab() === 'generated_relations'"
            (click)="switchTab('generated_relations')"
          >
            Relaciones generadas (auditoría)
          </button>
        </nav>

        @if (currentTab() === 'participants') {
        @if (loading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando informacion...</span>
          </div>
        } @else {
          <section class="panel">
            <div class="panel__header">
              <div>
                <p class="panel__eyebrow">Participantes del ciclo</p>
                <h2 class="panel__title">{{ selectedCycle()?.name || 'Sin ciclo seleccionado' }}</h2>
                <p class="panel__desc">
                  Listado de participantes y sus roles asignados en el ciclo.
                </p>
              </div>
              <span class="panel__count">{{ filteredParticipants().length }} participantes</span>
            </div>

            @if (filteredParticipants().length === 0) {
              <div class="empty-state">
                <strong>Aun no se han registrado participantes para este ciclo.</strong>
                <span>Use Nueva asignación de rol para comenzar.</span>
              </div>
            } @else {
              <div class="data-table" role="region" aria-label="Participantes del ciclo">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre Completo</th>
                      <th>Rol Asignado</th>
                      <th>Area</th>
                      <th>Estado</th>
                      <th>Creada</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of filteredParticipants(); track item.participantId) {
                      <tr>
                        <td>
                          <div class="person-cell">
                            <strong>{{ item.displayName }}</strong>
                            <small>{{ item.documentNumber }}</small>
                          </div>
                        </td>
                        <td>
                          <span [class]="roleClass(item.role)">{{ roleLabel(item.role) }}</span>
                        </td>
                        <td>{{ item.orgUnitName || 'Sin unidad' }}</td>
                        <td>
                          <span [class]="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
                        </td>
                        <td>{{ item.createdAt | date:'dd/MM/yyyy' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="data-cards" aria-label="Participantes del ciclo">
                @for (item of filteredParticipants(); track item.participantId) {
                  <article class="data-card">
                    <div class="data-card__header">
                      <div>
                        <span class="data-card__eyebrow">Participante</span>
                        <strong>{{ item.displayName }}</strong>
                        <small>{{ item.documentNumber }}</small>
                      </div>
                      <span [class]="roleClass(item.role)">{{ roleLabel(item.role) }}</span>
                    </div>
                    <div class="data-card__row">
                      <span class="data-card__eyebrow">Unidad</span>
                      <span>{{ item.orgUnitName || 'Sin unidad' }}</span>
                    </div>
                    <div class="data-card__row">
                      <span class="data-card__eyebrow">Estado</span>
                      <span [class]="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
                    </div>
                    <div class="data-card__row">
                      <span class="data-card__eyebrow">Creada</span>
                      <span>{{ item.createdAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        }
        } @else {
          <section class="panel">
            <div class="panel__header">
              <div>
                <p class="panel__eyebrow">Relaciones generadas</p>
                <h2 class="panel__title">Auditoría de asignaciones evaluador–evaluado</h2>
                <p class="panel__desc">
                  Relaciones autogeneradas al registrar metas. Vista de solo lectura para RRHH.
                </p>
              </div>
              <span class="panel__count">{{ generatedRelations().length }} relaciones</span>
            </div>

            @if (relationsLoading()) {
              <div class="loading-state">
                <div class="loading-spinner"></div>
                <span>Cargando relaciones...</span>
              </div>
            } @else if (generatedRelations().length === 0) {
              <div class="empty-state">
                <strong>Aun no se han autogenerado relaciones en este ciclo.</strong>
                <span>Las relaciones se crean automaticamente al registrar metas.</span>
              </div>
            } @else {
              <div class="data-table" role="region" aria-label="Relaciones generadas">
                <table>
                  <thead>
                    <tr>
                      <th>Evaluador (responsable)</th>
                      <th>Evaluado</th>
                      <th>Segmento</th>
                      <th>Estado</th>
                      <th>Creada</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (rel of generatedRelations(); track rel.id) {
                      <tr>
                        <td>
                          <div class="person-cell">
                            <strong>{{ rel.evaluator.displayName }}</strong>
                            <small>{{ rel.evaluator.documentNumber }}</small>
                          </div>
                        </td>
                        <td>
                          <div class="person-cell">
                            <strong>{{ rel.evaluated.displayName }}</strong>
                            <small>{{ rel.evaluated.documentNumber }}</small>
                          </div>
                        </td>
                        <td>{{ rel.segmentName || 'Sin segmento' }}</td>
                        <td>
                          <span [class]="statusClass(rel.status)">{{ statusLabel(rel.status) }}</span>
                        </td>
                        <td>{{ rel.createdAt | date:'dd/MM/yyyy' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="data-cards" aria-label="Relaciones generadas">
                @for (rel of generatedRelations(); track rel.id) {
                  <article class="data-card">
                    <div class="data-card__header">
                      <div>
                        <span class="data-card__eyebrow">Evaluador</span>
                        <strong>{{ rel.evaluator.displayName }}</strong>
                        <small>{{ rel.evaluator.documentNumber }}</small>
                      </div>
                      <span [class]="statusClass(rel.status)">{{ statusLabel(rel.status) }}</span>
                    </div>
                    <div class="data-card__row">
                      <span class="data-card__eyebrow">Evaluado</span>
                      <strong>{{ rel.evaluated.displayName }}</strong>
                      <small>{{ rel.evaluated.documentNumber }}</small>
                    </div>
                    <div class="data-card__row">
                      <span class="data-card__eyebrow">Segmento</span>
                      <span>{{ rel.segmentName || 'Sin segmento' }}</span>
                    </div>
                    <div class="data-card__row">
                      <span class="data-card__eyebrow">Creada</span>
                      <span>{{ rel.createdAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        }

        @if (modalOpen()) {
          <div class="modal-backdrop" role="presentation">
            <section class="modal" role="dialog" aria-modal="true" aria-labelledby="assignment-modal-title">
              <div class="modal__header">
                <div>
                  <p class="modal__eyebrow">Asignacion de Rol GDR</p>
                  <h2 id="assignment-modal-title">Asignar Rol GDR</h2>
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
                  <label for="person-search"><span>Buscar persona (DNI o nombre)</span></label>
                  @if (selectedPerson()) {
                    <div class="selected-person">
                      <div>
                        <strong>{{ selectedPerson()!.displayName }}</strong>
                        <small>{{ selectedPerson()!.documentNumber }} - {{ selectedPerson()!.orgUnitName || 'Sin unidad' }}</small>
                      </div>
                      <button
                        type="button"
                        class="button button--compact button--secondary"
                        [disabled]="submitting()"
                        (click)="clearSelectedPerson()"
                      >
                        Cambiar
                      </button>
                    </div>
                  } @else {
                    <input
                      id="person-search"
                      type="search"
                      maxlength="120"
                      placeholder="Buscar por nombre, DNI o unidad..."
                      [value]="personQuery()"
                      [disabled]="submitting()"
                      (input)="onPersonSearchInput(eventValue($event))"
                    />
                    @if (personResults().length > 0) {
                      <ul class="suggest-list">
                        @for (option of personResults(); track option.personId) {
                          <li>
                            <button
                              type="button"
                              [disabled]="submitting()"
                              (click)="selectPerson(option)"
                            >
                              <strong>{{ option.displayName }}</strong>
                              <small>{{ option.documentNumber }} - {{ option.orgUnitName || 'Sin unidad' }}</small>
                            </button>
                          </li>
                        }
                      </ul>
                    } @else if (personSearched()) {
                      <small class="suggest-empty">No se encontraron personas elegibles.</small>
                    }
                  }
                </div>

                @if (selectedPerson()) {
                  <div class="form-field">
                    <label><span>Rol a asignar en el ciclo</span></label>
                    <div style="display: flex; gap: 20px; margin-top: 4px;">
                      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem;">
                        <input
                          type="radio"
                          name="role"
                          [checked]="selectedRole() === 'EVALUADOR'"
                          [disabled]="submitting()"
                          (change)="selectedRole.set('EVALUADOR')"
                        />
                        Evaluador
                      </label>
                      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem;">
                        <input
                          type="radio"
                          name="role"
                          [checked]="selectedRole() === 'EVALUADO'"
                          [disabled]="submitting()"
                          (change)="selectedRole.set('EVALUADO')"
                        />
                        Evaluado
                      </label>
                    </div>
                  </div>
                }

                <p class="modal__help">
                  Si la persona ya tiene el otro rol en el ciclo, el sistema la marcara como Mixto
                  automaticamente. Solo aparecen personas con usuario activo y rol GDR_USUARIO.
                </p>

                <div class="modal__actions">
                  <button class="button button--secondary" type="button" [disabled]="submitting()" (click)="closeModal()">
                    Cancelar
                  </button>
                  <button class="button button--primary" type="submit" [disabled]="!canSubmitAssignment()">
                    {{ submitting() ? 'Guardando...' : 'Guardar Rol' }}
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
  private readonly participantsService = inject(ParticipantsService);
  private readonly cyclesService = inject(CyclesService);
  private readonly route = inject(ActivatedRoute);
  readonly cicloNavService = inject(CicloNavService);

  protected readonly cycles = signal<CycleOptionResponse[]>([]);
  protected readonly selectedCycleId = signal<number | null>(null);
  protected readonly participants = signal<ParticipantListItemResponse[]>([]);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly modalError = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<ParticipantStatusFilter>('ACTIVE');
  protected readonly showHelpBanner = signal(true);

  protected readonly currentTab = signal<TabKey>('participants');
  protected readonly generatedRelations = signal<AssignmentListItemResponse[]>([]);
  protected readonly relationsLoading = signal(false);
  private relationsLoadedForCycle: number | null = null;

  protected readonly modalOpen = signal(false);
  protected readonly personQuery = signal('');
  protected readonly personResults = signal<AssignmentPersonOptionResponse[]>([]);
  protected readonly personSearched = signal(false);
  protected readonly selectedPerson = signal<AssignmentPersonOptionResponse | null>(null);
  protected readonly selectedRole = signal<ParticipantRole | null>(null);

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

  protected readonly canAssignRole = computed<boolean>(
    () => this.isCycleEditable() && !this.loading() && !this.submitting()
  );

  protected readonly filteredParticipants = computed<ParticipantListItemResponse[]>(() => {
    const status = this.statusFilter();
    const term = this.searchQuery().trim().toLowerCase();
    return this.participants().filter((item) => {
      if (status !== 'ALL' && item.status !== status) {
        return false;
      }
      if (term.length === 0) {
        return true;
      }
      return (
        item.displayName.toLowerCase().includes(term) ||
        item.documentNumber.toLowerCase().includes(term) ||
        (item.orgUnitName ?? '').toLowerCase().includes(term)
      );
    });
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

  protected statusLabel(status: string): string {
    return status === 'ACTIVE' ? 'Activo' : 'Inactivo';
  }

  protected statusClass(status: string): string {
    return status === 'ACTIVE'
      ? 'status-badge status-badge--active'
      : 'status-badge status-badge--inactive';
  }

  protected roleLabel(role: string): string {
    switch (role) {
      case 'EVALUADOR':
        return 'Evaluador';
      case 'EVALUADO':
        return 'Evaluado';
      case 'MIXTO':
        return 'Mixto';
      default:
        return role;
    }
  }

  protected roleClass(role: string): string {
    switch (role) {
      case 'EVALUADOR':
        return 'actor-badge actor-badge--evaluador';
      case 'EVALUADO':
        return 'actor-badge actor-badge--evaluado';
      case 'MIXTO':
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
    this.statusFilter.set((value as ParticipantStatusFilter) ?? 'ACTIVE');
  }

  protected switchTab(tab: TabKey): void {
    this.currentTab.set(tab);
    if (tab === 'generated_relations') {
      this.loadGeneratedRelations();
    }
  }

  private loadGeneratedRelations(): void {
    const cycleId = this.selectedCycleId();
    if (cycleId === null || this.relationsLoadedForCycle === cycleId) {
      return;
    }
    this.relationsLoading.set(true);
    this.assignmentsService
      .list(cycleId)
      .pipe(
        finalize(() => {
          if (this.selectedCycleId() === cycleId) {
            this.relationsLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (relations) => {
          if (this.selectedCycleId() !== cycleId) {
            return;
          }
          this.generatedRelations.set(relations);
          this.relationsLoadedForCycle = cycleId;
        },
        error: (error) => {
          if (this.selectedCycleId() !== cycleId) {
            return;
          }
          this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar las relaciones generadas.'));
        }
      });
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  protected dismissHelpBanner(): void {
    this.showHelpBanner.set(false);
  }

  protected openAssignModal(): void {
    if (!this.canAssignRole()) {
      return;
    }
    this.successMessage.set(null);
    this.modalError.set(null);
    this.selectedPerson.set(null);
    this.selectedRole.set(null);
    this.personQuery.set('');
    this.personResults.set([]);
    this.personSearched.set(false);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    if (this.submitting()) {
      return;
    }
    this.modalOpen.set(false);
    this.modalError.set(null);
  }

  protected clearSelectedPerson(): void {
    this.selectedPerson.set(null);
    this.selectedRole.set(null);
    this.personQuery.set('');
    this.personResults.set([]);
    this.personSearched.set(false);
  }

  protected onPersonSearchInput(value: string): void {
    this.personQuery.set(value);
    if (value.trim().length < 2) {
      this.personResults.set([]);
      this.personSearched.set(false);
      return;
    }
    this.assignmentsService.searchPersons(value).subscribe({
      next: (results) => {
        this.personResults.set(results);
        this.personSearched.set(true);
      },
      error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo consultar personas elegibles.'))
    });
  }

  protected selectPerson(option: AssignmentPersonOptionResponse): void {
    this.selectedPerson.set(option);
    this.personResults.set([]);
    this.personQuery.set('');
    this.personSearched.set(false);
    this.modalError.set(null);
  }

  protected canSubmitAssignment(): boolean {
    return (
      !this.submitting() &&
      this.selectedPerson() !== null &&
      this.selectedRole() !== null &&
      this.selectedCycleId() !== null
    );
  }

  protected submitAssignment(event: Event): void {
    event.preventDefault();
    if (!this.canSubmitAssignment()) {
      return;
    }
    const cycleId = this.selectedCycleId()!;
    const person = this.selectedPerson()!;
    const role = this.selectedRole()!;

    this.submitting.set(true);
    this.modalError.set(null);
    this.successMessage.set(null);

    this.participantsService
      .assignRole({ cycleId, personId: person.personId, role })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.modalOpen.set(false);
          this.selectedPerson.set(null);
          this.selectedRole.set(null);
          this.successMessage.set('Rol asignado correctamente al participante del ciclo.');
          this.refreshCycleData();
        },
        error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo asignar el rol.'))
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
    this.relationsLoadedForCycle = null;
    this.generatedRelations.set([]);
    this.loading.set(true);
    this.participantsService
      .listParticipants(cycleId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (participants) => this.participants.set(participants),
        error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar los participantes del ciclo.'))
      });
    if (this.currentTab() === 'generated_relations') {
      this.loadGeneratedRelations();
    }
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
