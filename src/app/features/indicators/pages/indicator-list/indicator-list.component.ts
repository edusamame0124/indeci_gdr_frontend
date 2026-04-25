import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogItem } from '../../../../core/admin/catalogs.models';
import { CatalogsService } from '../../../../core/admin/catalogs.service';
import { Indicator, IndicatorUpsertRequest } from '../../../../core/indicators/indicators.models';
import { IndicatorsService } from '../../../../core/indicators/indicators.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-indicator-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page">
      <div class="page__header">
        <div>
          <p class="page__eyebrow">Metas e indicadores</p>
          <h1>Indicadores</h1>
          <p class="page__subtitle">
            Gestion simple de indicadores desde una sola pantalla, con una experiencia clara en movil,
            tablet y laptops pequenas.
          </p>
        </div>

        <div class="page__actions">
          <a routerLink="/dashboard" class="page__link page__link--ghost">Volver</a>
          <button type="button" class="page__link" (click)="openCreateModal()">Nuevo indicador</button>
        </div>
      </div>

      @if (formError()) {
        <div class="page__state page__state--error">{{ formError() }}</div>
      }

      <section class="table-card">
        <div class="table-card__header">
          <div>
            <h2>Listado</h2>
            <p>Revise y actualice indicadores activos sin perder legibilidad en pantallas pequenas.</p>
          </div>
        </div>

        @if (loading()) {
          <div class="page__state">Cargando indicadores...</div>
        } @else {
          <div class="desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Formula</th>
                  <th>Segmento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (indicator of indicators(); track indicator.id) {
                  <tr>
                    <td>{{ indicator.code }}</td>
                    <td>{{ indicator.name }}</td>
                    <td>{{ indicator.valueTypeName }}</td>
                    <td>{{ indicator.formulaName }}</td>
                    <td>{{ indicator.segmentName }}</td>
                    <td>
                      <button type="button" class="inline-button" (click)="editIndicator(indicator)">Editar</button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6">No hay indicadores registrados.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mobile-cards">
            @for (indicator of indicators(); track indicator.id) {
              <article class="indicator-card">
                <div class="indicator-card__row">
                  <span>Codigo</span>
                  <strong>{{ indicator.code }}</strong>
                </div>

                <div class="indicator-card__row">
                  <span>Nombre</span>
                  <strong>{{ indicator.name }}</strong>
                </div>

                <div class="indicator-card__meta">
                  <div>
                    <span>Tipo</span>
                    <strong>{{ indicator.valueTypeName }}</strong>
                  </div>
                  <div>
                    <span>Formula</span>
                    <strong>{{ indicator.formulaName }}</strong>
                  </div>
                  <div>
                    <span>Segmento</span>
                    <strong>{{ indicator.segmentName }}</strong>
                  </div>
                </div>

                <button type="button" class="inline-button inline-button--full" (click)="editIndicator(indicator)">
                  Editar
                </button>
              </article>
            } @empty {
              <div class="page__state">No hay indicadores registrados.</div>
            }
          </div>
        }
      </section>

      @if (modalOpen()) {
        <div class="modal-backdrop" (click)="closeModal()"></div>

        <section class="modal" role="dialog" aria-modal="true" aria-label="Formulario de indicador">
          <div class="modal__header">
            <div>
              <p class="modal__eyebrow">Indicadores</p>
              <h2>{{ editingIndicatorId() ? 'Editar indicador' : 'Nuevo indicador' }}</h2>
              <p class="modal__subtitle">Complete solo los datos necesarios y guarde desde esta misma vista.</p>
            </div>

            <button type="button" class="modal__close" (click)="closeModal()" aria-label="Cerrar modal">x</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="saveIndicator()" class="form-grid">
            <label class="field field--half">
              <span>Codigo</span>
              <input type="text" formControlName="code" placeholder="IND-002" />
            </label>

            <label class="field field--half">
              <span>Nombre</span>
              <input type="text" formControlName="name" placeholder="Nombre del indicador" />
            </label>

            <label class="field field--full">
              <span>Descripcion</span>
              <textarea rows="3" formControlName="description" placeholder="Descripcion opcional"></textarea>
            </label>

            <label class="field field--third">
              <span>Tipo de valor</span>
              <select formControlName="valueTypeId">
                <option [ngValue]="null">Seleccione</option>
                @for (item of valueTypes(); track item.id) {
                  <option [ngValue]="item.id">{{ item.name }}</option>
                }
              </select>
            </label>

            <label class="field field--third">
              <span>Formula</span>
              <select formControlName="formulaId">
                <option [ngValue]="null">Seleccione</option>
                @for (item of formulas(); track item.id) {
                  <option [ngValue]="item.id">{{ item.name }}</option>
                }
              </select>
            </label>

            <label class="field field--third">
              <span>Segmento</span>
              <select formControlName="segmentId">
                <option [ngValue]="null">Seleccione</option>
                @for (item of segments(); track item.id) {
                  <option [ngValue]="item.id">{{ item.name }}</option>
                }
              </select>
            </label>

            <div class="form-actions">
              <button type="button" class="ghost-button" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="primary-button" [disabled]="saving() || loading()">
                {{ editingIndicatorId() ? 'Actualizar' : 'Registrar' }}
              </button>
            </div>
          </form>
        </section>
      }
    </section>
  `,
  styles: [`
    .page {
      padding: 18px 22px 26px;
      max-width: 1180px;
      margin: 0 auto;
    }

    .page__header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .page__eyebrow {
      margin: 0 0 6px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #667085;
      text-transform: uppercase;
    }

    .page__header h1 {
      margin: 0;
      color: #1f2937;
      font-size: 1.5rem;
    }

    .page__subtitle {
      margin: 6px 0 0;
      color: #667085;
      max-width: 700px;
      font-size: 0.84rem;
      line-height: 1.55;
    }

    .page__actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .page__link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      text-decoration: none;
      border: none;
      background: #7f1714;
      color: #fff;
      font-weight: 600;
      font-size: 0.82rem;
      cursor: pointer;
    }

    .page__link--ghost {
      background: rgba(127, 23, 20, 0.08);
      color: #7f1714;
    }

    .table-card {
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
      overflow: hidden;
    }

    .table-card__header {
      padding: 16px 16px 12px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    }

    .table-card__header h2 {
      margin: 0;
      font-size: 0.94rem;
      color: #1f2937;
    }

    .table-card__header p {
      margin: 4px 0 0;
      color: #667085;
      font-size: 0.78rem;
      line-height: 1.5;
    }

    .desktop-table {
      display: block;
      width: 100%;
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 760px;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 13px 14px;
      text-align: left;
      border-bottom: 1px solid rgba(15, 23, 42, 0.06);
      vertical-align: top;
      font-size: 0.84rem;
    }

    th {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #667085;
      background: #f8fafc;
    }

    td {
      color: #344054;
      line-height: 1.5;
    }

    .inline-button {
      border: 1px solid rgba(127, 23, 20, 0.12);
      background: rgba(127, 23, 20, 0.05);
      color: #7f1714;
      border-radius: 999px;
      min-height: 32px;
      padding: 0 12px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }

    .inline-button--full {
      width: 100%;
      justify-content: center;
    }

    .mobile-cards {
      display: none;
      padding: 12px;
      gap: 10px;
    }

    .indicator-card {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 12px;
      background: #fff;
      padding: 12px;
      display: grid;
      gap: 10px;
    }

    .indicator-card__row,
    .indicator-card__meta > div {
      display: grid;
      gap: 3px;
    }

    .indicator-card__row span,
    .indicator-card__meta span {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #667085;
      font-weight: 700;
    }

    .indicator-card__row strong,
    .indicator-card__meta strong {
      color: #1f2937;
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .indicator-card__meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .page__state {
      border-radius: 12px;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(15, 23, 42, 0.08);
      color: #526274;
      font-size: 0.84rem;
      margin-bottom: 12px;
    }

    .page__state--error {
      color: #a12622;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.28);
      z-index: 90;
    }

    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(720px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      overflow: auto;
      border-radius: 16px;
      background: #fff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
      padding: 18px;
      z-index: 100;
    }

    .modal__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
    }

    .modal__eyebrow {
      margin: 0 0 6px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #667085;
      text-transform: uppercase;
    }

    .modal__header h2 {
      margin: 0;
      font-size: 1rem;
      color: #1f2937;
    }

    .modal__subtitle {
      margin: 6px 0 0;
      color: #667085;
      font-size: 0.78rem;
      line-height: 1.5;
      max-width: 460px;
    }

    .modal__close {
      border: none;
      background: transparent;
      color: #667085;
      font-size: 1rem;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      cursor: pointer;
      line-height: 1;
      display: inline-grid;
      place-items: center;
      flex: 0 0 auto;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px 12px;
    }

    .field {
      display: grid;
      gap: 5px;
      color: #415065;
      font-size: 0.8rem;
    }

    .field--half {
      grid-column: span 3;
    }

    .field--third {
      grid-column: span 2;
    }

    .field--full {
      grid-column: 1 / -1;
    }

    input,
    textarea,
    select {
      width: 100%;
      border: 1px solid #d0d7e2;
      border-radius: 10px;
      padding: 10px 12px;
      font: inherit;
      background: #fff;
      color: #223042;
      box-sizing: border-box;
    }

    input:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: rgba(127, 23, 20, 0.35);
      box-shadow: 0 0 0 3px rgba(127, 23, 20, 0.08);
    }

    textarea {
      resize: vertical;
      min-height: 92px;
    }

    .form-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }

    .primary-button,
    .ghost-button {
      min-height: 36px;
      border-radius: 10px;
      padding: 0 14px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .primary-button {
      border: none;
      background: #7f1714;
      color: #fff;
    }

    .ghost-button {
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: #fff;
      color: #475467;
    }

    @media (max-width: 960px) {
      .page {
        padding: 16px 18px 24px;
      }

      table {
        min-width: 680px;
      }
    }

    @media (max-width: 720px) {
      .desktop-table {
        display: none;
      }

      .mobile-cards {
        display: grid;
      }

      .page {
        padding: 14px 14px 22px;
      }

      .field--half,
      .field--third,
      .field--full {
        grid-column: 1 / -1;
      }

      .indicator-card__meta {
        grid-template-columns: 1fr;
      }

      .form-actions,
      .page__actions {
        width: 100%;
      }

      .form-actions {
        flex-direction: column-reverse;
      }

      .form-actions button,
      .page__actions > * {
        width: 100%;
      }
    }

    @media (max-width: 560px) {
      .modal {
        width: calc(100vw - 16px);
        max-height: calc(100vh - 16px);
        padding: 14px;
        border-radius: 14px;
      }

      .modal__header h2 {
        font-size: 0.96rem;
      }

      .page__header h1 {
        font-size: 1.34rem;
      }

      .page__subtitle {
        font-size: 0.8rem;
      }
    }
  `]
})
export class IndicatorListComponent {
  private readonly fb = inject(FormBuilder);
  private readonly indicatorsService = inject(IndicatorsService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly toastService = inject(UiToastService);

  readonly indicators = signal<Indicator[]>([]);
  readonly valueTypes = signal<CatalogItem[]>([]);
  readonly formulas = signal<CatalogItem[]>([]);
  readonly segments = signal<CatalogItem[]>([]);
  readonly editingIndicatorId = signal<number | null>(null);
  readonly modalOpen = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formError = signal('');

  readonly form = this.fb.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    valueTypeId: [null as number | null, [Validators.required]],
    formulaId: [null as number | null, [Validators.required]],
    segmentId: [null as number | null, [Validators.required]]
  });

  constructor() {
    this.loadData();
  }

  openCreateModal(): void {
    this.resetForm();
    this.modalOpen.set(true);
  }

  editIndicator(indicator: Indicator): void {
    this.editingIndicatorId.set(indicator.id);
    this.formError.set('');
    this.form.reset({
      code: indicator.code,
      name: indicator.name,
      description: indicator.description ?? '',
      valueTypeId: indicator.valueTypeId,
      formulaId: indicator.formulaId,
      segmentId: indicator.segmentId
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.resetForm();
  }

  saveIndicator(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Complete los campos requeridos del indicador.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: IndicatorUpsertRequest = {
      code: (raw.code ?? '').trim(),
      name: (raw.name ?? '').trim(),
      description: (raw.description ?? '').trim() || null,
      valueTypeId: raw.valueTypeId as number,
      formulaId: raw.formulaId as number,
      segmentId: raw.segmentId as number
    };

    this.saving.set(true);
    this.formError.set('');

    const request$ = this.editingIndicatorId()
      ? this.indicatorsService.updateIndicator(this.editingIndicatorId() as number, payload)
      : this.indicatorsService.createIndicator(payload);

    request$.subscribe({
      next: () => {
        const editing = this.editingIndicatorId() !== null;
        this.toastService.success(
          editing ? 'Actualizacion exitosa' : 'Registro exitoso',
          editing ? 'El indicador fue actualizado correctamente.' : 'El indicador fue registrado correctamente.'
        );
        this.closeModal();
        this.loadData();
      },
      error: (error: Error) => {
        this.formError.set(error.message || 'No fue posible guardar el indicador.');
        this.saving.set(false);
      }
    });
  }

  private resetForm(): void {
    this.editingIndicatorId.set(null);
    this.formError.set('');
    this.saving.set(false);
    this.form.reset({
      code: '',
      name: '',
      description: '',
      valueTypeId: null,
      formulaId: null,
      segmentId: null
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.catalogsService.loadCatalogBundle().subscribe({
      next: (catalogs) => {
        this.valueTypes.set(catalogs.valueTypes);
        this.formulas.set(catalogs.formulas);
        this.segments.set(catalogs.segments);
        this.indicatorsService.listIndicators().subscribe({
          next: (indicators) => {
            this.indicators.set(indicators);
            this.loading.set(false);
            this.saving.set(false);
          },
          error: () => {
            this.formError.set('No fue posible cargar los indicadores.');
            this.loading.set(false);
            this.saving.set(false);
          }
        });
      },
      error: () => {
        this.formError.set('No fue posible cargar los catalogos requeridos.');
        this.loading.set(false);
        this.saving.set(false);
      }
    });
  }
}
