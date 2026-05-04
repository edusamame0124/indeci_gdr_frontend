import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import {
  CreateUserRequest,
  HrOrgUnitOptionResponse,
  RoleOptionResponse,
  UpdateUserRequest,
  UserDetailResponse,
  UserListItemResponse
} from '../../../../core/admin/users.models';
import { UsersService } from '../../../../core/admin/users.service';

type UserModalMode = 'create' | 'edit';
type StatusTarget = { user: UserListItemResponse; nextStatus: 'ACTIVE' | 'INACTIVE' };

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <section class="workspace">
      <div class="workspace__container">
        <nav class="breadcrumb" aria-label="Ruta de navegacion">
          <a routerLink="/dashboard">Dashboard</a>
          <span>/</span>
          <span>Gestion de usuarios</span>
        </nav>

        <header class="workspace__hero">
          <div>
            <p class="workspace__eyebrow">Administracion del sistema</p>
            <h1 class="workspace__title">Gestion de usuarios</h1>
            <p class="workspace__subtitle">
              Administracion tecnica minima de usuarios, estado y roles base del sistema.
            </p>
          </div>

          <div class="workspace__actions">
            <button class="button button--primary" type="button" (click)="openCreateModal()">
              <svg class="button__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
              </svg>
              Nuevo usuario
            </button>
            <a routerLink="/dashboard" class="button button--secondary">
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

        <section class="users-panel">
          <div class="users-panel__header">
            <div>
              <p class="users-panel__eyebrow">Usuarios registrados</p>
              <h2 class="users-panel__title">Listado administrativo</h2>
              <p class="users-panel__desc">
                Esta vista mantiene solo el alcance MVP: datos basicos, estado y roles tecnicos vigentes.
              </p>
            </div>
            <span class="users-panel__count">{{ users().length }} usuarios</span>
          </div>

          @if (loading()) {
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <span>Cargando usuarios...</span>
            </div>
          } @else if (!errorMessage() && users().length === 0) {
            <div class="empty-state">
              <strong>No hay usuarios registrados para mostrar.</strong>
              <span>Use Nuevo usuario para registrar el primer usuario administrable.</span>
            </div>
          } @else if (users().length > 0) {
            <div class="users-table" role="region" aria-label="Usuarios registrados">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Contacto</th>
                    <th>Persona / unidad</th>
                    <th>Roles</th>
                    <th>Participacion GDR</th>
                    <th>Estado</th>
                    <th>Acceso</th>
                    <th class="th--actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of pagedUsers(); track user.id) {
                    <tr>
                      <td>
                        <div class="user-main">
                          <strong class="mono-cell">{{ user.username }}</strong>
                          <span>{{ user.displayName }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="cell-muted">{{ user.email }}</span>
                      </td>
                      <td>
                        <div class="user-main">
                          <strong>{{ user.personDisplayName || 'Sin persona vinculada' }}</strong>
                          <span>{{ user.orgUnitName || 'Sin unidad' }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="role-list">
                          @for (role of user.roles; track role.code) {
                            <span>{{ role.code }}</span>
                          }
                        </div>
                      </td>
                      <td>
                        <div class="gdr-state">
                          <span [class]="gdrParticipationClass(user.gdrParticipationStatus)">
                            {{ user.gdrParticipationLabel }}
                          </span>
                          @if (user.functionalActor && user.functionalActor !== 'SIN_ROL_FUNCIONAL_GDR') {
                            <small>{{ functionalActorLabel(user.functionalActor) }}</small>
                          }
                        </div>
                      </td>
                      <td>
                        <span [class]="statusClass(user.status)">{{ statusLabel(user.status) }}</span>
                      </td>
                      <td>{{ user.lastLoginAt ? (user.lastLoginAt | date:'dd/MM/yyyy HH:mm') : 'Sin acceso' }}</td>
                      <td>
                        <div class="actions-cell">
                          <button type="button" class="button button--compact button--secondary" (click)="openEditModal(user)">
                            Editar
                          </button>
                          <button type="button" class="button button--compact button--secondary" (click)="openRolesModal(user)">
                            Roles
                          </button>
                          @if (shouldShowCompleteGdr(user)) {
                            <a
                              class="button button--compact button--secondary button--gdr"
                              routerLink="/dashboard/admin/participacion-gdr"
                              [queryParams]="gdrQueryParams(user)"
                            >
                              GDR
                            </a>
                          }
                          <button
                            type="button"
                            class="button button--compact"
                            [class.button--danger]="user.status === 'ACTIVE'"
                            [class.button--primary]="user.status !== 'ACTIVE'"
                            (click)="openStatusConfirm(user)"
                          >
                            {{ user.status === 'ACTIVE' ? 'Inactivar' : 'Activar' }}
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="users-cards" aria-label="Usuarios registrados">
              @for (user of pagedUsers(); track user.id) {
                <article class="user-card">
                  <div class="user-card__header">
                    <div>
                      <span class="user-card__username">{{ user.username }}</span>
                      <h3>{{ user.displayName }}</h3>
                    </div>
                    <span [class]="statusClass(user.status)">{{ statusLabel(user.status) }}</span>
                  </div>
                  <dl class="user-card__details">
                    <div>
                      <dt>Email</dt>
                      <dd>{{ user.email }}</dd>
                    </div>
                    <div>
                      <dt>Persona HR</dt>
                      <dd>{{ user.personDisplayName || 'Sin persona vinculada' }}</dd>
                    </div>
                    <div>
                      <dt>Unidad</dt>
                      <dd>{{ user.orgUnitName || 'Sin unidad' }}</dd>
                    </div>
                    <div>
                      <dt>Ultimo acceso</dt>
                      <dd>{{ user.lastLoginAt ? (user.lastLoginAt | date:'dd/MM/yyyy HH:mm') : 'Sin acceso' }}</dd>
                    </div>
                    <div>
                      <dt>Participacion GDR</dt>
                      <dd>
                        <span [class]="gdrParticipationClass(user.gdrParticipationStatus)">
                          {{ user.gdrParticipationLabel }}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <div class="role-list role-list--mobile">
                    @for (role of user.roles; track role.code) {
                      <span>{{ role.code }}</span>
                    }
                  </div>
                  <div class="user-card__actions">
                    <button type="button" class="button button--secondary" (click)="openEditModal(user)">Editar</button>
                    <button type="button" class="button button--secondary" (click)="openRolesModal(user)">Gestionar roles</button>
                    @if (shouldShowCompleteGdr(user)) {
                      <a
                        class="button button--secondary button--gdr"
                        routerLink="/dashboard/admin/participacion-gdr"
                        [queryParams]="gdrQueryParams(user)"
                      >
                        Completar GDR
                      </a>
                    }
                    <button
                      type="button"
                      class="button"
                      [class.button--danger]="user.status === 'ACTIVE'"
                      [class.button--primary]="user.status !== 'ACTIVE'"
                      (click)="openStatusConfirm(user)"
                    >
                      {{ user.status === 'ACTIVE' ? 'Inactivar' : 'Activar' }}
                    </button>
                  </div>
                </article>
              }
            </div>

            @if (users().length > pageSize) {
              <div class="pagination" aria-label="Paginacion de usuarios">
                <span class="pagination__summary">
                  {{ pageStartIndex() }}-{{ pageEndIndex() }} de {{ users().length }}
                </span>
                <div class="pagination__controls">
                  <button
                    type="button"
                    class="button button--compact button--secondary"
                    [disabled]="currentPage() === 1"
                    (click)="goToPage(1)"
                    aria-label="Primera pagina"
                  >
                    Primero
                  </button>
                  <button
                    type="button"
                    class="button button--compact button--secondary"
                    [disabled]="currentPage() === 1"
                    (click)="previousPage()"
                    aria-label="Pagina anterior"
                  >
                    Anterior
                  </button>
                  <span class="pagination__page">{{ currentPage() }} / {{ totalPages() }}</span>
                  <button
                    type="button"
                    class="button button--compact button--secondary"
                    [disabled]="currentPage() === totalPages()"
                    (click)="nextPage()"
                    aria-label="Pagina siguiente"
                  >
                    Siguiente
                  </button>
                  <button
                    type="button"
                    class="button button--compact button--secondary"
                    [disabled]="currentPage() === totalPages()"
                    (click)="goToPage(totalPages())"
                    aria-label="Ultima pagina"
                  >
                    Ultimo
                  </button>
                </div>
              </div>
            }
          }
        </section>

        @if (userModalMode(); as mode) {
          <div class="modal-backdrop" role="presentation">
            <section class="modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
              <div class="modal__header">
                <div>
                  <p class="modal__eyebrow">Usuario</p>
                  <h2 id="user-modal-title">{{ mode === 'create' ? 'Nuevo usuario' : 'Editar usuario' }}</h2>
                </div>
                <button
                  class="modal__close"
                  type="button"
                  aria-label="Cerrar"
                  [disabled]="submittingUser()"
                  (click)="closeUserModal()"
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

              <form class="modal__form" (submit)="submitUser($event)">
                @if (mode === 'create') {
                  <label class="form-field" for="user-username">
                    <span>Usuario</span>
                    <input
                      id="user-username"
                      type="text"
                      maxlength="60"
                      [value]="username()"
                      [disabled]="submittingUser()"
                      (input)="username.set(eventValue($event))"
                    />
                  </label>
                }

                <label class="form-field" for="user-display-name">
                  <span>Nombre visible</span>
                  <input
                    id="user-display-name"
                    type="text"
                    maxlength="150"
                    [value]="displayName()"
                    [disabled]="submittingUser()"
                    (input)="displayName.set(eventValue($event))"
                  />
                </label>

                <label class="form-field" for="user-email">
                  <span>Email</span>
                  <input
                    id="user-email"
                    type="email"
                    maxlength="150"
                    [value]="email()"
                    [disabled]="submittingUser()"
                    (input)="email.set(eventValue($event))"
                  />
                </label>

                @if (mode === 'create') {
                  <label class="form-field" for="user-document-number">
                    <span>DNI de la persona</span>
                    <input
                      id="user-document-number"
                      type="text"
                      maxlength="20"
                      placeholder="Numero de documento"
                      required
                      [value]="documentNumber()"
                      [disabled]="submittingUser()"
                      (input)="documentNumber.set(eventValue($event))"
                    />
                    <small class="form-field__hint">
                      El DNI es obligatorio y unico. Al guardar, se creara la persona HR vinculada
                      al usuario en simultaneo. Si el DNI ya esta registrado en HR, el sistema
                      mostrara un mensaje y no permitira la creacion.
                    </small>
                  </label>

                  <label class="form-field" for="user-org-unit">
                    <span>Unidad organica</span>
                    <select
                      id="user-org-unit"
                      required
                      [value]="orgUnitIdText()"
                      [disabled]="submittingUser() || orgUnits().length === 0"
                      (change)="orgUnitIdText.set(eventValue($event))"
                    >
                      <option value="">Seleccione una unidad organica...</option>
                      @for (orgUnit of orgUnits(); track orgUnit.id) {
                        <option [value]="orgUnit.id">{{ orgUnit.name }}</option>
                      }
                    </select>
                    <small class="form-field__hint">
                      Unidad organica a la que pertenece la persona dentro de la institucion.
                    </small>
                  </label>
                }

                @if (mode === 'create') {
                  <label class="form-field" for="user-initial-password">
                    <span>Contrasena inicial</span>
                    <input
                      id="user-initial-password"
                      type="password"
                      maxlength="128"
                      autocomplete="new-password"
                      [value]="initialPassword()"
                      [disabled]="submittingUser()"
                      (input)="initialPassword.set(eventValue($event))"
                    />
                  </label>

                  <fieldset class="roles-field">
                    <legend>Roles tecnicos</legend>
                    <div class="roles-field__grid">
                      @for (role of roles(); track role.code) {
                        <label>
                          <input
                            type="checkbox"
                            [checked]="selectedRoleCodes().includes(role.code)"
                            [disabled]="submittingUser()"
                            (change)="toggleRole(role.code)"
                          />
                          <span>{{ role.name }}</span>
                          <small>{{ role.code }}</small>
                        </label>
                      }
                    </div>
                  </fieldset>
                }

                <div class="modal__actions">
                  <button class="button button--secondary" type="button" [disabled]="submittingUser()" (click)="closeUserModal()">
                    Cancelar
                  </button>
                  <button class="button button--primary" type="submit" [disabled]="!canSubmitUser()">
                    {{ submittingUser() ? 'Guardando...' : 'Guardar' }}
                  </button>
                </div>
              </form>
            </section>
          </div>
        }

        @if (rolesUser(); as selectedUser) {
          <div class="modal-backdrop" role="presentation">
            <section class="modal" role="dialog" aria-modal="true" aria-labelledby="roles-modal-title">
              <div class="modal__header">
                <div>
                  <p class="modal__eyebrow">Roles tecnicos</p>
                  <h2 id="roles-modal-title">Gestionar roles</h2>
                </div>
                <button
                  class="modal__close"
                  type="button"
                  aria-label="Cerrar"
                  [disabled]="submittingRoles()"
                  (click)="closeRolesModal()"
                >
                  x
                </button>
              </div>

              <div class="modal__context">
                <div>
                  <span>Usuario</span>
                  <strong>{{ selectedUser.username }}</strong>
                </div>
                <div>
                  <span>Nombre</span>
                  <strong>{{ selectedUser.displayName }}</strong>
                </div>
              </div>

              @if (modalError()) {
                <div class="alert alert--error modal__alert" role="alert">
                  <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                  </svg>
                  <span>{{ modalError() }}</span>
                </div>
              }

              <form class="modal__form" (submit)="submitRoles($event)">
                <p class="modal__help">
                  El reemplazo de roles mantiene inactivas las relaciones no seleccionadas y reactiva las existentes cuando corresponde.
                </p>
                <fieldset class="roles-field">
                  <legend>Roles asignables</legend>
                  <div class="roles-field__grid">
                    @for (role of roles(); track role.code) {
                      <label>
                        <input
                          type="checkbox"
                          [checked]="selectedRoleCodes().includes(role.code)"
                          [disabled]="submittingRoles()"
                          (change)="toggleRole(role.code)"
                        />
                        <span>{{ role.name }}</span>
                        <small>{{ role.code }}</small>
                      </label>
                    }
                  </div>
                </fieldset>

                <div class="modal__actions">
                  <button class="button button--secondary" type="button" [disabled]="submittingRoles()" (click)="closeRolesModal()">
                    Cancelar
                  </button>
                  <button class="button button--primary" type="submit" [disabled]="!canSubmitRoles()">
                    {{ submittingRoles() ? 'Guardando...' : 'Guardar roles' }}
                  </button>
                </div>
              </form>
            </section>
          </div>
        }

        @if (statusTarget(); as target) {
          <div class="modal-backdrop" role="presentation">
            <section class="modal modal--small" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
              <div class="modal__header">
                <div>
                  <p class="modal__eyebrow">Estado del usuario</p>
                  <h2 id="status-modal-title">{{ target.nextStatus === 'ACTIVE' ? 'Activar usuario' : 'Inactivar usuario' }}</h2>
                </div>
                <button
                  class="modal__close"
                  type="button"
                  aria-label="Cerrar"
                  [disabled]="submittingStatus()"
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
                  Se cambiara el estado de <strong>{{ target.user.username }}</strong> a
                  <strong>{{ statusLabel(target.nextStatus) }}</strong>.
                </p>
              </div>

              <div class="modal__actions modal__actions--padded">
                <button class="button button--secondary" type="button" [disabled]="submittingStatus()" (click)="closeStatusConfirm()">
                  Cancelar
                </button>
                <button class="button button--primary" type="button" [disabled]="submittingStatus()" (click)="submitStatus()">
                  {{ submittingStatus() ? 'Actualizando...' : 'Confirmar' }}
                </button>
              </div>
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
      width: min(100% - 40px, 1280px);
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

    .workspace__actions {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
    }

    .workspace__eyebrow,
    .users-panel__eyebrow {
      color: #7f1714;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .workspace__title {
      color: #0f172a;
      font-size: clamp(1.35rem, 2vw, 2rem);
      font-weight: 800;
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
      border: 1px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 800;
      justify-content: center;
      min-height: 38px;
      padding: 9px 14px;
      text-decoration: none;
      white-space: nowrap;
    }

    .button--primary {
      background: #7f1714;
      border-color: #7f1714;
      color: #ffffff;
    }

    .button--secondary {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }

    .button--danger {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }

    .button--compact {
      font-size: 0.78rem;
      min-height: 32px;
      padding: 7px 10px;
    }

    .button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
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

    .users-panel {
      background: #ffffff;
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }

    .users-panel__header {
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 18px 20px;
    }

    .users-panel__title {
      color: #0f172a;
      font-size: 1.1rem;
      margin: 0;
    }

    .users-panel__desc {
      color: #64748b;
      font-size: 0.86rem;
      line-height: 1.5;
      margin: 8px 0 0;
      max-width: 760px;
    }

    .users-panel__count {
      background: #f1f5f9;
      border-radius: 999px;
      color: #475569;
      font-size: 0.78rem;
      font-weight: 850;
      padding: 6px 10px;
      white-space: nowrap;
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

    .users-table {
      overflow-x: auto;
    }

    table {
      border-collapse: collapse;
      min-width: 1120px;
      width: 100%;
    }

    th {
      background: #f8fafc;
      color: #475569;
      font-size: 0.72rem;
      font-weight: 850;
      padding: 12px 14px;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    td {
      border-top: 1px solid #e2e8f0;
      color: #0f172a;
      font-size: 0.84rem;
      padding: 13px 14px;
      vertical-align: top;
    }

    .mono-cell {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
    }

    .role-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 150px;
    }

    .role-list span {
      background: #eff6ff;
      border-radius: 999px;
      color: #1d4ed8;
      font-size: 0.7rem;
      font-weight: 850;
      padding: 4px 7px;
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

    .status-badge--active {
      background: #ecfdf3;
      color: #047857;
    }

    .status-badge--inactive {
      background: #f1f5f9;
      color: #475569;
    }

    .gdr-state {
      display: grid;
      gap: 5px;
      min-width: 160px;
    }

    .gdr-state small {
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 750;
    }

    .gdr-badge {
      border-radius: 999px;
      display: inline-flex;
      font-size: 0.72rem;
      font-weight: 850;
      padding: 5px 9px;
      width: fit-content;
    }

    .gdr-badge--complete {
      background: #ecfdf3;
      color: #047857;
    }

    .gdr-badge--pending {
      background: #fff7ed;
      color: #c2410c;
    }

    .gdr-badge--neutral {
      background: #f1f5f9;
      color: #475569;
    }

    .button--gdr {
      border-color: rgba(127, 23, 20, 0.22);
      color: #7f1714;
    }

    .actions-cell {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 320px;
    }

    .users-cards {
      display: none;
    }

    .user-card {
      border-top: 1px solid #e2e8f0;
      padding: 16px;
    }

    .user-card__header {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .user-card__username {
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.78rem;
      font-weight: 750;
    }

    .user-card h3 {
      color: #0f172a;
      font-size: 1rem;
      line-height: 1.35;
      margin: 4px 0 0;
    }

    .user-card__details {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 0 0 14px;
    }

    .user-card__details dt {
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 850;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .user-card__details dd {
      color: #0f172a;
      font-size: 0.9rem;
      font-weight: 720;
      margin: 0;
      overflow-wrap: anywhere;
    }

    .role-list--mobile {
      margin-bottom: 14px;
    }

    .user-card__actions {
      display: grid;
      gap: 10px;
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
      width: min(720px, 100%);
    }

    .modal--small {
      width: min(520px, 100%);
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

    .modal__alert {
      margin: 16px 20px 0;
    }

    .modal__form {
      display: grid;
      gap: 16px;
      padding: 20px;
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

    .modal__help,
    .modal__body {
      color: #475569;
      font-size: 0.92rem;
      line-height: 1.5;
    }

    .modal__body {
      padding: 18px 20px;
    }

    .modal__body p {
      margin: 0;
    }

    .form-field {
      display: grid;
      gap: 7px;
    }

    .form-field input,
    .form-field select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      font: inherit;
      min-height: 42px;
      padding: 10px 12px;
      width: 100%;
    }

    .form-field input:focus,
    .form-field select:focus {
      border-color: #2563eb;
      outline: 3px solid rgba(37, 99, 235, 0.16);
    }

    .form-field__hint {
      color: #64748b;
      font-size: 0.78rem;
      line-height: 1.4;
    }

    .roles-field {
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      margin: 0;
      padding: 14px;
    }

    .roles-field legend {
      color: #475569;
      font-size: 0.8rem;
      font-weight: 850;
      padding: 0 6px;
      text-transform: uppercase;
    }

    .roles-field__grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .roles-field label {
      align-items: flex-start;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: grid;
      gap: 4px;
      grid-template-columns: auto 1fr;
      padding: 10px;
    }

    .roles-field input {
      margin-top: 3px;
    }

    .roles-field span {
      color: #0f172a;
      font-size: 0.86rem;
      font-weight: 800;
    }

    .roles-field small {
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 750;
      grid-column: 2;
    }

    .modal__actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .modal__actions--padded {
      border-top: 1px solid #e2e8f0;
      padding: 16px 20px 20px;
    }

    /* Ajuste compacto alineado al modulo de Metas. */
    .workspace {
      background: #f6f8fb;
      padding: 22px 0 34px;
    }

    .workspace__container {
      gap: 14px;
      width: min(100% - 48px, 1150px);
    }

    .workspace__hero {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 18px;
    }

    .workspace__title {
      font-size: clamp(1.65rem, 2.2vw, 2.15rem);
      letter-spacing: 0;
    }

    .workspace__subtitle {
      font-size: 0.88rem;
      margin-top: 8px;
    }

    .button {
      border-radius: 8px;
      box-shadow: none;
      font-size: 0.8rem;
      font-weight: 700;
      gap: 7px;
      min-height: 36px;
      padding: 0 14px;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }

    .button__icon {
      display: block;
      flex: 0 0 auto;
      height: 15px;
      width: 15px;
    }

    .button--compact {
      border-radius: 6px;
      font-size: 0.74rem;
      min-height: 28px;
      padding: 0 10px;
    }

    .button--primary {
      background: #7f1714;
      border-color: #7f1714;
      box-shadow: 0 1px 3px rgba(127, 23, 20, 0.2);
      color: #ffffff;
    }

    .button--primary:hover:not(:disabled) {
      background: #951c18;
      border-color: #951c18;
      box-shadow: 0 2px 6px rgba(127, 23, 20, 0.24);
    }

    .button--secondary {
      background: #ffffff;
      border-color: #d0d5dd;
      color: #475467;
    }

    .button--secondary:hover:not(:disabled) {
      background: #f9fafb;
      border-color: #98a2b3;
      color: #344054;
    }

    .button--danger {
      background: #ffffff;
      border-color: #f1b8b8;
      color: #991b1b;
    }

    .button--danger:hover:not(:disabled) {
      background: #fef2f2;
      border-color: #ef9a9a;
    }

    .button--gdr {
      border-color: rgba(127, 23, 20, 0.22);
      color: #7f1714;
    }

    .users-panel {
      border-radius: 10px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .users-panel__header {
      padding: 16px 18px;
    }

    .users-panel__title {
      font-size: 1.02rem;
    }

    .users-panel__desc {
      font-size: 0.82rem;
      margin-top: 6px;
    }

    .users-table {
      overflow-x: auto;
    }

    table {
      min-width: 940px;
    }

    th {
      color: #475569;
      font-size: 0.68rem;
      letter-spacing: 0;
      padding: 10px 12px;
    }

    td {
      font-size: 0.8rem;
      padding: 10px 12px;
      vertical-align: middle;
    }

    tbody tr:hover {
      background: #fafbfc;
    }

    .th--actions {
      text-align: right;
    }

    .user-main {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    .user-main strong {
      color: #0f172a;
      font-size: 0.8rem;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .user-main span,
    .cell-muted {
      color: #475569;
      font-size: 0.78rem;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .mono-cell {
      font-size: 0.78rem;
    }

    .role-list {
      min-width: 0;
    }

    .role-list span,
    .status-badge,
    .gdr-badge {
      font-size: 0.68rem;
      padding: 4px 8px;
    }

    .gdr-state {
      min-width: 130px;
    }

    .gdr-state small {
      font-size: 0.68rem;
    }

    .actions-cell {
      gap: 6px;
      justify-content: flex-end;
      min-width: 185px;
    }

    .pagination {
      align-items: center;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      padding: 12px 16px;
    }

    .pagination__summary,
    .pagination__page {
      color: #475569;
      font-size: 0.78rem;
      font-weight: 750;
      white-space: nowrap;
    }

    .pagination__controls {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 920px) {
      .workspace__hero,
      .users-panel__header {
        flex-direction: column;
      }

      .workspace__actions {
        justify-content: stretch;
        width: 100%;
      }

      .workspace__actions .button {
        flex: 1;
      }

      .users-table {
        display: none;
      }

      .users-cards {
        display: block;
      }

      .modal__context,
      .roles-field__grid {
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

      .workspace__actions,
      .user-card__header,
      .user-card__details {
        grid-template-columns: 1fr;
      }

      .user-card__header {
        flex-direction: column;
      }

      .button {
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
export class UserManagementComponent {
  private readonly usersService = inject(UsersService);

  protected readonly users = signal<UserListItemResponse[]>([]);
  protected readonly roles = signal<RoleOptionResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly modalError = signal<string | null>(null);
  protected readonly pageSize = 6;
  protected readonly currentPage = signal(1);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.users().length / this.pageSize)));
  protected readonly pagedUsers = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return this.users().slice(start, start + this.pageSize);
  });
  protected readonly pageStartIndex = computed(() => {
    if (this.users().length === 0) {
      return 0;
    }
    return (Math.min(this.currentPage(), this.totalPages()) - 1) * this.pageSize + 1;
  });
  protected readonly pageEndIndex = computed(() => Math.min(
    Math.min(this.currentPage(), this.totalPages()) * this.pageSize,
    this.users().length
  ));

  protected readonly userModalMode = signal<UserModalMode | null>(null);
  protected readonly editingUserId = signal<number | null>(null);
  protected readonly username = signal('');
  protected readonly email = signal('');
  protected readonly displayName = signal('');
  protected readonly initialPassword = signal('');
  protected readonly documentNumber = signal('');
  protected readonly orgUnitIdText = signal('');
  protected readonly orgUnits = signal<HrOrgUnitOptionResponse[]>([]);
  protected readonly selectedRoleCodes = signal<string[]>([]);
  protected readonly submittingUser = signal(false);

  protected readonly rolesUser = signal<UserDetailResponse | null>(null);
  protected readonly submittingRoles = signal(false);

  protected readonly statusTarget = signal<StatusTarget | null>(null);
  protected readonly submittingStatus = signal(false);

  constructor() {
    this.loadInitialData();
  }

  protected statusLabel(status: string | null | undefined): string {
    return status === 'ACTIVE' ? 'Activo' : 'Inactivo';
  }

  protected statusClass(status: string | null | undefined): string {
    return status === 'ACTIVE'
      ? 'status-badge status-badge--active'
      : 'status-badge status-badge--inactive';
  }

  protected goToPage(page: number): void {
    const nextPage = Math.min(Math.max(page, 1), this.totalPages());
    this.currentPage.set(nextPage);
  }

  protected previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  protected nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  protected gdrParticipationClass(status: string | null | undefined): string {
    if (status === 'COMPLETA') {
      return 'gdr-badge gdr-badge--complete';
    }
    if (status === 'SIN_PARTICIPACION_GDR' || status === 'SIN_CONTEXTO_CICLO') {
      return 'gdr-badge gdr-badge--pending';
    }
    return 'gdr-badge gdr-badge--neutral';
  }

  protected functionalActorLabel(actor: string | null | undefined): string {
    switch (actor) {
      case 'EVALUADOR':
        return 'Evaluador';
      case 'EVALUADO':
        return 'Evaluado';
      case 'EVALUADOR_Y_EVALUADO':
        return 'Evaluador y evaluado';
      default:
        return 'Sin rol funcional GDR';
    }
  }

  protected shouldShowCompleteGdr(user: UserListItemResponse): boolean {
    return this.hasRole(user, 'GDR_USUARIO')
      && user.status === 'ACTIVE'
      && user.personId !== null
      && user.gdrParticipationStatus !== 'COMPLETA';
  }

  protected gdrQueryParams(user: UserListItemResponse): Record<string, string> {
    const search = user.personDisplayName || user.username;
    return { q: search };
  }

  protected openCreateModal(): void {
    this.successMessage.set(null);
    this.modalError.set(null);
    this.userModalMode.set('create');
    this.editingUserId.set(null);
    this.username.set('');
    this.email.set('');
    this.displayName.set('');
    this.initialPassword.set('');
    this.documentNumber.set('');
    this.orgUnitIdText.set('');
    this.selectedRoleCodes.set([]);
  }

  protected openEditModal(user: UserListItemResponse): void {
    this.successMessage.set(null);
    this.modalError.set(null);
    this.submittingUser.set(true);
    this.usersService
      .getUser(user.id)
      .pipe(finalize(() => this.submittingUser.set(false)))
      .subscribe({
        next: (detail) => {
          this.userModalMode.set('edit');
          this.editingUserId.set(detail.id);
          this.username.set(detail.username);
          this.email.set(detail.email);
          this.displayName.set(detail.displayName);
          this.initialPassword.set('');
          this.documentNumber.set('');
          this.orgUnitIdText.set('');
          this.selectedRoleCodes.set(detail.roles.map((role) => role.code));
        },
        error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar el usuario.'))
      });
  }

  protected closeUserModal(): void {
    if (this.submittingUser()) {
      return;
    }
    this.userModalMode.set(null);
    this.editingUserId.set(null);
    this.modalError.set(null);
  }

  protected canSubmitUser(): boolean {
    const mode = this.userModalMode();
    if (!mode || this.submittingUser()) {
      return false;
    }

    const commonValid = this.email().trim().length > 0
      && this.displayName().trim().length > 0;

    if (mode === 'edit') {
      return commonValid;
    }

    return commonValid
      && this.username().trim().length > 0
      && this.initialPassword().trim().length > 0
      && this.documentNumber().trim().length > 0
      && this.parsedOrgUnitId() !== null
      && this.selectedRoleCodes().length > 0;
  }

  protected submitUser(event: Event): void {
    event.preventDefault();
    const mode = this.userModalMode();

    if (!mode) {
      return;
    }

    if (!this.canSubmitUser()) {
      this.modalError.set('Complete los campos obligatorios antes de guardar.');
      return;
    }

    this.submittingUser.set(true);
    this.modalError.set(null);
    this.successMessage.set(null);

    if (mode === 'create') {
      const orgUnitId = this.parsedOrgUnitId();
      const documentNumber = this.parsedDocumentNumber();
      if (documentNumber === null || orgUnitId === null) {
        this.submittingUser.set(false);
        this.modalError.set('Complete el DNI y la unidad organica antes de guardar.');
        return;
      }
      const payload: CreateUserRequest = {
        username: this.username().trim(),
        email: this.email().trim(),
        displayName: this.displayName().trim(),
        initialPassword: this.initialPassword().trim(),
        documentNumber,
        orgUnitId,
        roleCodes: this.selectedRoleCodes()
      };

      this.usersService
        .createUser(payload)
        .pipe(finalize(() => this.submittingUser.set(false)))
        .subscribe({
          next: (created) => {
            this.users.set([this.toListItem(created), ...this.users()]);
            this.currentPage.set(1);
            this.userModalMode.set(null);
            this.successMessage.set('Usuario creado correctamente.');
          },
          error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo crear el usuario.'))
        });
      return;
    }

    const userId = this.editingUserId();
    if (userId === null) {
      this.submittingUser.set(false);
      this.modalError.set('No se pudo identificar el usuario a editar.');
      return;
    }

    const payload: UpdateUserRequest = {
      email: this.email().trim(),
      displayName: this.displayName().trim()
    };

    this.usersService
      .updateUser(userId, payload)
      .pipe(finalize(() => this.submittingUser.set(false)))
      .subscribe({
        next: (updated) => {
          this.replaceUser(updated);
          this.userModalMode.set(null);
          this.successMessage.set('Usuario actualizado correctamente.');
        },
        error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo actualizar el usuario.'))
      });
  }

  protected openRolesModal(user: UserListItemResponse): void {
    this.successMessage.set(null);
    this.modalError.set(null);
    this.submittingRoles.set(true);
    this.usersService
      .getUser(user.id)
      .pipe(finalize(() => this.submittingRoles.set(false)))
      .subscribe({
        next: (detail) => {
          this.rolesUser.set(detail);
          this.selectedRoleCodes.set(detail.roles.map((role) => role.code));
        },
        error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar los roles del usuario.'))
      });
  }

  protected closeRolesModal(): void {
    if (this.submittingRoles()) {
      return;
    }
    this.rolesUser.set(null);
    this.selectedRoleCodes.set([]);
    this.modalError.set(null);
  }

  protected toggleRole(roleCode: string): void {
    const selected = this.selectedRoleCodes();
    this.selectedRoleCodes.set(
      selected.includes(roleCode)
        ? selected.filter((code) => code !== roleCode)
        : [...selected, roleCode]
    );
    this.modalError.set(null);
  }

  protected canSubmitRoles(): boolean {
    return !this.submittingRoles()
      && this.rolesUser() !== null
      && this.selectedRoleCodes().length > 0;
  }

  protected submitRoles(event: Event): void {
    event.preventDefault();
    const user = this.rolesUser();

    if (!user) {
      return;
    }

    if (this.selectedRoleCodes().length === 0) {
      this.modalError.set('Debe conservar al menos un rol tecnico activo.');
      return;
    }

    this.submittingRoles.set(true);
    this.modalError.set(null);
    this.successMessage.set(null);

    this.usersService
      .updateUserRoles(user.id, { roleCodes: this.selectedRoleCodes() })
      .pipe(finalize(() => this.submittingRoles.set(false)))
      .subscribe({
        next: (updated) => {
          this.replaceUser(updated);
          this.rolesUser.set(null);
          this.selectedRoleCodes.set([]);
          this.successMessage.set('Roles de usuario actualizados correctamente.');
        },
        error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo actualizar los roles.'))
      });
  }

  protected openStatusConfirm(user: UserListItemResponse): void {
    this.successMessage.set(null);
    this.modalError.set(null);
    this.statusTarget.set({
      user,
      nextStatus: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });
  }

  protected closeStatusConfirm(): void {
    if (this.submittingStatus()) {
      return;
    }
    this.statusTarget.set(null);
    this.modalError.set(null);
  }

  protected submitStatus(): void {
    const target = this.statusTarget();
    if (!target) {
      return;
    }

    this.submittingStatus.set(true);
    this.modalError.set(null);
    this.successMessage.set(null);

    this.usersService
      .updateUserStatus(target.user.id, { status: target.nextStatus })
      .pipe(finalize(() => this.submittingStatus.set(false)))
      .subscribe({
        next: (updated) => {
          this.replaceUser(updated);
          this.statusTarget.set(null);
          this.successMessage.set('Estado de usuario actualizado correctamente.');
        },
        error: (error) => this.modalError.set(this.resolveErrorMessage(error, 'No se pudo actualizar el estado del usuario.'))
      });
  }

  protected eventValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private loadInitialData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      users: this.usersService.listUsers(),
      roles: this.usersService.listRoles(),
      orgUnits: this.usersService.listOrgUnits()
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ users, roles, orgUnits }) => {
          this.users.set(users);
          this.currentPage.set(1);
          this.roles.set(roles);
          this.orgUnits.set(orgUnits);
        },
        error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar la gestion de usuarios.'))
      });
  }

  private replaceUser(updated: UserDetailResponse): void {
    const item = this.toListItem(updated);
    this.users.set(this.users().map((user) => user.id === item.id ? item : user));
  }

  private toListItem(user: UserDetailResponse): UserListItemResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      personId: user.personId,
      personDisplayName: user.personDisplayName,
      orgUnitName: user.orgUnitName,
      roles: user.roles,
      gdrParticipationStatus: user.gdrParticipationStatus,
      gdrParticipationLabel: user.gdrParticipationLabel,
      functionalActor: user.functionalActor,
      cycleContextAssigned: user.cycleContextAssigned,
      lastLoginAt: user.lastLoginAt
    };
  }

  private hasRole(user: UserListItemResponse, roleCode: string): boolean {
    return user.roles.some((role) => role.code === roleCode);
  }

  private parsedDocumentNumber(): string | null {
    const value = this.documentNumber().trim();
    return value.length > 0 ? value : null;
  }

  private parsedOrgUnitId(): number | null {
    const value = this.orgUnitIdText().trim();
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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
