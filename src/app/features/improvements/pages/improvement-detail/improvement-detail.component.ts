import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { OportunidadMejoraDetalle, RegistrarOportunidadMejoraPayload } from '../../../../core/improvements/improvements.models';
import { ImprovementsService } from '../../../../core/improvements/improvements.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-improvement-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb" aria-label="Navegacion">
        <a routerLink="/dashboard" class="breadcrumb__link">Inicio</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <a
          [routerLink]="['/dashboard/oportunidades-mejora']"
          [queryParams]="detail() ? { evaluatedId: detail()!.idEvaluado } : null"
          class="breadcrumb__link"
        >
          Oportunidades de mejora
        </a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <span class="breadcrumb__current">Detalle</span>
      </nav>

      <!-- Page header -->
      <div class="page__header">
        <div class="page__header-left">
          <h1>Detalle de oportunidad</h1>
          <p class="page__subtitle">Seguimiento minimo y cierre conservador vinculados al resultado consolidado del evaluado.</p>
        </div>
        <div class="page__actions">
          <a
            [routerLink]="['/dashboard/oportunidades-mejora']"
            [queryParams]="detail() ? { evaluatedId: detail()!.idEvaluado } : null"
            class="btn btn--outline-neutral btn--sm"
          >
            <svg class="btn__icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.5 4.5 4 10l5.5 5.5 1.1-1.1-3.6-3.6H16v-1.6H7l3.6-3.6-1.1-1.1Z"/>
            </svg>
            Volver al listado
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

      @if (loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>Cargando oportunidad de mejora...</span>
        </div>
      } @else if (detail()) {
        <!-- Context bar -->
        <div class="context-bar">
          <div class="context-bar__item">
            <span class="context-bar__label">Resultado</span>
            <span class="context-bar__value">#{{ detail()!.idResultado }}</span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item">
            <span class="context-bar__label">Evaluado</span>
            <span class="context-bar__value">{{ detail()!.evaluado }}</span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item">
            <span class="context-bar__label">Estado</span>
            <span class="context-bar__value">
              <span class="status-pill" [class.status-pill--open]="detail()!.codigoEstado === 'OPEN'" [class.status-pill--closed]="detail()!.codigoEstado === 'CLOSED'">
                {{ detail()!.nombreEstado }}
              </span>
            </span>
          </div>
          <div class="context-bar__divider"></div>
          <div class="context-bar__item">
            <span class="context-bar__label">Plazo</span>
            <span class="context-bar__value">{{ detail()!.plazoCompromiso }}</span>
          </div>
        </div>

        <!-- Layout grid -->
        <div class="layout-grid">
          <!-- Gestion minima -->
          <section class="card">
            <header class="card__header">
              <div class="card__header-left">
                <div class="card__header-icon">
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M4 14.5V16h1.5l7.7-7.7-1.5-1.5L4 14.5Zm10.9-7.8a1.1 1.1 0 0 0 0-1.6l-1-1a1.1 1.1 0 0 0-1.6 0l-.8.8L14 7.5l.9-.8Z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="card__title">Gestion minima</h2>
                  <p class="card__desc">Actualice el contenido basico o registre el cierre formal dentro del lote actual.</p>
                </div>
              </div>
            </header>

            <div class="card__body">
              <form [formGroup]="updateForm" (ngSubmit)="saveOpportunity()" class="form-grid">
                <label class="field field--full">
                  <span class="field__label">Descripcion <span class="field__required">*</span></span>
                  <textarea rows="4" formControlName="descripcion" [readonly]="isReadOnlyManagement()"></textarea>
                </label>

                <label class="field">
                  <span class="field__label">Responsable <span class="field__required">*</span></span>
                  <input type="text" formControlName="responsable" [readonly]="isReadOnlyManagement()" />
                </label>

                <label class="field">
                  <span class="field__label">Plazo compromiso <span class="field__required">*</span></span>
                  <input type="date" formControlName="plazoCompromiso" [readonly]="isReadOnlyManagement()" />
                </label>

                <label class="field">
                  <span class="field__label">Estado <span class="field__required">*</span></span>
                  <select formControlName="estadoCodigo" [disabled]="isReadOnlyManagement()">
                    <option value="OPEN">OPEN</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </label>

                @if (updateForm.get('estadoCodigo')?.value === 'CLOSED' || isClosed()) {
                  <label class="field field--full">
                    <span class="field__label">Comentario de cierre <span class="field__required">*</span></span>
                    <textarea rows="3" formControlName="comentarioCierre" [readonly]="isReadOnlyManagement()"></textarea>
                  </label>
                }

                @if (canManageImprovements() && !isClosed()) {
                  <div class="form-actions">
                    <button type="submit" class="btn btn--primary" [disabled]="saving() || updateForm.invalid">
                      @if (saving()) {
                        <span class="loading-spinner loading-spinner--sm"></span>
                      }
                      Guardar oportunidad
                    </button>
                  </div>
                } @else if (isClosed()) {
                  <div class="info-state">
                    <svg class="info-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                    </svg>
                    <span>La oportunidad se encuentra cerrada y se conserva en modo solo lectura.</span>
                  </div>
                } @else {
                  <div class="info-state">
                    <svg class="info-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                    </svg>
                    <span>Su perfil puede consultar esta oportunidad, pero no editar su gestion base.</span>
                  </div>
                }
              </form>
            </div>
          </section>

          <!-- Seguimiento minimo -->
          <section class="card">
            <header class="card__header">
              <div class="card__header-left">
                <div class="card__header-icon">
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M3 3h14v2H3V3Zm0 4h14v2H3V7Zm0 4h10v2H3v-2Zm0 4h7v2H3v-2Z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="card__title">Seguimiento minimo</h2>
                  <p class="card__desc">Bitacora simple para registrar avances mientras la oportunidad permanezca abierta.</p>
                </div>
              </div>
              @if (detail()!.seguimientos.length) {
                <span class="card__count">{{ detail()!.seguimientos.length }} {{ detail()!.seguimientos.length === 1 ? 'registro' : 'registros' }}</span>
              }
            </header>

            <div class="card__body">
              @if (canFollowupImprovements() && !isClosed()) {
                <form [formGroup]="followupForm" (ngSubmit)="saveFollowup()" class="form-grid">
                  <label class="field field--full">
                    <span class="field__label">Comentario de seguimiento <span class="field__required">*</span></span>
                    <textarea rows="3" formControlName="comentarioSeguimiento" placeholder="Registre el avance o novedad"></textarea>
                  </label>

                  <div class="form-actions">
                    <button type="submit" class="btn btn--outline" [disabled]="followupSaving() || followupForm.invalid">
                      @if (followupSaving()) {
                        <span class="loading-spinner loading-spinner--sm-dark"></span>
                      }
                      Registrar seguimiento
                    </button>
                  </div>
                </form>
              } @else if (isClosed()) {
                <div class="info-state">
                  <svg class="info-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                  </svg>
                  <span>No se registran seguimientos adicionales sobre oportunidades cerradas.</span>
                </div>
              } @else {
                <div class="info-state">
                  <svg class="info-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.2a7.8 7.8 0 1 0 0 15.6 7.8 7.8 0 0 0 0-15.6Zm0 11.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-1.8H9V6.2h2v5.6Z"/>
                  </svg>
                  <span>Su perfil puede consultar el seguimiento, pero no registrar nuevos avances.</span>
                </div>
              }

              @if (detail()!.seguimientos.length) {
                <div class="timeline">
                  @for (followup of detail()!.seguimientos; track followup.idSeguimientoOportunidadMejora) {
                    <article class="timeline__item">
                      <div class="timeline__head">
                        <strong>{{ followup.usuarioRegistro }}</strong>
                        <span>{{ followup.fechaRegistro }}</span>
                      </div>
                      <p>{{ followup.comentarioSeguimiento }}</p>
                    </article>
                  }
                </div>
              } @else {
                <div class="empty-state empty-state--sm">
                  <svg class="empty-state__icon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M3 3h14v2H3V3Zm0 4h14v2H3V7Zm0 4h10v2H3v-2Zm0 4h7v2H3v-2Z"/>
                  </svg>
                  <p>Aun no hay seguimientos registrados para esta oportunidad.</p>
                </div>
              }
            </div>
          </section>
        </div>
      }
    </section>
  `,
  styles: [`
    :host { display:block; min-width:0; }

    /* -- Page layout -- */
    .page { padding:20px 24px 28px; max-width:1120px; margin:0 auto; min-width:0; overflow-x:clip; }

    /* -- Breadcrumb -- */
    .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:16px; font-size:0.75rem; flex-wrap:wrap; }
    .breadcrumb__link { color:#7f1714; text-decoration:none; font-weight:500; }
    .breadcrumb__link:hover { text-decoration:underline; }
    .breadcrumb__sep { color:#b0b8c4; }
    .breadcrumb__current { color:#667085; font-weight:500; }

    /* -- Page header -- */
    .page__header { display:flex; justify-content:space-between; gap:16px; align-items:center; margin-bottom:20px; flex-wrap:wrap; min-width:0; }
    .page__header-left { min-width:0; }
    .page__header h1 { margin:0; color:#1a1a2e; font-size:1.35rem; font-weight:700; line-height:1.2; letter-spacing:-0.01em; }
    .page__subtitle { margin:4px 0 0; color:#667085; font-size:0.82rem; line-height:1.5; }
    .page__actions { display:flex; gap:8px; flex-wrap:wrap; }

    /* -- Alert -- */
    .alert { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; margin-bottom:16px; font-size:0.82rem; }
    .alert--error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
    .alert__icon { width:18px; height:18px; fill:currentColor; flex:0 0 auto; }

    /* -- Buttons -- */
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:36px; padding:0 16px; border-radius:8px; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all 0.15s ease; text-decoration:none; border:none; white-space:nowrap; }
    .btn__icon { width:15px; height:15px; fill:currentColor; flex:0 0 auto; }
    .btn--sm { min-height:32px; padding:0 12px; font-size:0.78rem; }
    .btn--primary { background:#7f1714; color:#fff; box-shadow:0 1px 3px rgba(127,23,20,0.2); }
    .btn--primary:hover:not(:disabled) { background:#951c18; box-shadow:0 2px 6px rgba(127,23,20,0.25); }
    .btn--primary:disabled { opacity:0.6; cursor:not-allowed; box-shadow:none; }
    .btn--outline { background:#fff; color:#7f1714; border:1px solid rgba(127,23,20,0.2); }
    .btn--outline:hover:not(:disabled) { background:rgba(127,23,20,0.04); border-color:rgba(127,23,20,0.3); }
    .btn--outline:disabled { opacity:0.6; cursor:not-allowed; }
    .btn--outline-neutral { background:#fff; color:#475467; border:1px solid #d0d5dd; }
    .btn--outline-neutral:hover { background:#f9fafb; border-color:#98a2b3; }

    /* -- Context bar -- */
    .context-bar { display:flex; align-items:stretch; gap:0; background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; margin-bottom:16px; }
    .context-bar__item { flex:1; padding:12px 14px; display:flex; flex-direction:column; gap:3px; min-width:0; }
    .context-bar__divider { width:1px; background:#e5e7eb; flex:0 0 1px; }
    .context-bar__label { font-size:0.66rem; text-transform:uppercase; letter-spacing:0.08em; color:#8b95a5; font-weight:600; }
    .context-bar__value { color:#1a1a2e; font-size:0.82rem; font-weight:600; line-height:1.4; overflow-wrap:anywhere; }

    /* -- Status pill -- */
    .status-pill { display:inline-flex; align-items:center; justify-content:center; padding:3px 10px; border-radius:999px; font-size:0.74rem; font-weight:700; }
    .status-pill--open { background:#f0fdf4; color:#15803d; }
    .status-pill--closed { background:#f1f3f5; color:#667085; }

    /* -- Layout grid -- */
    .layout-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:16px; align-items:start; }

    /* -- Card panel -- */
    .card { border-radius:12px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,0.04); overflow:hidden; }
    .card__header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; border-bottom:1px solid #f1f3f5; flex-wrap:wrap; }
    .card__header-left { display:flex; align-items:flex-start; gap:12px; }
    .card__header-icon { width:32px; height:32px; border-radius:8px; background:rgba(127,23,20,0.06); display:grid; place-items:center; flex:0 0 auto; }
    .card__header-icon svg { width:16px; height:16px; fill:#7f1714; }
    .card__title { margin:0; font-size:0.9rem; color:#1a1a2e; font-weight:700; line-height:1.3; }
    .card__desc { margin:2px 0 0; color:#8b95a5; font-size:0.74rem; line-height:1.4; }
    .card__count { font-size:0.76rem; color:#667085; font-weight:600; background:#f1f3f5; padding:4px 10px; border-radius:999px; white-space:nowrap; }
    .card__body { padding:16px 18px; display:grid; gap:16px; }

    /* -- Loading -- */
    .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 16px; color:#667085; font-size:0.84rem; }
    .loading-spinner { width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#7f1714; border-radius:50%; animation:spin 0.7s linear infinite; }
    .loading-spinner--sm { width:14px; height:14px; border-width:2px; border-color:rgba(255,255,255,0.3); border-top-color:#fff; }
    .loading-spinner--sm-dark { width:14px; height:14px; border-width:2px; border-color:rgba(127,23,20,0.15); border-top-color:#7f1714; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* -- Empty state -- */
    .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:48px 18px; text-align:center; }
    .empty-state--sm { padding:24px 18px; }
    .empty-state__icon { width:32px; height:32px; fill:#c4ccd6; }
    .empty-state p { margin:0; color:#8b95a5; font-size:0.84rem; }

    /* -- Info state -- */
    .info-state { grid-column:1 / -1; display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; background:#f8fafc; border:1px solid #e5e7eb; font-size:0.82rem; color:#667085; }
    .info-state__icon { width:16px; height:16px; fill:#8b95a5; flex:0 0 auto; }

    /* -- Form -- */
    .form-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; min-width:0; }
    .field { display:grid; gap:6px; min-width:0; }
    .field__label { font-size:0.78rem; color:#344054; font-weight:600; }
    .field__required { color:#dc2626; }
    .field--full, .form-actions { grid-column:1 / -1; }
    input, textarea, select { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px; padding:9px 12px; font:inherit; background:#fff; color:#1a1a2e; box-sizing:border-box; font-size:0.84rem; }
    input:focus, textarea:focus, select:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,0.08); }
    input[readonly], textarea[readonly] { background:#f9fafb; color:#667085; cursor:not-allowed; }
    select:disabled { background:#f9fafb; color:#667085; cursor:not-allowed; }
    textarea { resize:vertical; min-height:84px; max-width:100%; }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:6px; min-width:0; }

    /* -- Timeline -- */
    .timeline { display:grid; gap:10px; }
    .timeline__item { border:1px solid #e5e7eb; border-radius:10px; background:#f8fafc; padding:12px 14px; display:grid; gap:8px; }
    .timeline__head { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap; }
    .timeline__head strong { color:#1a1a2e; font-size:0.82rem; }
    .timeline__head span { color:#8b95a5; font-size:0.74rem; }
    .timeline__item p { margin:0; color:#475467; font-size:0.8rem; line-height:1.5; }

    /* -- Responsive -- */
    @media (max-width: 980px) {
      .context-bar { flex-direction:column; gap:0; }
      .context-bar__divider { width:100%; height:1px; }
      .layout-grid { grid-template-columns:1fr; }
    }
    @media (max-width: 720px) {
      .page { padding:14px 14px 22px; }
      .page__header { flex-direction:column; align-items:stretch; gap:12px; }
      .page__actions { flex-direction:column; }
      .page__actions .btn { width:100%; }
      .form-grid { grid-template-columns:1fr; }
      .form-actions { flex-direction:column; }
      .form-actions .btn { width:100%; }
    }
  `]
})
export class ImprovementDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly improvementsService = inject(ImprovementsService);
  private readonly toastService = inject(UiToastService);

  readonly detail = signal<OportunidadMejoraDetalle | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly followupSaving = signal(false);
  readonly errorMessage = signal('');
  readonly canManageImprovements = computed(
    () => this.authService.featureAccess()?.canManageImprovements ?? false
  );
  readonly canFollowupImprovements = computed(
    () => this.authService.featureAccess()?.canFollowupImprovements ?? false
  );

  readonly updateForm = this.fb.group({
    descripcion: ['', [Validators.required]],
    responsable: ['', [Validators.required]],
    plazoCompromiso: ['', [Validators.required]],
    estadoCodigo: ['OPEN', [Validators.required]],
    comentarioCierre: ['']
  });

  readonly followupForm = this.fb.group({
    comentarioSeguimiento: ['', [Validators.required]]
  });

  private opportunityId = 0;

  constructor() {
    this.opportunityId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.loadDetail();
  }

  isClosed(): boolean {
    return this.detail()?.codigoEstado === 'CLOSED';
  }

  isReadOnlyManagement(): boolean {
    return this.isClosed() || !this.canManageImprovements();
  }

  saveOpportunity(): void {
    if (!this.canManageImprovements()) {
      this.errorMessage.set('Su perfil no tiene permiso para editar oportunidades de mejora.');
      return;
    }
    if (!this.detail() || this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      this.errorMessage.set('Complete la informacion minima de la oportunidad de mejora.');
      return;
    }

    const raw = this.updateForm.getRawValue();
    const payload: RegistrarOportunidadMejoraPayload = {
      evaluatedId: this.detail()!.idEvaluado,
      descripcion: (raw.descripcion ?? '').trim(),
      responsable: (raw.responsable ?? '').trim(),
      plazoCompromiso: raw.plazoCompromiso ?? '',
      estadoCodigo: raw.estadoCodigo ?? 'OPEN',
      comentarioCierre: (raw.comentarioCierre ?? '').trim() || null
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.improvementsService.updateImprovement(this.opportunityId, payload).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.patchForms(detail);
        this.saving.set(false);
        this.toastService.success('Oportunidad actualizada', 'La oportunidad de mejora fue actualizada correctamente.');
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.saving.set(false);
      }
    });
  }

  saveFollowup(): void {
    if (!this.canFollowupImprovements()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar seguimientos.');
      return;
    }
    if (this.followupForm.invalid || this.isClosed()) {
      this.followupForm.markAllAsTouched();
      return;
    }

    this.followupSaving.set(true);
    this.errorMessage.set('');
    this.improvementsService
      .registerFollowup(this.opportunityId, {
        comentarioSeguimiento: (this.followupForm.getRawValue().comentarioSeguimiento ?? '').trim()
      })
      .subscribe({
        next: (detail) => {
          this.detail.set(detail);
          this.patchForms(detail);
          this.followupSaving.set(false);
          this.followupForm.reset({ comentarioSeguimiento: '' });
          this.toastService.success('Seguimiento registrado', 'El seguimiento fue registrado correctamente.');
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.followupSaving.set(false);
        }
      });
  }

  private loadDetail(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.improvementsService.getImprovement(this.opportunityId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.patchForms(detail);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  private patchForms(detail: OportunidadMejoraDetalle): void {
    this.updateForm.reset({
      descripcion: detail.descripcion,
      responsable: detail.responsable,
      plazoCompromiso: detail.plazoCompromiso,
      estadoCodigo: detail.codigoEstado,
      comentarioCierre: detail.comentarioCierre ?? ''
    });
  }
}
