import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { FinalEvaluationSummary } from '../../../../core/final-evaluation/final-evaluation.models';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import {
  DocumentoFirmadoResumen,
  FormatoGdrPdfDownload,
  HrOrgUnitOrganigrama,
  InicioFirma,
  PageResponse,
  PlantillaDocumento,
  RegistrarRetornoFirmaPayload,
  SolicitudFirmaDetalle,
  TipoDocumento
} from '../../../../core/documents/documents.models';
import { DocumentsService } from '../../../../core/documents/documents.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Navegación">
        <a routerLink="/dashboard" class="breadcrumb__link">Inicio</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <a routerLink="/dashboard/evaluacion-final" class="breadcrumb__link">Evaluacion Final</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        @if (evaluatedId()) {
          <a [routerLink]="'/dashboard/evaluacion-final/' + evaluatedId()" class="breadcrumb__link">Detalle</a>
          <span class="breadcrumb__sep" aria-hidden="true">/</span>
        }
        <span class="breadcrumb__current">Formatos</span>
      </nav>

      <!-- Page header -->
      <div class="page__header">
        <div class="page__header-left">
          <h1>Documentos firmados (Formatos)</h1>
          <p class="page__subtitle">
            Consulta del estado de firma con Firma Peru, acciones sobre la solicitud y contingencia administrativa cuando corresponda.
          </p>
        </div>
        <div class="page__actions">
          <a [routerLink]="evaluatedId() ? '/dashboard/evaluacion-final/' + evaluatedId() : '/dashboard/evaluacion-final'" class="btn btn--outline-neutral btn--sm">
            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.5 4.5 4 10l5.5 5.5 1.1-1.1-3.6-3.6H16v-1.6H7l3.6-3.6-1.1-1.1Z"/>
            </svg>
            Volver al detalle
          </a>
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

      @if (currentRequest() && !currentRequest()!.integracionOficialDisponible) {
        <div class="alert alert--info" role="status">
          <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm1 11.6H9v-2h2v2Zm0-4H9V6.2h2v3.6Z"/>
          </svg>
          <span><strong>Integracion institucional pendiente.</strong> {{ currentRequest()!.mensajeIntegracion }}</span>
        </div>
      }

      <!-- Context bar -->
      <div class="context-bar">
        <div class="context-bar__item">
          <span class="context-bar__label">Evaluado seleccionado</span>
          <span class="context-bar__value">{{ selectedEvaluationLabel() }}</span>
        </div>
        <div class="context-bar__divider"></div>
        <div class="context-bar__item">
          <span class="context-bar__label">Tipos documentales</span>
          <span class="context-bar__value">{{ documentTypes().length }}</span>
        </div>
        <div class="context-bar__divider"></div>
        <div class="context-bar__item">
          <span class="context-bar__label">Solicitud actual</span>
          <span class="context-bar__value">
            @if (currentRequest()) {
              <span class="status-badge"
                    [class.status-badge--progress]="isInProgressState(currentRequest()!.estadoFlujo)"
                    [class.status-badge--success]="isSuccessState(currentRequest()!.estadoFlujo)"
                    [class.status-badge--warning]="currentRequest()!.estadoFlujo === 'FIRMA_CANCELADA'"
                    [class.status-badge--danger]="currentRequest()!.estadoFlujo === 'ERROR_FIRMA'">
                <span class="status-badge__dot"></span>
                {{ currentRequest()!.estadoFlujo }}
              </span>
            } @else {
              Sin solicitud
            }
          </span>
        </div>
        <div class="context-bar__divider"></div>
        <div class="context-bar__item">
          <span class="context-bar__label">Documentos activos</span>
          <span class="context-bar__value">{{ signedDocumentsTotal() }}</span>
        </div>
      </div>

      <section class="layout-grid">
        <article class="panel">
          <header class="panel__header">
            <div class="panel__header-icon">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 14.5V16h1.5l7.7-7.7-1.5-1.5L4 14.5Zm10.9-7.8a1.1 1.1 0 0 0 0-1.6l-1-1a1.1 1.1 0 0 0-1.6 0l-.8.8L14 7.5l.9-.8Z"/>
              </svg>
            </div>
            <div>
              <h2 class="panel__title">Flujo principal de firma</h2>
              <p class="panel__desc">Iniciar firma, consultar estado y ver documentos asociados a la solicitud. La carga manual de contingencia está disponible cuando su perfil lo permite.</p>
            </div>
          </header>

          <div class="selection-block">
            <label class="field field--full">
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

            <div class="form-actions form-actions--start">
              <button
                type="button"
                class="btn btn--outline btn--sm"
                (click)="applyEvaluatedSelection()"
                [disabled]="loadingEvaluations() || !selectionForm.getRawValue().evaluatedId"
              >
                {{ loadingEvaluations() ? 'Cargando evaluados...' : 'Usar evaluado' }}
              </button>
            </div>
          </div>

          @if (!evaluatedId()) {
            <div class="empty-state">
              <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 11H9v-2h2v2Zm0-4H9V5h2v4Z"/>
              </svg>
              <p>Seleccione un evaluado para habilitar el flujo documental principal del lote.</p>
            </div>
          } @else {
            @if (canRegisterSignedDocuments()) {
              <div class="contingency-section">
                <form [formGroup]="uploadForm" (ngSubmit)="submitUpload()" class="form-grid">
                  <label class="field field--full">
                    <span class="field__label">DESCRIPCION</span>
                    <textarea
                      formControlName="descripcion"
                      rows="3"
                      maxlength="400"
                      placeholder="Descripcion del documento a registrar"
                    ></textarea>
                    <small>Máximo 400 caracteres.</small>
                  </label>

                  <label class="field field--full">
                    <span class="field__label">Archivo firmado</span>
                    <input type="file" accept="application/pdf,.pdf" (change)="onFileSelected($event)" />
                    <small>{{ selectedFileName() || 'Solo PDF. El archivo se almacena fuera de Oracle y fuera del repo.' }}</small>
                  </label>

                  <div class="form-actions">
                    <button
                      type="submit"
                      class="btn btn--outline btn--sm"
                      [disabled]="uploading() || uploadForm.invalid || !selectedFile()"
                    >
                      {{ uploading() ? 'Registrando...' : 'Registrar' }}
                    </button>
                  </div>
                </form>
              </div>
            }

            @if (!canPrepareDocuments()) {
              <div class="alert alert--info" role="status">
                <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm1 11.6H9v-2h2v2Zm0-4H9V6.2h2v3.6Z"/>
                </svg>
                <span>Su perfil puede consultar el flujo y usar contingencia si está habilitada; no puede crear nuevas solicitudes de preparación para firma desde esta pantalla.</span>
              </div>
            }

       

            @if (currentRequest()) {
              <article class="request-card">
                <div class="record-card__head">
                  <div>
                    <span class="record-card__eyebrow">{{ currentRequest()!.tipoDocumento }}</span>
                    <strong>{{ currentRequest()!.nombreArchivoPreparado }}</strong>
                  </div>
                  <span
                    class="status-badge"
                    [class.status-badge--progress]="isInProgressState(currentRequest()!.estadoFlujo)"
                    [class.status-badge--success]="isSuccessState(currentRequest()!.estadoFlujo)"
                    [class.status-badge--warning]="currentRequest()!.estadoFlujo === 'FIRMA_CANCELADA'"
                    [class.status-badge--danger]="currentRequest()!.estadoFlujo === 'ERROR_FIRMA'"
                  >
                    <span class="status-badge__dot"></span>
                    {{ currentRequest()!.estadoFlujo }}
                  </span>
                </div>

                <div class="record-card__meta record-card__meta--grid">
                  <span>Resultado: #{{ currentRequest()!.idResultado }}</span>
                  <span>Proveedor: {{ currentRequest()!.proveedorFirma }}</span>
                  <span>Modo: {{ currentRequest()!.modoIntegracion }}</span>
                  <span>Solicitud: #{{ currentRequest()!.idSolicitudFirma }}</span>
                  <span>Transaccion: {{ currentRequest()!.idTransaccionExterna || 'Pendiente' }}</span>
                  <span>Solicitud: {{ currentRequest()!.fechaSolicitud || 'Pendiente' }}</span>
                  <span>Inicio firma: {{ currentRequest()!.fechaInicioFirma || 'Pendiente' }}</span>
                  <span>Retorno: {{ currentRequest()!.fechaRetorno || 'Pendiente' }}</span>
                  <span>Registro: {{ currentRequest()!.fechaRegistroDocumento || 'Pendiente' }}</span>
                </div>

                @if (currentRequest()!.mensajeResultadoFirma) {
                  <p class="request-card__message">{{ currentRequest()!.mensajeResultadoFirma }}</p>
                }

                <div class="action-group">
                  @if (currentRequest()!.documentoPreparadoDisponible) {
                    <button type="button" class="btn btn--outline btn--sm" (click)="openPreparedDocument()">
                      Ver documento listo para firma
                    </button>
                  }
                  @if (canStartSignatureFlow()) {
                    <button
                      type="button"
                      class="btn btn--primary btn--sm"
                      (click)="startSignature()"
                      [disabled]="starting() || !currentRequest()!.puedeIniciarFirma"
                    >
                      @if (starting()) {
                        <span class="loading-spinner loading-spinner--sm"></span>
                      }
                      {{ starting() ? 'Iniciando...' : 'Iniciar firma' }}
                    </button>
                  }
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    (click)="refreshSignatureRequest()"
                    [disabled]="refreshingRequest()"
                  >
                    {{ refreshingRequest() ? 'Consultando...' : 'Consultar estado' }}
                  </button>
                  @if (currentRequest()!.urlFirma || lastStartInfo()?.urlFirma) {
                    <button type="button" class="btn btn--outline btn--sm" (click)="openFirmaPeru()">
                      Abrir portal de Firma Peru
                    </button>
                  }
                  @if (canRegisterSignatureReturn() && currentRequest()!.puedeRegistrarRetorno && !currentRequest()!.retornoAutomaticoHabilitado) {
                    <button type="button" class="btn btn--outline btn--sm" (click)="openReturnModal()">
                      Registrar resultado de firma
                    </button>
                  }
                  @if (currentRequest()!.idDocumentoFirmado) {
                    <a
                      [routerLink]="['/dashboard/documentos/firmados', currentRequest()!.idDocumentoFirmado]"
                      class="btn btn--outline btn--sm"
                    >
                      Ver documento firmado
                    </a>
                  }
                </div>

                @if (currentRequest()!.estadoFlujo === 'ERROR_FIRMA') {
                  <div class="alert alert--error" role="alert">
                    <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                    </svg>
                    <span>La solicitud quedo con error. El sistema conserva la trazabilidad; para un nuevo intento coordine con quien gestione las solicitudes de firma en su entidad.</span>
                  </div>
                }

                @if (currentRequest()!.estadoFlujo === 'FIRMA_CANCELADA') {
                  <div class="alert alert--warning" role="status">
                    <svg class="alert__icon" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm1 11.6H9v-2h2v2Zm0-4H9V6.2h2v3.6Z"/>
                    </svg>
                    <span>La firma fue cancelada. Para reanudar o iniciar otro tramite, siga las indicaciones de su entidad o el canal de gestión documental.</span>
                  </div>
                }
              </article>
            }
          }
        </article>

        <article class="panel panel--formats-catalog">
          <header class="panel__header">
            <div class="panel__header-icon">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.4L11.6 2H6Zm5 1.2L14.8 7H12a1 1 0 0 1-1-1V3.2ZM7 10h6v1.5H7V10Zm0 3h4v1.5H7V13Z"/>
              </svg>
            </div>
            <div>
              <h2 class="panel__title">Formatos disponibles</h2>
              <p class="panel__desc">Catalogo documental minimo para descarga controlada.</p>
            </div>
          </header>

          @if (loadingStatic()) {
            <div class="loading-state loading-state--panel-tight">
              <div class="loading-spinner"></div>
              <span>Cargando catalogo documental...</span>
            </div>
          } @else if (catalogDisplayedTemplates().length) {
            <div class="record-list record-list--format-catalog">
              @for (template of catalogDisplayedTemplates(); track template.idPlantilla) {
                <article class="record-card record-card--format-gdr">
                  <div class="record-card__format-head">
                    <strong>Formato GDR</strong>
                    <span class="status-badge status-badge--quiet">
                      <span class="status-badge__dot"></span>
                      PDF
                    </span>
                  </div>
                  <p>
                    Formato GDR automático acorde a los datos ingresados en el Sistema.
                  </p>
                  @if (!evaluatedId()) {
                    <p class="hint-text">Seleccione un evaluado y pulse <strong>Usar evaluado</strong> para generar el PDF con datos.</p>
                  }
                  <div class="record-card__cta">
                    <button
                      type="button"
                      class="btn btn--outline btn--compact"
                      (click)="downloadFormatoGdrPdfFile()"
                      [disabled]="downloadingFormatoGdr() || !evaluatedId() || !canPrepareDocuments()"
                    >
                      @if (downloadingFormatoGdr()) {
                        <span class="loading-spinner loading-spinner--inline"></span>
                        Generando…
                      } @else {
                        Descargar Formato GDR
                      }
                    </button>
                  </div>
                </article>
              }
            </div>
          } @else {
            <div class="empty-state empty-state--panel-tight">
              <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.4L11.6 2H6Zm5 1.2L14.8 7H12a1 1 0 0 1-1-1V3.2ZM7 10h6v1.5H7V10Zm0 3h4v1.5H7V13Z"/>
              </svg>
              <p>No hay plantillas activas registradas para el lote actual.</p>
            </div>
          }

          <div class="signed-docs-in-panel">
            <header class="panel__header signed-docs-in-panel__header">
              <div class="panel__header-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4.7 10.8h10.6v-1.6H4.7v1.6Zm0-4h10.6V5.2H4.7v1.6Zm0 8h7.2v-1.6H4.7v1.6Z"/>
                </svg>
              </div>
              <div>
                <h2 class="panel__title">Documentos firmados activos</h2>
                <p class="panel__desc">Consulta minima de documentos vinculados al resultado consolidado del evaluado.</p>
              </div>
            </header>

            @if (loadingDocuments()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando documentos firmados...</span>
          </div>
        } @else if (!evaluatedId()) {
          <div class="empty-state">
            <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 11H9v-2h2v2Zm0-4H9V5h2v4Z"/>
            </svg>
            <p>Seleccione un evaluado desde evaluacion final para ver documentos activos.</p>
          </div>
        } @else if (signedDocuments().length > 0) {
          <div class="doc-table-scroll">
            <div class="doc-table-wrap">
            <table class="doc-table" role="table" aria-label="Documentos firmados activos">
              <thead>
                <tr>
                  <th scope="col">NOMBRE</th>
                  <th scope="col">DESCRIPCION</th>
                  <th scope="col">FECHA</th>
                  <th scope="col" class="doc-table__th-actions">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                @for (document of signedDocuments(); track document.idDocumentoFirmado) {
                  <tr>
                    <td>
                      <button
                        type="button"
                        class="doc-table__name-link"
                        (click)="downloadSignedDocument(document)"
                      >
                        {{ document.nombreOriginal }}
                      </button>
                      <div class="doc-table__tipo">Tipo: {{ signedDocumentListTypeLabel(document) }}</div>
                    </td>
                    <td class="doc-table__desc">{{ document.descripcionContingencia || '—' }}</td>
                    <td class="doc-table__fecha">{{ document.fechaCarga | date: 'dd/MM/yyyy' }}</td>
                    <td class="doc-table__actions">
                      @if (canRegisterSignedDocuments()) {
                        <div class="doc-actions-menu">
                          <button
                            type="button"
                            class="doc-actions-menu__trigger"
                            (click)="toggleRowActionsMenu($event, document.idDocumentoFirmado)"
                            [attr.aria-expanded]="openActionsMenuId() === document.idDocumentoFirmado"
                            aria-haspopup="true"
                            [attr.aria-label]="'Acciones para ' + document.nombreOriginal"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" class="doc-actions-menu__icon">
                              <path d="M3 5h14v1.5H3V5Zm0 4.2h14v1.5H3V9.2Zm0 4.3h14V15H3v-1.5Z"/>
                            </svg>
                          </button>
                          @if (openActionsMenuId() === document.idDocumentoFirmado && actionsMenuViewportPosition(); as menuVp) {
                            <div
                              class="doc-actions-menu__popover doc-actions-menu__popover--fixed"
                              role="menu"
                              [style.top.px]="menuVp.top"
                              [style.right.px]="menuVp.right"
                              (click)="$event.stopPropagation()"
                            >
                              <button type="button" role="menuitem" class="doc-actions-menu__item" (click)="onFirmarMenuClick($event, document)">
                                <svg class="doc-actions-menu__item-icon" viewBox="0 0 20 20" aria-hidden="true">
                                  <path d="M12.5 3.2c.8 0 1.5.4 2 1l1.3 1.3c.6.6 1 1.4 1 2.3 0 .9-.4 1.7-1 2.3l-8.2 8.2H3.5v-4.2l8.1-8.1c.6-.6 1.4-1 2.3-1 .1 0 .3 0 .4.1Zm-.3 1.6a.9.9 0 0 0-.6.3L4.9 12.8v1.9h1.9l6.7-6.7a.5.5 0 0 0 0-.7L11.3 5a.5.5 0 0 0-.35-.15Z"/>
                                </svg>
                                Firmar
                              </button>
                              <button type="button" role="menuitem" class="doc-actions-menu__item doc-actions-menu__item--danger" (click)="deleteSignedDocumentRow($event, document)">
                                <svg class="doc-actions-menu__item-icon" viewBox="0 0 20 20" aria-hidden="true">
                                  <path d="M7 2.2h6v1.5h4v1.5H3V3.7h4v-1.5Zm-1.5 4.5h11l-.8 11.2H6.3l-.8-11.2Zm2.2 2v6h1.2v-6H7.7Zm3.4 0v6H12v-6h-1Z"/>
                                </svg>
                                Eliminar
                              </button>
                            </div>
                          }
                        </div>
                      } @else {
                        <span class="doc-table__actions-empty">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          </div>
        } @else {
          <div class="empty-state">
            <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4.7 10.8h10.6v-1.6H4.7v1.6Zm0-4h10.6V5.2H4.7v1.6Zm0 8h7.2v-1.6H4.7v1.6Z"/>
            </svg>
            <p>Aun no hay documentos firmados activos para el evaluado seleccionado.</p>
          </div>
        }

            @if (!loadingDocuments() && signedDocumentsPage(); as sdp) {
              @if (sdp.totalPages > 1) {
                <nav class="signed-docs-pager" aria-label="Paginacion de documentos firmados activos">
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm signed-docs-pager__btn"
                    [disabled]="sdp.first"
                    (click)="goToSignedDocumentsPage(sdp.number - 1)"
                  >
                    Anterior
                  </button>
                  <span class="signed-docs-pager__status">Pagina {{ sdp.number + 1 }} de {{ sdp.totalPages }}</span>
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm signed-docs-pager__btn"
                    [disabled]="sdp.last"
                    (click)="goToSignedDocumentsPage(sdp.number + 1)"
                  >
                    Siguiente
                  </button>
                </nav>
              }
            }
          </div>
        </article>
      </section>

      @if (returnModalOpen()) {
        <div class="modal-backdrop" (click)="closeReturnModal()"></div>
        <section class="modal" role="dialog" aria-modal="true" aria-label="Registrar resultado de firma">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">Subflujo de firma</p>
              <h2>Registrar resultado de firma</h2>
              <p class="modal__subtitle">
                Use esta vista solo mientras el retorno automatico oficial siga pendiente por dependencia institucional externa.
              </p>
            </div>
            <button type="button" class="modal__close" (click)="closeReturnModal()" aria-label="Cerrar modal">
              <svg viewBox="0 0 20 20"><path d="M14.3 5.7l-1-1L10 8l-3.3-3.3-1 1L9 9l-3.3 3.3 1 1L10 10l3.3 3.3 1-1L11 9l3.3-3.3Z"/></svg>
            </button>
          </div>

          <form [formGroup]="returnForm" (ngSubmit)="submitReturn()" class="form-grid">
            <label class="field">
              <span class="field__label">Estado de retorno</span>
              <select formControlName="codigoEstadoFlujo" (change)="onReturnStateChange()">
                <option value="FIRMADO">FIRMADO</option>
                <option value="ERROR_FIRMA">ERROR_FIRMA</option>
                <option value="FIRMA_CANCELADA">FIRMA_CANCELADA</option>
              </select>
            </label>

            <label class="field">
              <span class="field__label">Codigo resultado</span>
              <input type="text" formControlName="codigoResultadoFirma" />
            </label>

            <label class="field field--full">
              <span class="field__label">Mensaje</span>
              <input type="text" formControlName="mensajeResultadoFirma" />
            </label>

            @if (returnForm.get('codigoEstadoFlujo')?.value === 'FIRMADO') {
              <label class="field field--full">
                <span class="field__label">Documento firmado</span>
                <input type="file" accept="application/pdf,.pdf" (change)="onReturnFileSelected($event)" />
                <small>{{ returnFileName() || 'Adjunte el PDF firmado retornado por la plataforma externa.' }}</small>
              </label>
            }

            <div class="form-actions">
              <button type="button" class="btn btn--ghost" (click)="closeReturnModal()">Cancelar</button>
              <button type="submit" class="btn btn--primary" [disabled]="returning()">
                @if (returning()) {
                  <span class="loading-spinner loading-spinner--sm"></span>
                }
                {{ returning() ? 'Registrando...' : 'Registrar retorno' }}
              </button>
            </div>
          </form>
        </section>
      }

      @if (firmarModalOpen()) {
        <div class="modal-backdrop" (click)="closeFirmarModal()"></div>
        <section class="modal modal--firmar" role="dialog" aria-modal="true" aria-labelledby="firmar-modal-title">
          <div class="modal__header">
            <div>
              <h2 id="firmar-modal-title" class="modal__header-title-plain">Firmar archivo</h2>
              @if (firmarTargetDocument(); as fd) {
                <p class="modal__subtitle firmar-modal__file-name">{{ fd.nombreOriginal }}</p>
              }
            </div>
            <button type="button" class="modal__close" (click)="closeFirmarModal()" aria-label="Cerrar modal">
              <svg viewBox="0 0 20 20"><path d="M14.3 5.7l-1-1L10 8l-3.3-3.3-1 1L9 9l-3.3 3.3 1 1L10 10l3.3 3.3 1-1L11 9l3.3-3.3Z"/></svg>
            </button>
          </div>

          <div class="firmar-modal__body">
            <label class="field field--full">
              <span class="field__label">Oficina</span>
              @if (loadingFirmarCatalog()) {
                <div class="loading-state loading-state--panel-tight">
                  <div class="loading-spinner"></div>
                  <span>Cargando oficinas...</span>
                </div>
              } @else if (firmarOrgCatalogError()) {
                <p class="firmar-catalog-error">{{ firmarOrgCatalogError() }}</p>
                <button type="button" class="btn btn--ghost btn--sm" (click)="retryFirmarOfficeCatalog()">
                  Reintentar
                </button>
              } @else if (firmarOfficeOptions().length === 0) {
                <p class="hint-text">No hay oficinas disponibles.</p>
              } @else {
                <select
                  class="firmar-select"
                  [value]="firmarOfficeSelectValue()"
                  (change)="onFirmarOfficeSelect($event)"
                  aria-label="Seleccionar oficina para la firma"
                >
                  <option value="">Seleccione una oficina</option>
                  @for (row of firmarOfficeOptions(); track row.id) {
                    <option [value]="row.id.toString()">{{ row.name }}</option>
                  }
                </select>
              }
            </label>

            <label class="field field--full">
              <span class="field__label">Motivo de la firma</span>
              <select class="firmar-select" [value]="firmarMotivo()" (change)="onFirmarMotivoSelect($event)">
                @for (opt of firmarMotivoOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </label>

            <label class="field field--full">
              <span class="field__label">Apariencia de la firma</span>
              <select class="firmar-select" [value]="firmarApariencia()" (change)="onFirmarAparienciaSelect($event)">
                @for (opt of firmarAparienciaOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </label>
          </div>

          <div class="modal__footer firmar-modal__footer">
            <button type="button" class="btn btn--ghost" (click)="closeFirmarModal()">Cancelar</button>
            <button type="button" class="btn btn--primary firmar-modal__send" (click)="submitFirmarArchivo()">
              <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M12.5 3.2c.8 0 1.5.4 2 1l1.3 1.3c.6.6 1 1.4 1 2.3 0 .9-.4 1.7-1 2.3l-8.2 8.2H3.5v-4.2l8.1-8.1c.6-.6 1.4-1 2.3-1 .1 0 .3 0 .4.1Zm-.3 1.6a.9.9 0 0 0-.6.3L4.9 12.8v1.9h1.9l6.7-6.7a.5.5 0 0 0 0-.7L11.3 5a.5.5 0 0 0-.35-.15Z"/>
              </svg>
              Enviar
            </button>
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    :host { display:block; min-width:0; }

    /* ── Page layout ── */
    .page { padding:20px 24px 28px; max-width:1120px; margin:0 auto; display:grid; gap:16px; min-width:0; overflow-x:clip; }

    /* ── Breadcrumb ── */
    .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:0; font-size:0.75rem; flex-wrap:wrap; }
    .breadcrumb__link { color:#7f1714; text-decoration:none; font-weight:500; }
    .breadcrumb__link:hover { text-decoration:underline; }
    .breadcrumb__sep { color:#b0b8c4; }
    .breadcrumb__current { color:#667085; font-weight:500; }

    /* ── Page header ── */
    .page__header { display:flex; justify-content:space-between; gap:16px; align-items:center; flex-wrap:wrap; min-width:0; }
    .page__header-left { min-width:0; }
    .page__header h1 { margin:0; color:#1a1a2e; font-size:1.35rem; font-weight:700; line-height:1.2; letter-spacing:-0.01em; }
    .page__subtitle { margin:4px 0 0; color:#667085; font-size:0.82rem; line-height:1.5; max-width:760px; }
    .page__actions { display:flex; gap:8px; flex-wrap:wrap; }

    /* ── Alert ── */
    .alert { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; font-size:0.82rem; }
    .alert--error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
    .alert--info { background:#eef6ff; border:1px solid #bfdbfe; color:#0f4c81; }
    .alert--warning { background:#fff7ed; border:1px solid #fdba74; color:#9a3412; }
    .alert__icon { width:18px; height:18px; fill:currentColor; flex:0 0 auto; }

    /* ── Buttons ── */
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:36px; padding:0 16px; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.15s ease; text-decoration:none; border:none; white-space:nowrap; }
    .btn__icon { width:15px; height:15px; fill:currentColor; flex:0 0 auto; }
    .btn--sm { min-height:32px; padding:0 12px; font-size:0.78rem; }
    .btn--full { width:100%; }
    .btn--primary { background:#7f1714; color:#fff; box-shadow:0 1px 3px rgba(127,23,20,0.2); }
    .btn--primary:hover { background:#951c18; box-shadow:0 2px 6px rgba(127,23,20,0.25); }
    .btn--primary:disabled { opacity:0.6; cursor:not-allowed; box-shadow:none; }
    .btn--outline { background:#fff; color:#7f1714; border:1px solid rgba(127,23,20,0.2); }
    .btn--outline:hover { background:rgba(127,23,20,0.04); border-color:rgba(127,23,20,0.3); }
    .btn--outline:disabled { opacity:0.5; cursor:not-allowed; }
    .btn--outline-neutral { background:#fff; color:#475467; border:1px solid #d0d5dd; }
    .btn--outline-neutral:hover { background:#f9fafb; border-color:#98a2b3; }
    .btn--ghost { background:transparent; color:#475467; border:1px solid #e5e7eb; }
    .btn--ghost:hover { background:#f9fafb; }
    .btn--ghost:disabled { opacity:0.4; cursor:not-allowed; }

    /* ── Context bar ── */
    .context-bar { display:flex; align-items:stretch; gap:0; background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
    .context-bar__item { flex:1; padding:14px 18px; display:flex; flex-direction:column; gap:4px; min-width:0; }
    .context-bar__divider { width:1px; background:#e5e7eb; flex:0 0 1px; }
    .context-bar__label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:600; }
    .context-bar__value { color:#1a1a2e; font-size:0.84rem; font-weight:600; line-height:1.4; overflow-wrap:anywhere; word-break:break-word; }

    /* ── Status badge ── */
    .status-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:999px; font-size:0.74rem; font-weight:600; line-height:1; background:#f0f1f3; color:#475467; }
    .status-badge__dot { width:7px; height:7px; border-radius:50%; background:currentColor; flex:0 0 auto; }
    .status-badge--progress { background:#eff6ff; color:#1d4ed8; }
    .status-badge--progress .status-badge__dot { background:#3b82f6; }
    .status-badge--success { background:#ecfdf5; color:#047857; }
    .status-badge--success .status-badge__dot { background:#10b981; }
    .status-badge--warning { background:#fff7ed; color:#c2410c; }
    .status-badge--warning .status-badge__dot { background:#f97316; }
    .status-badge--danger { background:#fef2f2; color:#b91c1c; }
    .status-badge--danger .status-badge__dot { background:#ef4444; }

    /* ── Loading ── */
    .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 16px; color:#667085; font-size:0.84rem; }
    .loading-spinner { width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#7f1714; border-radius:50%; animation:spin 0.7s linear infinite; }
    .loading-spinner--inline { width:13px; height:13px; border-width:2px; flex:0 0 auto; border-color:rgba(127,23,20,0.15); border-top-color:#7f1714; }
    .loading-spinner--sm { width:14px; height:14px; border-width:2px; border-color:rgba(255,255,255,0.3); border-top-color:#fff; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Empty state ── */
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:32px 18px; text-align:center; }
    .empty-state__icon { width:32px; height:32px; fill:#c4ccd6; }
    .empty-state p { margin:0; color:#8b95a5; font-size:0.84rem; }

    /* ── Layout grid ── */
    .layout-grid { display:grid; grid-template-columns:minmax(0, 5fr) minmax(0, 7fr); gap:14px; align-items:start; }

    /* ── Panel ── */
    .panel { border-radius:12px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,0.04); padding:16px; display:grid; gap:14px; }
    .panel__header { display:flex; align-items:flex-start; gap:12px; }
    .panel__header-icon { width:32px; height:32px; border-radius:8px; background:rgba(127,23,20,0.06); display:grid; place-items:center; flex:0 0 auto; }
    .panel__header-icon svg { width:16px; height:16px; fill:#7f1714; }
    .panel__title { margin:0; font-size:0.9rem; color:#1a1a2e; font-weight:700; line-height:1.3; }
    .panel__desc { margin:2px 0 0; color:#8b95a5; font-size:0.74rem; line-height:1.4; }

    /* Catalog "Formatos disponibles": dense, corporate */
    .panel--formats-catalog { gap:8px; padding:12px 12px 10px; align-self:start; }
    .panel--formats-catalog .panel__header { gap:10px; }
    .panel--formats-catalog .panel__header-icon { width:28px; height:28px; border-radius:6px; }
    .panel--formats-catalog .panel__header-icon svg { width:14px; height:14px; }
    .panel--formats-catalog .panel__title { font-size:0.86rem; letter-spacing:-0.01em; }
    .panel--formats-catalog .panel__desc { font-size:0.71rem; margin-top:1px; line-height:1.35; }
    .panel--formats-catalog .loading-state--panel-tight { padding:22px 12px; }
    .panel--formats-catalog .empty-state--panel-tight { padding:22px 12px; gap:8px; }

    .signed-docs-in-panel {
      margin-top:10px;
      padding-top:14px;
      border-top:1px solid #eceef2;
      display:grid;
      gap:10px;
      min-width:0;
    }
    .signed-docs-in-panel__header { gap:10px; }
    .signed-docs-in-panel__header .panel__header-icon { width:28px; height:28px; border-radius:6px; }
    .signed-docs-in-panel__header .panel__header-icon svg { width:14px; height:14px; }
    .signed-docs-in-panel__header .panel__title { font-size:0.86rem; letter-spacing:-0.01em; }
    .signed-docs-in-panel__header .panel__desc { font-size:0.71rem; margin-top:1px; line-height:1.35; }
    .signed-docs-in-panel .loading-state { padding:24px 12px; }
    .signed-docs-in-panel .empty-state { padding:22px 12px; }

    .signed-docs-pager {
      display:flex;
      flex-wrap:wrap;
      align-items:center;
      justify-content:center;
      gap:10px;
      margin-top:4px;
      padding-top:8px;
    }
    .signed-docs-pager__status { font-size:0.74rem; color:#667085; }
    .signed-docs-pager__btn { min-width:92px; }

    .doc-table-scroll {
      min-width:0;
      max-width:100%;
      overflow-x:auto;
      -webkit-overflow-scrolling:touch;
    }

    .panel--formats-catalog .doc-table { font-size:0.78rem; }
    .panel--formats-catalog .doc-table th { padding:8px 10px; font-size:0.65rem; }
    .panel--formats-catalog .doc-table td { padding:10px; }
    .panel--formats-catalog .doc-table__desc { max-width:none; }

    .record-list--format-catalog { gap:8px; }

    .record-card--format-gdr {
      padding:9px 10px 8px;
      gap:5px;
      border-radius:8px;
      border-color:#e8eaed;
    }
    .record-card--format-gdr .record-card__format-head {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      flex-wrap:wrap;
    }
    .record-card--format-gdr .record-card__format-head strong {
      font-size:0.82rem;
      font-weight:600;
      line-height:1.2;
      color:#1a1a2e;
    }
    .record-card--format-gdr p { margin:0; font-size:0.74rem; line-height:1.38; color:#5c6670; }
    .record-card--format-gdr .status-badge--quiet {
      padding:2px 7px;
      font-size:0.62rem;
      font-weight:600;
      background:#f1f3f6;
      color:#556070;
      border:1px solid #e5e9ef;
      flex-shrink:0;
    }
    .record-card--format-gdr .status-badge--quiet .status-badge__dot { width:5px; height:5px; opacity:0.85; background:#556070; }
    .record-card--format-gdr .record-card__cta { margin-top:1px; display:flex; justify-content:flex-start; }
    .record-card--format-gdr .btn--compact {
      min-height:28px;
      padding:0 12px;
      font-size:0.72rem;
      font-weight:600;
      border-radius:6px;
    }
    .record-card--format-gdr .hint-text {
      margin:0;
      font-size:0.7rem;
      color:#8b95a5;
      line-height:1.38;
    }

    /* ── Selection block ── */
    .selection-block { display:grid; gap:10px; padding-bottom:2px; border-bottom:1px solid #f1f3f5; }

    /* ── Form ── */
    .form-grid { display:grid; gap:12px; min-width:0; }
    .field { display:grid; gap:6px; min-width:0; }
    .field__label { font-size:0.78rem; color:#344054; font-weight:600; }
    .field--full { grid-column:1 / -1; }
    .field small { color:#8b95a5; font-size:0.74rem; line-height:1.45; }
    input, select { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px; padding:9px 12px; font:inherit; background:#fff; color:#1a1a2e; box-sizing:border-box; font-size:0.84rem; }
    input:focus, select:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; min-width:0; }
    .form-actions--start { justify-content:flex-start; }

    /* ── Record cards ── */
    .record-list { display:grid; gap:12px; }
    .record-list--wide { grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); }

    /* ── Tabla documentos firmados ── */
    .doc-table-wrap { overflow:visible; border:1px solid #e5e7eb; border-radius:12px; background:#fff; }
    .doc-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
    .doc-table th { text-align:left; padding:10px 12px; background:#f9fafb; color:#475467; font-size:0.68rem; font-weight:700; letter-spacing:0.06em; border-bottom:1px solid #e5e7eb; white-space:nowrap; }
    .doc-table td { padding:12px; border-bottom:1px solid #f1f3f5; vertical-align:top; color:#344054; }
    .doc-table tbody tr:last-child td { border-bottom:none; }
    .doc-table__th-actions { text-align:right; }
    .doc-table__name-link { display:inline; padding:0; border:none; background:none; font:inherit; font-weight:600; color:#1d4ed8; cursor:pointer; text-align:left; text-decoration:underline; text-underline-offset:2px; }
    .doc-table__name-link:hover { color:#1e3a8a; }
    .doc-table__tipo { margin-top:4px; font-size:0.74rem; color:#8b95a5; line-height:1.4; }
    .doc-table__desc { max-width:280px; overflow-wrap:anywhere; word-break:break-word; color:#526274; }
    .doc-table__fecha { white-space:nowrap; color:#475467; }
    .doc-table__actions { text-align:right; white-space:nowrap; vertical-align:middle; }
    .doc-table__actions-empty { color:#98a2b3; font-size:0.85rem; }
    .doc-actions-menu { position:relative; display:inline-flex; justify-content:flex-end; }
    .doc-actions-menu__trigger {
      display:inline-grid; place-items:center; width:36px; height:36px; padding:0; border:1px solid #bfdbfe; border-radius:8px;
      background:#eff6ff; cursor:pointer; color:#1d4ed8;
    }
    .doc-actions-menu__trigger:hover { background:#dbeafe; border-color:#93c5fd; }
    .doc-actions-menu__icon { width:18px; height:18px; fill:currentColor; }
    .doc-actions-menu__popover {
      min-width:180px; padding:6px; margin:0;
      background:#fff; border:1px solid #e5e7eb; border-radius:10px; box-shadow:0 10px 30px rgba(15,23,42,0.12);
      display:grid; gap:2px;
    }
    .doc-actions-menu__popover--fixed {
      position:fixed;
      z-index:220;
    }
    .doc-actions-menu__item {
      display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; border:0; border-radius:8px; background:transparent;
      font:inherit; font-size:0.82rem; font-weight:500; color:#1f2937; cursor:pointer; text-align:left;
    }
    .doc-actions-menu__item:hover { background:#f3f4f6; }
    .doc-actions-menu__item--danger { color:#b91c1c; }
    .doc-actions-menu__item--danger:hover { background:#fef2f2; }
    .doc-actions-menu__item-icon { width:18px; height:18px; fill:currentColor; flex-shrink:0; }

    .record-card { border:1px solid #e5e7eb; border-radius:12px; background:#fff; padding:14px; display:grid; gap:10px; }
    .record-card__head { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap; }
    .record-card__eyebrow { display:block; margin-bottom:4px; font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:700; }
    .record-card strong { color:#1a1a2e; font-size:0.9rem; line-height:1.45; }
    .record-card p { margin:0; color:#667085; font-size:0.8rem; line-height:1.5; }
    .record-card__meta { display:grid; gap:4px; color:#667085; font-size:0.76rem; }
    .record-card__meta--grid { grid-template-columns:repeat(2, minmax(0, 1fr)); gap:6px 10px; }

    /* ── Request card ── */
    .request-card { border:1px solid #e5e7eb; border-radius:12px; background:#fff; padding:14px; display:grid; gap:10px; }
    .request-card__message { margin:0; color:#526274; font-size:0.8rem; line-height:1.5; }
    .action-group { display:flex; flex-wrap:wrap; gap:8px; }

    /* ── Contingency (siempre visible) ── */
    .contingency-section { border-top:1px solid #f1f3f5; padding-top:12px; display:grid; gap:10px; }
    textarea { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px; padding:9px 12px; font:inherit; background:#fff; color:#1a1a2e; box-sizing:border-box; font-size:0.84rem; resize:vertical; min-height:72px; }
    textarea:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }

    /* ── Modal ── */
    .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,0.35); z-index:90; backdrop-filter:blur(2px); }
    .modal { position:fixed; inset:50% auto auto 50%; transform:translate(-50%, -50%); width:min(680px, calc(100vw - 32px)); max-height:calc(100vh - 32px); overflow:auto; border-radius:14px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 20px 60px rgba(15,23,42,0.15); padding:22px; z-index:100; display:grid; gap:14px; }
    .modal__header { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .modal__eyebrow { margin:0 0 4px; font-size:0.68rem; font-weight:700; letter-spacing:0.08em; color:#8b95a5; text-transform:uppercase; }
    .modal__header h2 { margin:0; color:#1a1a2e; font-size:1.05rem; font-weight:700; }
    .modal__subtitle { margin:4px 0 0; color:#667085; font-size:0.78rem; line-height:1.5; }
    .modal__close { border:none; background:transparent; color:#8b95a5; width:32px; height:32px; border-radius:8px; cursor:pointer; display:inline-grid; place-items:center; padding:0; }
    .modal__close svg { width:16px; height:16px; fill:currentColor; }
    .modal__close:hover { background:#f1f3f5; color:#475467; }

    .modal--firmar { width:min(520px, calc(100vw - 32px)); z-index:110; }
    .modal__header-title-plain { margin:0; color:#1a1a2e; font-size:1.05rem; font-weight:700; }
    .firmar-modal__file-name { margin:6px 0 0; word-break:break-word; }
    .firmar-modal__body { display:grid; gap:14px; min-width:0; }
    .firmar-catalog-error { margin:0 0 8px; font-size:0.8rem; line-height:1.4; color:#991b1b; }
    .modal__footer { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
    .firmar-modal__footer { margin-top:4px; }
    .firmar-modal__send { background:#2563eb; box-shadow:0 1px 3px rgba(37,99,235,0.25); }
    .firmar-modal__send:hover { background:#1d4ed8; }
    .visually-hidden { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

    /* ── Responsive ── */
    @media (max-width: 920px) {
      .layout-grid { grid-template-columns:1fr; }
    }
    @media (max-width: 720px) {
      .page { padding:14px 14px 22px; }
      .page__header { flex-direction:column; align-items:stretch; gap:12px; }
      .page__actions { flex-direction:column; }
      .page__actions .btn { width:100%; }
      .context-bar { flex-direction:column; gap:0; }
      .context-bar__divider { width:100%; height:1px; }
      .record-card__meta--grid { grid-template-columns:1fr; }
      .action-group { flex-direction:column; }
      .action-group .btn { width:100%; }
      .form-actions { flex-direction:column; }
      .form-actions .btn { width:100%; }
      .modal { width:calc(100vw - 16px); max-height:calc(100vh - 16px); padding:16px; border-radius:12px; }
    }
    @media (max-width: 560px) {
      .modal { padding:14px; }
    }
  `]
})
export class DocumentsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly documentsService = inject(DocumentsService);
  private readonly toastService = inject(UiToastService);

  readonly evaluatedId = signal<number | null>(null);
  readonly availableEvaluations = signal<FinalEvaluationSummary[]>([]);
  readonly documentTypes = signal<TipoDocumento[]>([]);
  readonly templates = signal<PlantillaDocumento[]>([]);
  readonly signedDocumentsPage = signal<PageResponse<DocumentoFirmadoResumen> | null>(null);
  readonly signedDocumentsPageIndex = signal(0);
  private readonly signedDocumentsPageSize = 10;
  readonly signedDocuments = computed(() => this.signedDocumentsPage()?.content ?? []);
  readonly signedDocumentsTotal = computed(() => this.signedDocumentsPage()?.totalElements ?? 0);
  readonly currentRequest = signal<SolicitudFirmaDetalle | null>(null);
  readonly lastStartInfo = signal<InicioFirma | null>(null);
  readonly loadingStatic = signal(true);
  readonly loadingEvaluations = signal(false);
  readonly loadingDocuments = signal(false);
  readonly uploading = signal(false);
  readonly preparing = signal(false);
  readonly starting = signal(false);
  readonly refreshingRequest = signal(false);
  readonly returning = signal(false);
  readonly returnModalOpen = signal(false);
  readonly downloadingFormatoGdr = signal(false);
  readonly errorMessage = signal('');
  /** Fila cuyo menú hamburguesa de acciones está abierto (null = ninguno). */
  readonly openActionsMenuId = signal<number | null>(null);
  /** Posición del popover en viewport (`position: fixed`) para evitar recorte por ancestors con overflow. */
  readonly actionsMenuViewportPosition = signal<{ top: number; right: number } | null>(null);
  readonly selectedFileName = signal('');
  readonly returnFileName = signal('');
  readonly firmarModalOpen = signal(false);
  readonly firmarTargetDocument = signal<DocumentoFirmadoResumen | null>(null);
  readonly firmarOfficeOptions = signal<HrOrgUnitOrganigrama[]>([]);
  readonly loadingFirmarCatalog = signal(false);
  readonly firmarOrgCatalogError = signal<string | null>(null);
  readonly selectedOrgUnitId = signal<number | null>(null);
  readonly firmarMotivo = signal('SOY_AUTOR');
  readonly firmarApariencia = signal('SELLO_DESC_HORIZ');

  readonly firmarMotivoOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'SOY_AUTOR', label: 'Soy el autor del documento' },
    { value: 'APRUEBO_CONTENIDO', label: 'Apruebo el contenido del documento' },
    { value: 'CERTIFICO_COPIA', label: 'Certifico que es copia fiel del original' }
  ];

  readonly firmarAparienciaOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'SELLO_DESC_HORIZ', label: 'Sello + Descripción Horizontal' },
    { value: 'SELLO_DESC_VERT', label: 'Sello + Descripción Vertical' },
    { value: 'SOLO_SELLO', label: 'Solo sello' }
  ];

  readonly firmarOfficeSelectValue = computed(() =>
    this.selectedOrgUnitId() == null ? '' : String(this.selectedOrgUnitId())
  );

  readonly canPrepareDocuments = computed(
    () => this.authService.featureAccess()?.canPrepareDocuments ?? false
  );
  readonly canStartSignatureFlow = computed(
    () => this.authService.featureAccess()?.canStartSignatureFlow ?? false
  );
  readonly canRegisterSignatureReturn = computed(
    () => this.authService.featureAccess()?.canRegisterSignatureReturn ?? false
  );
  readonly canRegisterSignedDocuments = computed(
    () => this.authService.featureAccess()?.canRegisterSignedDocuments ?? false
  );

  readonly catalogDisplayedTemplates = computed(() =>
    this.templates().filter((t) => t.codigoTipoDocumento === 'ACTA_RETROALIMENTACION')
  );

  readonly selectionForm = this.fb.group({
    evaluatedId: [null as number | null, [Validators.required]]
  });

  readonly signatureForm = this.fb.group({
    tipoDocumentoId: [null as number | null, [Validators.required]],
    plantillaId: [null as number | null, [Validators.required]]
  });

  readonly uploadForm = this.fb.group({
    descripcion: [
      '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(400)]
    ]
  });

  readonly returnForm = this.fb.group({
    codigoEstadoFlujo: ['FIRMADO' as 'FIRMADO' | 'ERROR_FIRMA' | 'FIRMA_CANCELADA', [Validators.required]],
    codigoResultadoFirma: ['OK'],
    mensajeResultadoFirma: ['Documento firmado registrado desde el flujo del sistema.']
  });

  private selectedFileValue: File | null = null;
  private returnFileValue: File | null = null;

  constructor() {
    const evaluatedId = Number(this.route.snapshot.queryParamMap.get('evaluatedId') || 0);
    this.evaluatedId.set(evaluatedId > 0 ? evaluatedId : null);
    this.selectionForm.patchValue({ evaluatedId: this.evaluatedId() });
    this.loadAvailableEvaluations();
    this.loadStaticData();
    const requestId = Number(this.route.snapshot.queryParamMap.get('solicitudFirmaId') || 0);
    if (requestId > 0) {
      this.loadSignatureRequest(requestId);
    }
    if (this.evaluatedId()) {
      this.loadDocuments();
    }
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

  selectedFile(): File | null {
    return this.selectedFileValue;
  }

  isInProgressState(state: string): boolean {
    return state === 'EN_FIRMA' || state === 'FIRMA_SOLICITADA';
  }

  isSuccessState(state: string): boolean {
    return state === 'REGISTRADO' || state === 'VIGENTE';
  }

  availableTemplatesByType(): PlantillaDocumento[] {
    const tipoDocumentoId = this.signatureForm.getRawValue().tipoDocumentoId;
    if (!tipoDocumentoId) {
      return this.templates();
    }
    return this.templates().filter((template) => template.idTipoDocumento === tipoDocumentoId);
  }

  applyEvaluatedSelection(): void {
    const selectedEvaluatedId = this.selectionForm.getRawValue().evaluatedId;
    if (!selectedEvaluatedId) {
      this.errorMessage.set('Seleccione un evaluado para continuar.');
      return;
    }

    this.errorMessage.set('');
    this.evaluatedId.set(selectedEvaluatedId);
    this.signedDocumentsPageIndex.set(0);
    this.signedDocumentsPage.set(null);
    this.currentRequest.set(null);
    this.lastStartInfo.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { evaluatedId: selectedEvaluatedId, solicitudFirmaId: null },
      queryParamsHandling: 'merge'
    });
    this.loadDocuments();
  }

  onDocumentTypeChange(): void {
    this.signatureForm.patchValue({ plantillaId: null });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    if (!file) {
      this.selectedFileValue = null;
      this.selectedFileName.set('');
      return;
    }
    const name = file.name.toLowerCase();
    const mime = file.type.toLowerCase();
    if (!name.endsWith('.pdf') || (mime !== '' && mime !== 'application/pdf')) {
      this.errorMessage.set('Solo se permiten archivos PDF.');
      this.selectedFileValue = null;
      this.selectedFileName.set('');
      if (input) {
        input.value = '';
      }
      return;
    }
    this.errorMessage.set('');
    this.selectedFileValue = file;
    this.selectedFileName.set(file.name);
  }

  onReturnFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    this.returnFileValue = file;
    this.returnFileName.set(file?.name ?? '');
  }

  onReturnStateChange(): void {
    const state = this.returnForm.getRawValue().codigoEstadoFlujo;
    if (state === 'FIRMADO') {
      this.returnForm.patchValue({
        codigoResultadoFirma: 'OK',
        mensajeResultadoFirma: 'Documento firmado registrado desde el flujo del sistema.'
      });
      return;
    }
    if (state === 'ERROR_FIRMA') {
      this.returnForm.patchValue({
        codigoResultadoFirma: 'ERROR',
        mensajeResultadoFirma: 'La firma no pudo completarse.'
      });
      return;
    }
    this.returnForm.patchValue({
      codigoResultadoFirma: 'CANCELADO',
      mensajeResultadoFirma: 'La firma fue cancelada.'
    });
  }

  submitPreparation(): void {
    if (!this.canPrepareDocuments()) {
      this.errorMessage.set('Su perfil no tiene permiso para preparar documentos para firma.');
      return;
    }
    if (!this.evaluatedId()) {
      this.errorMessage.set('Seleccione un evaluado antes de preparar el documento.');
      return;
    }
    if (this.signatureForm.invalid) {
      this.signatureForm.markAllAsTouched();
      this.errorMessage.set('Seleccione un tipo documental y una plantilla valida.');
      return;
    }

    this.preparing.set(true);
    this.errorMessage.set('');
    this.lastStartInfo.set(null);
    this.documentsService
      .prepareSignatureDocument(this.evaluatedId()!, this.signatureForm.getRawValue().plantillaId as number)
      .subscribe({
        next: (request) => {
          this.preparing.set(false);
          this.currentRequest.set(request);
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { evaluatedId: this.evaluatedId(), solicitudFirmaId: request.idSolicitudFirma },
            queryParamsHandling: 'merge'
          });
          this.toastService.success('Documento preparado', 'La solicitud quedo lista para iniciar firma.');
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.preparing.set(false);
        }
      });
  }

  startSignature(): void {
    if (!this.canStartSignatureFlow()) {
      this.errorMessage.set('Su perfil no tiene permiso para iniciar solicitudes de firma.');
      return;
    }
    const request = this.currentRequest();
    if (!request) {
      this.errorMessage.set('Primero prepare un documento para continuar.');
      return;
    }

    this.starting.set(true);
    this.errorMessage.set('');
    const startFlow$ = request.estadoFlujo === 'LISTO_PARA_FIRMA'
      ? this.documentsService.createSignatureRequest(request.idSolicitudFirma).pipe(
          switchMap((createdRequest) => {
            this.currentRequest.set(createdRequest);
            return this.documentsService.startSignatureRequest(createdRequest.idSolicitudFirma);
          })
        )
      : this.documentsService.startSignatureRequest(request.idSolicitudFirma);

    startFlow$.subscribe({
      next: (startInfo) => {
        this.starting.set(false);
        this.lastStartInfo.set(startInfo);
        this.toastService.success('Firma iniciada', startInfo.mensajeIntegracion);
        this.loadSignatureRequest(startInfo.idSolicitudFirma);
        this.openFirmaPeru();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.starting.set(false);
      }
    });
  }

  refreshSignatureRequest(): void {
    if (!this.currentRequest()) {
      return;
    }
    this.refreshingRequest.set(true);
    this.documentsService.getSignatureRequest(this.currentRequest()!.idSolicitudFirma).subscribe({
      next: (request) => {
        this.currentRequest.set(request);
        this.refreshingRequest.set(false);
        if (request.idDocumentoFirmado) {
          this.loadDocuments();
        }
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.refreshingRequest.set(false);
      }
    });
  }

  openFirmaPeru(): void {
    const url = this.currentRequest()?.urlFirma || this.lastStartInfo()?.urlFirma;
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  openPreparedDocument(): void {
    if (!this.currentRequest()) {
      return;
    }
    this.documentsService.getPreparedDocumentFile(this.currentRequest()!.idSolicitudFirma).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  openReturnModal(): void {
    if (!this.canRegisterSignatureReturn()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar el retorno de firma.');
      return;
    }
    this.returnForm.reset({
      codigoEstadoFlujo: 'FIRMADO',
      codigoResultadoFirma: 'OK',
      mensajeResultadoFirma: 'Documento firmado registrado desde el flujo del sistema.'
    });
    this.returnFileValue = null;
    this.returnFileName.set('');
    this.returnModalOpen.set(true);
  }

  closeReturnModal(): void {
    this.returnModalOpen.set(false);
    this.returning.set(false);
  }

  submitReturn(): void {
    if (!this.canRegisterSignatureReturn()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar el retorno de firma.');
      return;
    }
    if (!this.currentRequest()) {
      return;
    }

    const raw = this.returnForm.getRawValue();
    const payload: RegistrarRetornoFirmaPayload = {
      codigoEstadoFlujo: raw.codigoEstadoFlujo as 'FIRMADO' | 'ERROR_FIRMA' | 'FIRMA_CANCELADA',
      codigoResultadoFirma: (raw.codigoResultadoFirma ?? '').trim() || null,
      mensajeResultadoFirma: (raw.mensajeResultadoFirma ?? '').trim() || null,
      archivoFirmado: this.returnFileValue
    };

    if (payload.codigoEstadoFlujo === 'FIRMADO' && !payload.archivoFirmado) {
      this.errorMessage.set('Adjunte el PDF firmado para registrar un retorno exitoso.');
      return;
    }

    this.returning.set(true);
    this.errorMessage.set('');
    this.documentsService.registerSignatureReturn(this.currentRequest()!.idSolicitudFirma, payload).subscribe({
      next: (request) => {
        this.returning.set(false);
        this.returnModalOpen.set(false);
        this.currentRequest.set(request);
        if (request.idDocumentoFirmado) {
          this.loadDocuments();
        }
        this.toastService.success('Retorno registrado', 'El resultado de firma quedo trazado en el sistema.');
      },
      error: (error: Error) => {
        this.returning.set(false);
        this.errorMessage.set(error.message);
      }
    });
  }

  submitUpload(): void {
    if (!this.canRegisterSignedDocuments()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar documentos firmados por contingencia.');
      return;
    }
    if (!this.evaluatedId()) {
      this.errorMessage.set('Seleccione un evaluado desde evaluacion final antes de cargar el documento.');
      return;
    }
    if (this.uploadForm.invalid || !this.selectedFile()) {
      this.uploadForm.markAllAsTouched();
      this.errorMessage.set('Ingrese la descripcion y un archivo PDF valido.');
      return;
    }

    const descripcionRaw = (this.uploadForm.getRawValue().descripcion ?? '').trim();
    if (!descripcionRaw) {
      this.uploadForm.markAllAsTouched();
      this.errorMessage.set('Ingrese la descripcion y un archivo PDF valido.');
      return;
    }

    this.uploading.set(true);
    this.errorMessage.set('');
    this.documentsService
      .registerSignedDocument(this.evaluatedId()!, descripcionRaw, this.selectedFile()!)
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.uploadForm.reset({ descripcion: '' });
          this.selectedFileValue = null;
          this.selectedFileName.set('');
          this.loadDocuments();
          this.toastService.success('Documento registrado', 'El documento firmado fue almacenado correctamente.');
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.uploading.set(false);
        }
      });
  }

  formatSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /** Etiqueta de tipo en listado: contingencia (OTROS) segun lineamiento de pantalla. */
  signedDocumentListTypeLabel(doc: DocumentoFirmadoResumen): string {
    if (doc.codigoTipoDocumento === 'OTROS') {
      return 'Formato GDR (firmado)';
    }
    return doc.tipoDocumento;
  }

  downloadSignedDocument(doc: DocumentoFirmadoResumen): void {
    this.errorMessage.set('');
    this.documentsService.getSignedDocumentFile(doc.idDocumentoFirmado, true).subscribe({
      next: (blob) => this.downloadBlob(blob, doc.nombreOriginal),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  @HostListener('document:click')
  onDocumentClickCloseActionsMenu(): void {
    this.openActionsMenuId.set(null);
    this.actionsMenuViewportPosition.set(null);
  }

  toggleRowActionsMenu(event: Event, documentId: number): void {
    event.stopPropagation();
    const current = this.openActionsMenuId();
    if (current === documentId) {
      this.openActionsMenuId.set(null);
      this.actionsMenuViewportPosition.set(null);
      return;
    }
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.actionsMenuViewportPosition.set({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right
    });
    this.openActionsMenuId.set(documentId);
  }

  onFirmarMenuClick(event: Event, document: DocumentoFirmadoResumen): void {
    event.stopPropagation();
    this.openActionsMenuId.set(null);
    this.actionsMenuViewportPosition.set(null);
    this.firmarTargetDocument.set(document);
    this.selectedOrgUnitId.set(null);
    this.firmarMotivo.set('SOY_AUTOR');
    this.firmarApariencia.set('SELLO_DESC_HORIZ');
    this.firmarOfficeOptions.set([]);
    this.firmarOrgCatalogError.set(null);
    this.firmarModalOpen.set(true);
    this.loadFirmarOffices();
  }

  closeFirmarModal(): void {
    this.firmarModalOpen.set(false);
    this.firmarTargetDocument.set(null);
    this.firmarOfficeOptions.set([]);
    this.firmarOrgCatalogError.set(null);
    this.selectedOrgUnitId.set(null);
  }

  onFirmarOfficeSelect(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    if (raw === '') {
      this.selectedOrgUnitId.set(null);
      return;
    }
    const id = Number(raw);
    this.selectedOrgUnitId.set(Number.isNaN(id) ? null : id);
  }

  private loadFirmarOffices(): void {
    this.loadingFirmarCatalog.set(true);
    this.firmarOrgCatalogError.set(null);
    this.documentsService.listOrganizationalUnitsForSigning().subscribe({
      next: (list) => {
        this.firmarOfficeOptions.set(Array.isArray(list) ? list : []);
        const selected = this.selectedOrgUnitId();
        const rows = this.firmarOfficeOptions();
        if (selected != null && !rows.some((r) => r.id === selected)) {
          this.selectedOrgUnitId.set(null);
        }
        this.loadingFirmarCatalog.set(false);
      },
      error: (err: Error) => {
        this.firmarOrgCatalogError.set(
          err.message || 'No se pudo cargar el catalogo de oficinas. Compruebe la sesion o intente de nuevo.'
        );
        this.firmarOfficeOptions.set([]);
        this.loadingFirmarCatalog.set(false);
      }
    });
  }

  retryFirmarOfficeCatalog(): void {
    this.loadFirmarOffices();
  }

  onFirmarMotivoSelect(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.firmarMotivo.set(v);
  }

  onFirmarAparienciaSelect(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.firmarApariencia.set(v);
  }

  submitFirmarArchivo(): void {
    if (this.selectedOrgUnitId() == null) {
      this.toastService.error(
        'Oficina requerida',
        'Seleccione una oficina en el listado antes de enviar.'
      );
      return;
    }
    this.toastService.success(
      'Solicitud registrada',
      'La integracion con el proveedor externo de firma digital esta pendiente segun la linea institucional. Puede continuar el tramite cuando este habilitado.'
    );
    this.closeFirmarModal();
  }

  deleteSignedDocumentRow(event: Event, doc: DocumentoFirmadoResumen): void {
    event.stopPropagation();
    this.openActionsMenuId.set(null);
    this.actionsMenuViewportPosition.set(null);
    if (
      !globalThis.confirm(
        '¿Desactivar este documento firmado? Dejara de mostrarse en el listado de activos.'
      )
    ) {
      return;
    }
    this.errorMessage.set('');
    this.documentsService.deleteSignedDocument(doc.idDocumentoFirmado).subscribe({
      next: () => {
        this.loadDocuments();
        this.toastService.success('Documento eliminado', 'El registro fue desactivado en el sistema.');
      },
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }

  downloadFormatoGdrPdfFile(): void {
    const evaluatedIdValue = this.evaluatedId();
    if (!evaluatedIdValue || !this.canPrepareDocuments()) {
      return;
    }
    this.downloadingFormatoGdr.set(true);
    this.documentsService.downloadFormatoGdrPdf(evaluatedIdValue).subscribe({
      next: (result: FormatoGdrPdfDownload) => {
        this.downloadBlob(result.blob, result.fileName);
        this.downloadingFormatoGdr.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message || 'No se pudo generar el Formato GDR.');
        this.downloadingFormatoGdr.set(false);
      }
    });
  }

  /** Descarga PDF desde plantilla catalogada en DOC_PLANTILLA (distinto del Formato GDR Excel generado). */
  downloadTemplatePdf(template: PlantillaDocumento): void {
    this.documentsService.downloadTemplate(template.idPlantilla).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, template.nombreOriginal);
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  private loadStaticData(): void {
    this.loadingStatic.set(true);
    this.documentsService.listTypes().subscribe({
      next: (documentTypes) => this.documentTypes.set(documentTypes),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.documentsService.listTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loadingStatic.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loadingStatic.set(false);
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

  private loadSignatureRequest(requestId: number): void {
    this.refreshingRequest.set(true);
    this.documentsService.getSignatureRequest(requestId).subscribe({
      next: (request) => {
        this.currentRequest.set(request);
        this.signatureForm.patchValue({
          tipoDocumentoId: request.idTipoDocumento,
          plantillaId: request.idPlantilla
        });
        if (!this.evaluatedId()) {
          this.evaluatedId.set(request.idEvaluado);
          this.selectionForm.patchValue({ evaluatedId: request.idEvaluado });
          this.loadDocuments();
        }
        this.refreshingRequest.set(false);
      },
      error: () => {
        this.refreshingRequest.set(false);
      }
    });
  }

  goToSignedDocumentsPage(page: number): void {
    if (page < 0) {
      return;
    }
    this.loadDocuments(page);
  }

  private loadDocuments(page?: number): void {
    if (!this.evaluatedId()) {
      this.signedDocumentsPage.set(null);
      return;
    }
    const pageIndex = page ?? this.signedDocumentsPageIndex();
    this.signedDocumentsPageIndex.set(pageIndex);
    this.loadingDocuments.set(true);
    this.documentsService
      .listSignedDocuments(this.evaluatedId()!, pageIndex, this.signedDocumentsPageSize)
      .subscribe({
        next: (resp) => {
          if (resp.content.length === 0 && resp.totalElements > 0 && pageIndex > 0) {
            this.loadDocuments(pageIndex - 1);
            return;
          }
          this.signedDocumentsPage.set(resp);
          this.loadingDocuments.set(false);
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.loadingDocuments.set(false);
        }
      });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }
}
