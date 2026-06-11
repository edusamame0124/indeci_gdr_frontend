import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogItem } from '../../../../core/admin/catalogs.models';
import { CatalogsService } from '../../../../core/admin/catalogs.service';
import { Indicator, IndicatorUpsertRequest } from '../../../../core/indicators/indicators.models';
import { IndicatorsService } from '../../../../core/indicators/indicators.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

@Component({
  selector: 'app-indicator-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CycleContextBarComponent],
  templateUrl: './indicator-list.component.html',
  styleUrl: './indicator-list.component.css'
})
export class IndicatorListComponent {
  private readonly fb = inject(FormBuilder);
  private readonly indicatorsService = inject(IndicatorsService);
  private readonly catalogsService = inject(CatalogsService);
  private readonly toastService = inject(UiToastService);
  private readonly authService = inject(AuthService);
  readonly cicloNavService = inject(CicloNavService);

  /** Solo ORH/ADMIN puede crear y editar indicadores (RPE 068-2020-SERVIR-PE Fase 5). */
  readonly canManage = computed(() => this.authService.featureAccess()?.canManageIndicators ?? false);

  readonly indicators = signal<Indicator[]>([]);
  readonly valueTypes = signal<CatalogItem[]>([]);
  readonly formulas = signal<CatalogItem[]>([]);
  readonly segments = signal<CatalogItem[]>([]);
  readonly editingIndicatorId = signal<number | null>(null);
  readonly modalOpen = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly displayedCode = signal('');

  readonly form = this.fb.group({
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
    this.displayedCode.set(indicator.code);
    this.form.reset({
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
    this.displayedCode.set('');
    this.form.reset({
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
