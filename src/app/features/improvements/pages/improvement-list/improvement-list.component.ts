import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { FinalEvaluationSummary } from '../../../../core/final-evaluation/final-evaluation.models';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import { OportunidadMejoraResumen, RegistrarOportunidadMejoraPayload } from '../../../../core/improvements/improvements.models';
import { ImprovementsService } from '../../../../core/improvements/improvements.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

@Component({
  selector: 'app-improvement-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './improvement-list.component.html',
  styleUrl: './improvement-list.component.css'
})
export class ImprovementListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly improvementsService = inject(ImprovementsService);
  readonly cicloNavService = inject(CicloNavService);
  private readonly toastService = inject(UiToastService);

  readonly evaluatedId = signal<number | null>(null);
  readonly availableEvaluations = signal<FinalEvaluationSummary[]>([]);
  readonly improvements = signal<OportunidadMejoraResumen[]>([]);
  readonly loading = signal(false);
  readonly loadingEvaluations = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly modalOpen = signal(false);
  readonly modalError = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 5;
  readonly canManageImprovements = computed(
    () => this.authService.featureAccess()?.canManageImprovements ?? false
  );

  readonly selectionForm = this.fb.group({
    evaluatedId: [null as number | null, [Validators.required]]
  });

  readonly form = this.fb.group({
    descripcion: ['', [Validators.required]],
    responsable: ['', [Validators.required]],
    plazoCompromiso: ['', [Validators.required]]
  });

  constructor() {
    const evaluatedId = Number(this.route.snapshot.queryParamMap.get('evaluatedId') || 0);
    this.evaluatedId.set(evaluatedId > 0 ? evaluatedId : null);
    this.selectionForm.patchValue({ evaluatedId: this.evaluatedId() });
    this.loadAvailableEvaluations();
    if (this.evaluatedId()) {
      this.loadImprovements();
    }
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.improvements().length / this.pageSize));
  }

  pagedImprovements(): OportunidadMejoraResumen[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.improvements().slice(start, start + this.pageSize);
  }

  currentPageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.improvements().length);
  }

  goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
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

  applyEvaluatedSelection(): void {
    const selectedEvaluatedId = this.selectionForm.getRawValue().evaluatedId;
    if (!selectedEvaluatedId) {
      this.errorMessage.set('Seleccione un evaluado para continuar.');
      return;
    }

    this.errorMessage.set('');
    this.evaluatedId.set(selectedEvaluatedId);
    this.improvements.set([]);
    this.currentPage.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { evaluatedId: selectedEvaluatedId },
      queryParamsHandling: 'merge'
    });
    this.loadImprovements();
  }

  openCreateModal(): void {
    if (!this.canManageImprovements()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar oportunidades de mejora.');
      return;
    }
    this.modalError.set('');
    this.form.reset({ descripcion: '', responsable: '', plazoCompromiso: '' });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.saving.set(false);
    this.modalError.set('');
  }

  submitImprovement(): void {
    if (!this.canManageImprovements()) {
      this.modalError.set('Su perfil no tiene permiso para registrar oportunidades de mejora.');
      return;
    }
    if (!this.evaluatedId()) {
      this.modalError.set('Seleccione un evaluado desde evaluacion final antes de registrar la oportunidad.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.modalError.set('Complete la informacion minima de la oportunidad de mejora.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: RegistrarOportunidadMejoraPayload = {
      evaluatedId: this.evaluatedId()!,
      descripcion: (raw.descripcion ?? '').trim(),
      responsable: (raw.responsable ?? '').trim(),
      plazoCompromiso: raw.plazoCompromiso ?? ''
    };

    this.saving.set(true);
    this.modalError.set('');
    this.improvementsService.createImprovement(this.cicloNavService.cicloId()!, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadImprovements();
        this.toastService.success('Oportunidad registrada', 'La oportunidad de mejora fue registrada correctamente.');
      },
      error: (error: Error) => {
        this.modalError.set(error.message);
        this.saving.set(false);
      }
    });
  }

  private loadImprovements(): void {
    if (!this.evaluatedId()) {
      return;
    }
    this.loading.set(true);
    this.improvementsService.listImprovements(this.evaluatedId()!, this.cicloNavService.cicloId()!).subscribe({
      next: (improvements) => {
        this.improvements.set(improvements);
        if (this.currentPage() > Math.max(1, Math.ceil(improvements.length / this.pageSize))) {
          this.currentPage.set(1);
        }
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  private loadAvailableEvaluations(): void {
    this.loadingEvaluations.set(true);
    this.finalEvaluationService.listFinalEvaluations(this.cicloNavService.cicloId()!).subscribe({
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
}
