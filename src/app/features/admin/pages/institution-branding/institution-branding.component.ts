import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BrandingService } from '../../../../core/branding/branding.service';
import { LoginBrandingResponse } from '../../../../core/branding/branding.models';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-institution-branding',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <nav class="breadcrumb" aria-label="Navegacion">
        <a routerLink="/dashboard" class="breadcrumb__link">Inicio</a>
        <span class="breadcrumb__sep" aria-hidden="true">/</span>
        <span class="breadcrumb__current">Personalizar empresa</span>
      </nav>

      <header class="page__header">
        <div>
          <p class="page__eyebrow">Administracion del sistema</p>
          <h1>Personalizar empresa</h1>
          <p>Configura el nombre institucional, datos de identificacion y logo visible en el sistema.</p>
        </div>
        <a routerLink="/dashboard" class="btn btn--outline-neutral btn--sm">Volver al panel</a>
      </header>

      @if (errorMessage()) {
        <div class="alert alert--error" role="alert">{{ errorMessage() }}</div>
      }

      @if (loading()) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <span>Cargando personalizacion...</span>
        </div>
      } @else {
        <div class="content-grid">
          <section class="card">
            <header class="card__header">
              <div class="card__header-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 4h12v12H4V4Zm2 2v8h8V6H6Zm1.5 6.5 2.1-2.7 1.5 1.8 1.1-1.4L13.5 13h-7l1-1.5Z"/>
                </svg>
              </div>
              <div>
                <h2>Datos institucionales</h2>
                <p>La informacion se reflejara en el encabezado y pantallas publicas del sistema.</p>
              </div>
            </header>

            <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
              <label class="field field--full">
                <span>Nombre de la institucion <strong>*</strong></span>
                <input type="text" formControlName="institutionName" />
              </label>

              <label class="field">
                <span>Nombre corto</span>
                <input type="text" formControlName="shortName" />
              </label>

              <label class="field">
                <span>RUC</span>
                <input type="text" formControlName="ruc" maxlength="11" inputmode="numeric" />
              </label>

              <label class="field field--full">
                <span>Direccion</span>
                <input type="text" formControlName="address" />
              </label>

              <label class="field field--full">
                <span>Logo institucional</span>
                <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml" (change)="onLogoSelected($event)" />
                <small>PNG, JPG, WEBP o SVG. Tamano maximo: 2 MB.</small>
              </label>

              <div class="form-actions">
                <button type="button" class="btn btn--ghost" (click)="loadBranding()">Cancelar</button>
                <button type="submit" class="btn btn--primary" [disabled]="saving()">
                  @if (saving()) {
                    <span class="loading-spinner loading-spinner--sm"></span>
                  }
                  Guardar cambios
                </button>
              </div>
            </form>
          </section>

          <aside class="card preview-card">
            <header class="card__header">
              <div class="card__header-icon">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3 5h14v10H3V5Zm2 2v6h10V7H5Zm1.5 4.5h4v-1.2h-4v1.2Zm0-2.3h7V8h-7v1.2Z"/>
                </svg>
              </div>
              <div>
                <h2>Vista previa</h2>
                <p>Referencia compacta del encabezado del sistema.</p>
              </div>
            </header>

            <div class="header-preview">
              <div class="header-preview__brand">
                @if (previewLogoUrl()) {
                  <img [src]="previewLogoUrl()!" alt="Logo institucional" />
                } @else {
                  <div class="header-preview__fallback">{{ previewInitials() }}</div>
                }
                <strong>{{ previewName() }}</strong>
              </div>
            </div>

            <dl class="summary">
              <div>
                <dt>Nombre corto</dt>
                <dd>{{ form.controls.shortName.value || 'Sin definir' }}</dd>
              </div>
              <div>
                <dt>RUC</dt>
                <dd>{{ form.controls.ruc.value || 'Sin definir' }}</dd>
              </div>
              <div>
                <dt>Direccion</dt>
                <dd>{{ form.controls.address.value || 'Sin definir' }}</dd>
              </div>
            </dl>
          </aside>
        </div>
      }
    </section>
  `,
  styles: [`
    :host { display:block; }
    .page { padding:20px 24px 28px; max-width:1120px; margin:0 auto; }
    .breadcrumb { display:flex; gap:8px; align-items:center; margin-bottom:18px; font-size:.78rem; }
    .breadcrumb__link { color:#7f1714; text-decoration:none; font-weight:700; }
    .breadcrumb__sep, .breadcrumb__current { color:#667085; }
    .page__header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:18px; flex-wrap:wrap; }
    .page__eyebrow { margin:0 0 6px; color:#7f1714; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; font-weight:800; }
    h1 { margin:0; color:#1a1a2e; font-size:1.35rem; line-height:1.2; }
    .page__header p:not(.page__eyebrow) { margin:6px 0 0; color:#667085; font-size:.84rem; line-height:1.5; }
    .content-grid { display:grid; grid-template-columns:minmax(0, 1.35fr) minmax(300px, .65fr); gap:16px; }
    .card { border-radius:12px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 1px 3px rgba(0,0,0,.04); overflow:hidden; }
    .card__header { display:flex; align-items:flex-start; gap:12px; padding:16px 18px; border-bottom:1px solid #f1f3f5; }
    .card__header-icon { width:32px; height:32px; border-radius:8px; background:rgba(100,116,139,.08); color:#64748b; display:grid; place-items:center; flex:0 0 auto; }
    .card__header-icon svg { width:16px; height:16px; fill:currentColor; }
    .card__header h2 { margin:0; font-size:.9rem; color:#1a1a2e; }
    .card__header p { margin:3px 0 0; color:#8b95a5; font-size:.74rem; line-height:1.45; }
    .form-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; padding:18px; }
    .field { display:grid; gap:6px; min-width:0; }
    .field--full, .form-actions { grid-column:1 / -1; }
    .field span { font-size:.78rem; color:#344054; font-weight:700; }
    .field strong { color:#dc2626; }
    .field small { color:#667085; font-size:.72rem; line-height:1.4; }
    input { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:8px; padding:9px 12px; font:inherit; font-size:.84rem; box-sizing:border-box; color:#1a1a2e; }
    input[type='file'] { padding:8px 10px; }
    input:focus { outline:none; border-color:#7f1714; box-shadow:0 0 0 3px rgba(127,23,20,.08); }
    .form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:4px; }
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:36px; padding:0 16px; border-radius:8px; font-size:.8rem; font-weight:700; cursor:pointer; text-decoration:none; border:0; white-space:nowrap; }
    .btn--sm { min-height:32px; padding:0 12px; font-size:.78rem; }
    .btn--primary { background:#7f1714; color:#fff; box-shadow:0 1px 3px rgba(127,23,20,.2); }
    .btn--primary:disabled { opacity:.6; cursor:not-allowed; }
    .btn--ghost, .btn--outline-neutral { background:#fff; color:#475467; border:1px solid #d0d5dd; }
    .preview-card { align-self:start; }
    .header-preview { padding:18px; background:#7f1714; color:#fff; }
    .header-preview__brand { display:flex; align-items:center; gap:10px; min-width:0; }
    .header-preview__brand img { width:34px; height:34px; object-fit:contain; border-radius:6px; background:rgba(255,255,255,.95); padding:3px; flex:0 0 auto; }
    .header-preview__fallback { width:34px; height:34px; border-radius:6px; display:grid; place-items:center; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.18); font-size:.72rem; font-weight:800; flex:0 0 auto; }
    .header-preview__brand strong { min-width:0; color:#fff; font-size:.88rem; line-height:1.25; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .summary { display:grid; gap:0; margin:0; padding:4px 0; }
    .summary div { display:flex; justify-content:space-between; gap:12px; padding:10px 18px; border-bottom:1px solid #f5f6f8; }
    .summary div:last-child { border-bottom:0; }
    .summary dt { color:#8b95a5; text-transform:uppercase; letter-spacing:.05em; font-size:.68rem; font-weight:800; }
    .summary dd { margin:0; color:#344054; font-size:.8rem; text-align:right; overflow-wrap:anywhere; }
    .alert { padding:12px 16px; border-radius:10px; margin-bottom:16px; font-size:.82rem; }
    .alert--error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
    .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; padding:40px 16px; color:#667085; font-size:.84rem; }
    .loading-spinner { width:18px; height:18px; border:2px solid #e5e7eb; border-top-color:#7f1714; border-radius:50%; animation:spin .7s linear infinite; }
    .loading-spinner--sm { width:14px; height:14px; border-color:rgba(255,255,255,.35); border-top-color:#fff; }
    @keyframes spin { to { transform:rotate(360deg); } }
    @media (max-width: 860px) { .content-grid { grid-template-columns:1fr; } }
    @media (max-width: 720px) { .page { padding:14px 14px 22px; } .form-grid { grid-template-columns:1fr; } .form-actions { flex-direction:column; } .form-actions .btn { width:100%; } }
  `]
})
export class InstitutionBrandingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly brandingService = inject(BrandingService);
  private readonly toastService = inject(UiToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly currentBranding = signal<LoginBrandingResponse | null>(null);
  readonly selectedLogo = signal<File | null>(null);
  readonly previewLogoUrl = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    institutionName: ['', [Validators.required, Validators.maxLength(200)]],
    shortName: ['', [Validators.maxLength(80)]],
    ruc: ['', [Validators.pattern(/^[0-9]{11}$/)]],
    address: ['', [Validators.maxLength(300)]]
  });

  constructor() {
    this.loadBranding();
  }

  loadBranding(): void {
    this.loading.set(true);
    this.saving.set(false);
    this.errorMessage.set('');
    this.clearSelectedLogo();
    this.brandingService.getAdminBranding().subscribe({
      next: (branding) => {
        this.currentBranding.set(branding);
        this.form.reset({
          institutionName: branding.institutionName ?? '',
          shortName: branding.shortName ?? '',
          ruc: branding.ruc ?? '',
          address: branding.address ?? ''
        });
        this.previewLogoUrl.set(branding.headerLogoUrl);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.clearSelectedLogo();
    if (!file) {
      this.previewLogoUrl.set(this.currentBranding()?.headerLogoUrl ?? null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      input.value = '';
      this.errorMessage.set('El logo institucional no debe superar 2 MB.');
      return;
    }
    this.selectedLogo.set(file);
    this.previewLogoUrl.set(URL.createObjectURL(file));
    this.errorMessage.set('');
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Complete los campos requeridos y verifique el formato del RUC.');
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.brandingService.updateAdminBranding({
      institutionName: raw.institutionName.trim(),
      shortName: raw.shortName.trim() || null,
      ruc: raw.ruc.trim() || null,
      address: raw.address.trim() || null
    }, this.selectedLogo()).subscribe({
      next: (branding) => {
        this.currentBranding.set(branding);
        this.previewLogoUrl.set(branding.headerLogoUrl);
        this.clearSelectedLogo();
        this.saving.set(false);
        this.toastService.success('Personalizacion actualizada', 'Los datos institucionales fueron guardados correctamente.');
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.saving.set(false);
      }
    });
  }

  previewName(): string {
    return this.form.controls.institutionName.value.trim() || 'Nombre institucional';
  }

  previewInitials(): string {
    return this.previewName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'NI';
  }

  private clearSelectedLogo(): void {
    const url = this.previewLogoUrl();
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    this.selectedLogo.set(null);
  }
}
