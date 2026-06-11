import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { resolveQualificationHistoryLabel } from '../../../../core/evidences/evidence-qualification.constants';
import {
  EvidenceDetail,
  EvidenceReview,
  EvidenceUpsertRequest
} from '../../../../core/evidences/evidences.models';
import { EvidencesService } from '../../../../core/evidences/evidences.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';

@Component({
  selector: 'app-evidence-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evidence-detail.component.html',
  styleUrl: './evidence-detail.component.css'
})
export class EvidenceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly evidencesService = inject(EvidencesService);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

  readonly evidence = signal<EvidenceDetail | null>(null);
  readonly loading = signal(true);
  readonly savingUpdate = signal(false);
  readonly subsanationModalOpen = signal(false);
  readonly trackingModalOpen = signal(false);
  readonly trackingPage = signal(1);
  readonly errorMessage = signal('');
  readonly canUpdateEvidence = computed(() =>
    this.authService.featureAccess()?.canManageEvidences ?? false
  );

  readonly updateForm = this.fb.group({
    title: ['', [Validators.required]],
    detail: [''],
    expectedDate: ['']
  });

  private evidenceId = 0;

  constructor() {
    this.evidenceId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.loadEvidence();
  }

  openSubsanationModal(): void {
    if (!this.canUpdateEvidence() || this.evidence()?.statusCode !== 'OBSERVED') {
      return;
    }

    this.subsanationModalOpen.set(true);
  }

  closeSubsanationModal(): void {
    this.subsanationModalOpen.set(false);
  }

  openTrackingModal(): void {
    this.trackingPage.set(1);
    this.trackingModalOpen.set(true);
  }

  closeTrackingModal(): void {
    this.trackingModalOpen.set(false);
  }

  pagedReviews() {
    const reviews = this.evidence()?.reviews ?? [];
    const pageSize = 4;
    const start = (this.trackingPage() - 1) * pageSize;
    return reviews.slice(start, start + pageSize);
  }

  trackingTotalPages(): number {
    const total = this.evidence()?.reviews.length ?? 0;
    return Math.max(1, Math.ceil(total / 4));
  }

  previousTrackingPage(): void {
    this.trackingPage.update((page) => Math.max(1, page - 1));
  }

  nextTrackingPage(): void {
    this.trackingPage.update((page) => Math.min(this.trackingTotalPages(), page + 1));
  }

  backToGoalLink(): string[] {
    const goalId = this.evidence()?.goalId;
    return goalId
      ? this.cicloNavService.moduleRoute('metas', String(goalId), 'evidencias')
      : this.cicloNavService.moduleRoute('metas');
  }

  reviewQualificationDisplay(review: EvidenceReview): string | null {
    return resolveQualificationHistoryLabel({
      qualificationName: review.qualificationName,
      qualificationCode: review.qualificationCode
    });
  }

  submitSubsanation(): void {
    if (!this.canUpdateEvidence()) {
      this.errorMessage.set('No cuenta con permisos para actualizar evidencias.');
      return;
    }
    if (this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      this.errorMessage.set('Complete la informacion minima para la subsanacion.');
      return;
    }

    const raw = this.updateForm.getRawValue();
    const currentEvidence = this.evidence();
    const payload: EvidenceUpsertRequest = {
      title: (raw.title ?? '').trim(),
      detail: (raw.detail ?? '').trim() || null,
      evidenceTypeCode: currentEvidence?.evidenceTypeCode ?? 'AVANCE',
      expectedFormatCode: currentEvidence?.expectedFormatCode ?? 'OTRO',
      expectedDate: raw.expectedDate || null,
      mandatory: currentEvidence?.mandatory ?? null
    };

    this.savingUpdate.set(true);
    this.errorMessage.set('');
    this.evidencesService.updateEvidence(this.evidenceId, payload).subscribe({
      next: (evidence) => {
        this.evidence.set(evidence);
        this.patchUpdateForm(evidence);
        this.savingUpdate.set(false);
        this.closeSubsanationModal();
        this.toastService.success('Subsanacion exitosa', 'La evidencia fue actualizada correctamente.');
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.savingUpdate.set(false);
      }
    });
  }

  private loadEvidence(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.evidencesService.getEvidence(this.evidenceId).subscribe({
      next: (evidence) => {
        this.evidence.set(evidence);
        this.patchUpdateForm(evidence);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  private patchUpdateForm(evidence: EvidenceDetail): void {
    this.updateForm.reset({
      title: evidence.title,
      detail: evidence.detail ?? '',
      expectedDate: evidence.expectedDate ?? ''
    });
  }
}
