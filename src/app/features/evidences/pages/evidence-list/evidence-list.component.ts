import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { GoalsService } from '../../../../core/goals/goals.service';
import { GoalDetail } from '../../../../core/goals/goals.models';
import {
  EvidenceDetail,
  EvidenceReviewRequest,
  EvidenceSummary,
  EvidenceUpsertRequest
} from '../../../../core/evidences/evidences.models';
import { qualificationOptionsForEvidenceType } from '../../../../core/evidences/evidence-qualification.constants';
import { EvidencesService } from '../../../../core/evidences/evidences.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';

@Component({
  selector: 'app-evidence-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evidence-list.component.html',
  styleUrl: './evidence-list.component.css'
})
export class EvidenceListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly goalsService = inject(GoalsService);
  private readonly evidencesService = inject(EvidencesService);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

  readonly goal = signal<GoalDetail | null>(null);
  readonly evidences = signal<EvidenceSummary[]>([]);
  readonly editingEvidenceId = signal<number | null>(null);
  readonly modalOpen = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 5;
  readonly selectedEvidenceFile = signal<File | null>(null);
  private readonly maxEvidenceFileSizeBytes = 10 * 1024 * 1024;
  private readonly acceptedFileTypesByFormat: Record<string, string> = {
    IMAGEN: '.jpg,.jpeg,.png,image/jpeg,image/png',
    DOCUMENTO: '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ACTA: '.pdf,application/pdf',
    EXCEL: '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    OTRO: '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx'
  };
  readonly evidenceTypeOptions = [
    { code: 'AVANCE', name: 'Evidencia de avance' },
    { code: 'FINAL', name: 'Evidencia final' }
  ];
  readonly expectedFormatOptions = [
    { code: 'IMAGEN', name: 'Imagen (JPG, PNG)' },
    { code: 'DOCUMENTO', name: 'Documento (PDF, Word)' },
    { code: 'ACTA', name: 'Acta (PDF)' },
    { code: 'EXCEL', name: 'Archivo Excel' },
    { code: 'OTRO', name: 'Otro formato' }
  ];

  readonly canManageEvidence = computed(() =>
    this.authService.featureAccess()?.canManageEvidences ?? false
  );

  readonly canReviewEvidence = computed(() =>
    this.authService.featureAccess()?.canReviewEvidences ?? false
  );

  readonly form = this.fb.group({
    title: ['', [Validators.required]],
    detail: [''],
    evidenceTypeCode: ['', [Validators.required]],
    expectedFormatCode: ['', [Validators.required]],
    expectedDate: [''],
    mandatory: [false]
  });

  readonly calificarModalOpen = signal(false);
  readonly reviewTarget = signal<EvidenceSummary | null>(null);
  readonly savingReview = signal(false);

  readonly calificarForm = this.fb.group({
    qualificationCode: ['', [Validators.required]],
    comment: [''],
    correctiveActionDetail: ['']
  });

  private goalId = 0;

  constructor() {
    this.goalId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.loadData();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.evidences().length / this.pageSize));
  }

  pagedEvidences(): EvidenceSummary[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.evidences().slice(start, start + this.pageSize);
  }

  currentPageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.evidences().length);
  }

  displayEvidenceType(evidence: EvidenceSummary): string {
    const current = evidence as EvidenceSummary & {
      evidenceTypeCode?: string | null;
      evidenceTypeName?: string | null;
    };
    if (current.evidenceTypeName) {
      return current.evidenceTypeName;
    }
    return this.evidenceTypeOptions.find((option) => option.code === current.evidenceTypeCode)?.name ?? 'Sin tipo';
  }

  displayExpectedFormat(evidence: EvidenceSummary): string {
    const current = evidence as EvidenceSummary & {
      expectedFormatCode?: string | null;
      expectedFormatName?: string | null;
    };
    if (current.expectedFormatName) {
      return current.expectedFormatName;
    }
    return this.expectedFormatOptions.find((option) => option.code === current.expectedFormatCode)?.name ?? 'Sin formato';
  }

  formatFileSize(size: number | null | undefined): string {
    if (!size || size <= 0) {
      return '';
    }
    if (size < 1024 * 1024) {
      return `${Math.ceil(size / 1024)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  acceptedFileTypes(): string {
    const code = this.form.controls.expectedFormatCode.value || 'OTRO';
    return this.acceptedFileTypesByFormat[code] ?? this.acceptedFileTypesByFormat['OTRO'];
  }

  onEvidenceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.selectedEvidenceFile.set(null);
      return;
    }
    if (file.size > this.maxEvidenceFileSizeBytes) {
      this.selectedEvidenceFile.set(null);
      input.value = '';
      this.errorMessage.set('El archivo de evidencia no debe superar 10 MB.');
      return;
    }
    this.selectedEvidenceFile.set(file);
    this.errorMessage.set('');
  }

  downloadEvidenceFile(evidence: EvidenceSummary): void {
    this.evidencesService.downloadEvidenceFile(evidence.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = evidence.fileOriginalName || 'evidencia';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
  }

  openCreateModal(): void {
    if (!this.canManageEvidence()) {
      return;
    }
    this.editingEvidenceId.set(null);
    this.selectedEvidenceFile.set(null);
    this.form.reset({ title: '', detail: '', evidenceTypeCode: '', expectedFormatCode: '', expectedDate: '', mandatory: false });
    this.modalOpen.set(true);
  }

  openEditModal(evidenceId: number): void {
    if (!this.canManageEvidence()) {
      return;
    }
    this.evidencesService.getEvidence(evidenceId).subscribe({
      next: (evidence) => {
        this.editingEvidenceId.set(evidence.id);
        this.selectedEvidenceFile.set(null);
        this.form.reset({
          title: evidence.title,
          detail: evidence.detail ?? '',
          evidenceTypeCode: evidence.evidenceTypeCode,
          expectedFormatCode: evidence.expectedFormatCode,
          expectedDate: evidence.expectedDate ?? '',
          mandatory: evidence.mandatory ?? false
        });
        this.modalOpen.set(true);
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  openDetail(evidenceId: number): void {
    void this.router.navigate(this.cicloNavService.moduleRoute('evidencias', String(evidenceId)));
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingEvidenceId.set(null);
    this.selectedEvidenceFile.set(null);
    this.saving.set(false);
  }

  qualificationOptionsFor(evidenceTypeCode: string): { code: string; label: string }[] {
    return qualificationOptionsForEvidenceType(evidenceTypeCode);
  }

  qualificationFieldLabel(): string {
    return this.reviewTarget()?.evidenceTypeCode === 'FINAL' ? 'Estado final' : 'Estado avance';
  }

  openCalificarModal(evidence: EvidenceSummary): void {
    if (!this.canReviewEvidence()) {
      return;
    }
    const options = this.qualificationOptionsFor(evidence.evidenceTypeCode);
    const defaultCode = options[0]?.code ?? '';
    this.reviewTarget.set(evidence);
    this.calificarForm.reset({
      qualificationCode: defaultCode,
      comment: '',
      correctiveActionDetail: ''
    });
    this.errorMessage.set('');
    this.calificarModalOpen.set(true);
  }

  closeCalificarModal(): void {
    this.calificarModalOpen.set(false);
    this.reviewTarget.set(null);
    this.savingReview.set(false);
  }

  submitCalificar(): void {
    if (!this.canReviewEvidence() || !this.reviewTarget()) {
      return;
    }
    if (this.calificarForm.invalid) {
      this.calificarForm.markAllAsTouched();
      this.errorMessage.set('Seleccione la calificación de la evidencia.');
      return;
    }
    const raw = this.calificarForm.getRawValue();
    const code = (raw.qualificationCode ?? '').trim();
    if (this.mapsToObserved(code)) {
      if (!(raw.comment ?? '').trim()) {
        this.errorMessage.set('La revisión observada requiere un comentario.');
        return;
      }
      if (!(raw.correctiveActionDetail ?? '').trim()) {
        this.errorMessage.set('La revisión observada requiere una acción correctiva.');
        return;
      }
    }
    const payload: EvidenceReviewRequest = {
      qualificationCode: code,
      comment: (raw.comment ?? '').trim() || null,
      correctiveActionDetail: (raw.correctiveActionDetail ?? '').trim() || null
    };
    this.savingReview.set(true);
    this.errorMessage.set('');
    this.evidencesService.reviewEvidence(this.reviewTarget()!.id, payload).subscribe({
      next: (updated: EvidenceDetail) => {
        this.toastService.success('Calificación registrada', 'La revisión de la evidencia fue registrada correctamente.');
        this.patchEvidenceSummaryFromDetail(updated);
        this.closeCalificarModal();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.savingReview.set(false);
      }
    });
  }

  private mapsToObserved(qualificationCode: string): boolean {
    return qualificationCode !== 'LOGRADO' && qualificationCode !== 'PRESENTA_EVIDENCIA_FINAL';
  }

  saveEvidence(): void {
    if (!this.canManageEvidence()) {
      this.errorMessage.set('No cuenta con permisos para registrar o actualizar evidencias esperadas.');
      return;
    }
    if (this.form.invalid || !this.goalId) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Complete los campos requeridos de la evidencia esperada.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: EvidenceUpsertRequest = {
      title: (raw.title ?? '').trim(),
      detail: (raw.detail ?? '').trim() || null,
      evidenceTypeCode: raw.evidenceTypeCode as string,
      expectedFormatCode: raw.expectedFormatCode as string,
      expectedDate: raw.expectedDate || null,
      mandatory: raw.mandatory ?? false
    };

    this.saving.set(true);
    this.errorMessage.set('');
    const request$ = this.editingEvidenceId()
      ? this.evidencesService.updateEvidence(this.editingEvidenceId() as number, payload, this.selectedEvidenceFile())
      : this.evidencesService.createEvidence(this.goalId, payload, this.selectedEvidenceFile());

    request$.subscribe({
      next: () => {
        const editing = this.editingEvidenceId() !== null;
        this.toastService.success(
          editing ? 'Actualizacion exitosa' : 'Registro exitoso',
          editing ? 'La evidencia esperada fue actualizada correctamente.' : 'La evidencia esperada fue registrada correctamente.'
        );
        this.closeModal();
        this.loadEvidences();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.saving.set(false);
      }
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.goalsService.getGoal(this.goalId, this.cicloNavService.cicloId()!).subscribe({
      next: (goal: GoalDetail) => {
        this.goal.set(goal);
        this.loadEvidences();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  private patchEvidenceSummaryFromDetail(updated: EvidenceDetail): void {
    const latest = updated.reviews[0];
    this.evidences.update((list) =>
      list.map((row) =>
        row.id === updated.id
          ? {
              ...row,
              statusCode: updated.statusCode,
              statusName: updated.statusName,
              latestReviewComment: latest?.comment ?? null,
              latestReviewQualificationCode: latest?.qualificationCode ?? null,
              latestReviewQualificationName: latest?.qualificationName ?? null,
              fileOriginalName: updated.fileOriginalName,
              fileSizeBytes: updated.fileSizeBytes,
              fileAvailable: updated.fileAvailable
            }
          : row
      )
    );
  }

  private loadEvidences(): void {
    this.evidencesService.listGoalEvidences(this.goalId).subscribe({
      next: (evidences: EvidenceSummary[]) => {
        this.evidences.set(evidences);
        if (this.currentPage() > Math.max(1, Math.ceil(evidences.length / this.pageSize))) {
          this.currentPage.set(1);
        }
        this.loading.set(false);
        this.saving.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
        this.saving.set(false);
      }
    });
  }
}
