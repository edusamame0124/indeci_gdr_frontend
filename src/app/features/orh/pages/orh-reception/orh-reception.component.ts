import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserSessionResponse } from '../../../../core/auth/auth.models';
import {
  OrhGoalChangeRequestItemResponse,
  OrhGoalSubmissionItemResponse,
  ReviewOrhReceptionRequest
} from '../../../../core/orh/orh-reception.models';
import { OrhReceptionService } from '../../../../core/orh/orh-reception.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

type ReceptionTab = 'changeRequests' | 'submissions';
type ReviewTarget =
  | { type: 'changeRequest'; item: OrhGoalChangeRequestItemResponse }
  | { type: 'submission'; item: OrhGoalSubmissionItemResponse };

@Component({
  selector: 'app-orh-reception',
  standalone: true,
  imports: [DatePipe, RouterLink, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orh-reception.component.html',
  styleUrl: './orh-reception.component.css'
})
export class OrhReceptionComponent {
  private readonly authService = inject(AuthService);
  private readonly orhReceptionService = inject(OrhReceptionService);
  readonly cicloNavService = inject(CicloNavService);

  protected readonly profile = signal<UserSessionResponse | null>(null);
  protected readonly changeRequests = signal<OrhGoalChangeRequestItemResponse[]>([]);
  protected readonly submissions = signal<OrhGoalSubmissionItemResponse[]>([]);
  protected readonly activeTab = signal<ReceptionTab>('changeRequests');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly reviewTarget = signal<ReviewTarget | null>(null);
  protected readonly reviewComment = signal('');
  protected readonly reviewSubmitting = signal(false);
  protected readonly reviewError = signal<string | null>(null);

  constructor() {
    this.loadProfile();
    this.loadReception();
  }

  protected setActiveTab(tab: ReceptionTab): void {
    this.activeTab.set(tab);
  }

  protected canReviewChangeRequest(item: OrhGoalChangeRequestItemResponse): boolean {
    return item.status === 'PENDIENTE';
  }

  protected canReviewSubmission(item: OrhGoalSubmissionItemResponse): boolean {
    return item.status === 'ENVIADO';
  }

  protected changeRequestStatusClass(status: string | null | undefined): string {
    return status === 'REVISADO'
      ? 'status-badge status-badge--reviewed'
      : 'status-badge status-badge--pending';
  }

  protected submissionStatusClass(status: string | null | undefined): string {
    return status === 'REVISADO'
      ? 'status-badge status-badge--reviewed'
      : 'status-badge status-badge--sent';
  }

  protected openReviewModal(type: ReviewTarget['type'], item: ReviewTarget['item']): void {
    this.successMessage.set(null);
    this.reviewError.set(null);
    this.reviewComment.set('');
    this.reviewTarget.set(type === 'changeRequest'
      ? { type, item: item as OrhGoalChangeRequestItemResponse }
      : { type, item: item as OrhGoalSubmissionItemResponse }
    );
  }

  protected closeReviewModal(): void {
    if (this.reviewSubmitting()) {
      return;
    }
    this.reviewTarget.set(null);
    this.reviewComment.set('');
    this.reviewError.set(null);
  }

  protected updateReviewComment(event: Event): void {
    this.reviewComment.set(this.eventValue(event));
    this.reviewError.set(null);
  }

  protected canSubmitReview(): boolean {
    return !this.reviewSubmitting()
      && this.reviewTarget() !== null
      && this.reviewComment().length <= 1000;
  }

  protected submitReview(event: Event): void {
    event.preventDefault();

    const target = this.reviewTarget();
    const comment = this.reviewComment().trim();

    if (!target) {
      this.reviewError.set('Seleccione un registro para marcar como revisado.');
      return;
    }

    if (comment.length > 1000) {
      this.reviewError.set('El comentario de revision ORH no puede exceder 1000 caracteres.');
      return;
    }

    const payload: ReviewOrhReceptionRequest = {
      comment: comment || null
    };

    this.reviewSubmitting.set(true);
    this.reviewError.set(null);
    this.successMessage.set(null);

    if (target.type === 'changeRequest') {
      this.orhReceptionService
        .reviewChangeRequest(target.item.id, this.cicloNavService.cicloId()!, payload)
        .pipe(finalize(() => this.reviewSubmitting.set(false)))
        .subscribe({
          next: (updated) => {
            this.changeRequests.set(this.changeRequests().map((item) =>
              item.id === updated.id ? updated : item
            ));
            this.closeReviewAfterSuccess();
          },
          error: (error) => this.reviewError.set(
            this.resolveErrorMessage(error, 'No se pudo marcar el registro como revisado.')
          )
        });
      return;
    }

    this.orhReceptionService
      .reviewSubmission(target.item.id, this.cicloNavService.cicloId()!, payload)
      .pipe(finalize(() => this.reviewSubmitting.set(false)))
      .subscribe({
        next: (updated) => {
          this.submissions.set(this.submissions().map((item) =>
            item.id === updated.id ? updated : item
          ));
          this.closeReviewAfterSuccess();
        },
        error: (error) => this.reviewError.set(
          this.resolveErrorMessage(error, 'No se pudo marcar el registro como revisado.')
        )
      });
  }

  protected reviewTypeLabel(target: ReviewTarget): string {
    return target.type === 'changeRequest' ? 'Solicitud de modificacion' : 'Envio a ORH';
  }

  protected reviewGoalTitle(target: ReviewTarget): string {
    return target.item.goalTitle || 'Sin meta';
  }

  protected reviewEvaluatedName(target: ReviewTarget): string {
    return target.item.evaluatedName || 'Sin evaluado';
  }

  protected reviewDate(target: ReviewTarget): string {
    return target.type === 'changeRequest'
      ? target.item.createdAt
      : target.item.submittedAt;
  }

  protected reviewStatusLabel(target: ReviewTarget): string {
    return target.item.statusName || target.item.status;
  }

  private closeReviewAfterSuccess(): void {
    this.reviewTarget.set(null);
    this.reviewComment.set('');
    this.reviewError.set(null);
    this.successMessage.set('Registro marcado como revisado.');
  }

  private loadProfile(): void {
    this.authService.me().subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error) => this.errorMessage.set(this.resolveErrorMessage(error, 'No se pudo cargar el contexto del usuario.'))
    });
  }

  private loadReception(): void {
    forkJoin({
      changeRequests: this.orhReceptionService.listChangeRequests(this.cicloNavService.cicloId()!),
      submissions: this.orhReceptionService.listSubmissions(this.cicloNavService.cicloId()!)
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ changeRequests, submissions }) => {
          this.changeRequests.set(changeRequests);
          this.submissions.set(submissions);
        },
        error: (error) => this.errorMessage.set(
          this.resolveErrorMessage(error, 'No se pudo cargar la recepcion ORH.')
        )
      });
  }

  private eventValue(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error?: { message?: unknown } }).error?.message === 'string'
    ) {
      return (error as { error: { message: string } }).error.message;
    }

    return fallback;
  }
}
