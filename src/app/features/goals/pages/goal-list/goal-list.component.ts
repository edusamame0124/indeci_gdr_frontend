import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { finalize, take } from 'rxjs';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ParticipantListItemResponse } from '../../../../core/models/participants.models';
import { ParticipantsService } from '../../../../core/services/participants.service';
import { Indicator } from '../../../../core/indicators/indicators.models';
import { IndicatorsService } from '../../../../core/indicators/indicators.service';
import {
  GoalChangeRequestCreateRequest,
  GoalChangeRequestType,
  GoalDetail,
  GoalOrhSubmissionCreateRequest,
  GoalSummary,
  GoalUpsertRequest,
  MAX_GOAL_SCORE
} from '../../../../core/goals/goals.models';
import { GoalsService } from '../../../../core/goals/goals.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

function parsePercentNumber(value: unknown): number | null {
  const text = String(value ?? '').trim().replace(/%/g, '').replace(',', '.');
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
}

function sanitizePercentText(value: unknown): string {
  const original = String(value ?? '');
  const hasPercent = original.includes('%');
  let text = original.replace(/%/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = text.indexOf('.');

  if (firstDot >= 0) {
    text = `${text.slice(0, firstDot + 1)}${text.slice(firstDot + 1).replace(/\./g, '')}`;
  }

  if (!text) {
    return '';
  }

  const parsed = Number(text);
  if (Number.isFinite(parsed) && parsed > 100) {
    text = '100';
  }

  return hasPercent ? `${text}%` : text;
}

const DEFAULT_EXPECTED_VALUE_HINT =
  'Ingrese un numero de 0 a 100. Puede incluir %.';

function normalizedValueTypeLabel(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

type ExpectedValueInputKind = 'numeric' | 'percentage' | 'unknown';

function resolveExpectedValueInputKind(indicator: Indicator | null): ExpectedValueInputKind {
  const rawName = indicator?.valueTypeName?.trim();
  if (!rawName) {
    return 'unknown';
  }
  const label = normalizedValueTypeLabel(rawName);
  if (label === 'numerico') {
    return 'numeric';
  }
  if (label === 'porcentaje') {
    return 'percentage';
  }
  return 'unknown';
}

function sanitizeExpectedValueNumericCore(value: unknown): string {
  let text = String(value ?? '').replace(/%/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const firstDot = text.indexOf('.');

  if (firstDot >= 0) {
    text = `${text.slice(0, firstDot + 1)}${text.slice(firstDot + 1).replace(/\./g, '')}`;
  }

  if (!text) {
    return '';
  }

  const parsed = Number(text);
  if (Number.isFinite(parsed) && parsed > 100) {
    text = '100';
  }

  return text;
}

function sanitizeExpectedValueForKind(value: unknown, kind: ExpectedValueInputKind): string {
  if (kind === 'unknown') {
    return sanitizePercentText(value);
  }

  const core = sanitizeExpectedValueNumericCore(value);
  if (!core) {
    return '';
  }

  return kind === 'percentage' ? `${core}%` : core;
}

function percentRangeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return null;
    }

    return parsePercentNumber(raw) === null ? { percentRange: true } : null;
  };
}

@Component({
  selector: 'app-goal-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './goal-list.component.html',
  styleUrl: './goal-list.component.css'
})
export class GoalListComponent {
  @ViewChild('indicatorSearchInput') private indicatorSearchInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly cicloNavService = inject(CicloNavService);
  private readonly authService = inject(AuthService);
  private readonly participantsService = inject(ParticipantsService);
  private readonly indicatorsService = inject(IndicatorsService);
  private readonly goalsService = inject(GoalsService);
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly toastService = inject(UiToastService);

  readonly goals = signal<GoalSummary[]>([]);
  readonly evaluatedPersons = signal<ParticipantListItemResponse[]>([]);
  readonly indicators = signal<Indicator[]>([]);
  readonly selectedIndicator = signal<Indicator | null>(null);
  readonly indicatorSearch = signal('');
  readonly indicatorDropdownOpen = signal(false);
  private readonly goalActionsRepositionHandlers = new WeakMap<HTMLElement, () => void>();
  readonly selectedGoal = signal<GoalDetail | null>(null);
  readonly editingGoalId = signal<number | null>(null);
  readonly modalOpen = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly formError = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 5;
  readonly canManageGoals = computed(() => this.authService.canAccessFeature('goalsManage'));

  readonly expectedValueHintText = computed(() => {
    const indicator = this.selectedIndicator();
    switch (resolveExpectedValueInputKind(indicator)) {
      case 'numeric':
        return 'El valor ingresado se considera en Cantidad(Valor entero)';
      case 'percentage':
        return 'El valor ingresado se considera en Porcentaje';
      default:
        return DEFAULT_EXPECTED_VALUE_HINT;
    }
  });

  readonly calificarModalOpen = signal(false);
  readonly ratingTargetGoal = signal<GoalSummary | null>(null);
  readonly savingRating = signal(false);
  readonly ratingAchievedDraft = signal('');
  readonly ratingFormError = signal('');

  readonly evaluatedIdsByAssignment = signal<Record<number, number>>({});
  readonly evaluationLookupLoaded = signal(false);
  readonly evaluationLookupLoading = signal(false);
  readonly sessionReady = signal(false);

  readonly changeRequestGoal = signal<GoalSummary | null>(null);
  readonly changeRequestType = signal<GoalChangeRequestType | ''>('');
  readonly changeRequestReason = signal('');
  readonly changeRequestComment = signal('');
  readonly changeRequestSubmitting = signal(false);
  readonly changeRequestError = signal('');

  readonly orhSubmissionGoal = signal<GoalSummary | null>(null);
  readonly orhSubmissionComment = signal('');
  readonly orhSubmissionSubmitting = signal(false);
  readonly orhSubmissionError = signal('');

  readonly changeRequestTypes: ReadonlyArray<{ value: GoalChangeRequestType; label: string }> = [
    { value: 'TITULO', label: 'Titulo de la meta' },
    { value: 'DESCRIPCION', label: 'Descripcion' },
    { value: 'INDICADOR', label: 'Indicador' },
    { value: 'VALOR_ESPERADO', label: 'Valor esperado' },
    { value: 'PESO', label: 'Peso' },
    { value: 'OTRO', label: 'Otro' }
  ];

  readonly canReviewGoals = computed(() => this.authService.featureAccess()?.canReviewEvidences ?? false);

  readonly ratingPreviewScoreLabel = computed(() => {
    const g = this.ratingTargetGoal();
    const draft = this.ratingAchievedDraft().trim().replace(/%/g, '').replace(',', '.');
    if (!g || draft === '') {
      return '—';
    }
    const achieved = Number(draft);
    const expected = g.expectedValue;
    const weight = g.weight;
    if (
      !Number.isFinite(achieved) ||
      achieved < 0 ||
      !Number.isFinite(expected) ||
      expected <= 0 ||
      !Number.isFinite(weight)
    ) {
      return '—';
    }
    const proportional = (achieved * weight) / expected;
    const capped = Math.min(MAX_GOAL_SCORE, proportional);
    return capped.toFixed(2);
  });

  readonly form = this.fb.group({
    evaluatedPersonId: [null as number | null, [Validators.required]],
    indicatorId: [null as number | null, [Validators.required]],
    title: ['', [Validators.required]],
    description: [''],
    expectedValue: [null as string | null, [Validators.required, percentRangeValidator()]],
    weight: [null as string | null, [Validators.required, percentRangeValidator()]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]]
  });

  private pendingRouteMode: 'list' | 'create' | 'edit' = 'list';
  private pendingRouteGoalId: number | null = null;
  private handledRouteKey = '';

  constructor() {
    this.authService
      .me()
      .pipe(take(1))
      .subscribe({
        next: () => this.markSessionReady(),
        error: () => this.markSessionReady()
      });

    this.route.data.subscribe((data) => {
      const mode = data['mode'] as 'create' | 'edit' | undefined;
      this.pendingRouteMode = mode ?? 'list';
      this.syncRouteIntent();
    });

    this.route.paramMap.subscribe((params) => {
      const goalId = Number(params.get('id') || 0);
      this.pendingRouteGoalId = goalId > 0 ? goalId : null;
      this.syncRouteIntent();
    });

    this.loadData();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.goals().length / this.pageSize));
  }

  pagedGoals(): GoalSummary[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.goals().slice(start, start + this.pageSize);
  }

  currentPageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.goals().length);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}/${year}`;
  }

  goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.currentPage.set(clamped);
  }

  formatAchievedPercent(goal: GoalSummary): string {
    if (goal.achievedValue == null || goal.expectedValue == null || goal.expectedValue === 0) {
      return '—';
    }
    return `${((goal.achievedValue / goal.expectedValue) * 100).toFixed(2)}%`;
  }

  formatCalculatedScore(goal: GoalSummary): string {
    if (goal.calculatedScore == null || !Number.isFinite(goal.calculatedScore)) {
      return '—';
    }
    return Number(goal.calculatedScore).toFixed(2);
  }

  formatPercentPlain(value: number): string {
    return `${value}%`;
  }

  openCalificarModal(goal: GoalSummary): void {
    if (!this.canReviewGoals()) {
      return;
    }
    this.ratingFormError.set('');
    this.ratingTargetGoal.set(goal);
    const initial =
      goal.achievedValue != null && Number.isFinite(goal.achievedValue) ? String(goal.achievedValue) : '';
    this.ratingAchievedDraft.set(initial);
    this.calificarModalOpen.set(true);
  }

  closeCalificarModal(): void {
    this.calificarModalOpen.set(false);
    this.ratingTargetGoal.set(null);
    this.ratingAchievedDraft.set('');
    this.ratingFormError.set('');
    this.savingRating.set(false);
  }

  onRatingAchievedInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    let raw = el.value.replace(/,/g, '.').replace(/[^\d.]/g, '');
    const firstDot = raw.indexOf('.');
    if (firstDot >= 0) {
      raw = `${raw.slice(0, firstDot + 1)}${raw.slice(firstDot + 1).replace(/\./g, '')}`;
    }
    if (raw !== el.value) {
      el.value = raw;
    }
    this.ratingAchievedDraft.set(raw);
  }

  submitCalificarMeta(): void {
    const g = this.ratingTargetGoal();
    if (!this.canReviewGoals() || !g) {
      return;
    }
    const text = this.ratingAchievedDraft().trim().replace(/%/g, '').replace(',', '.');
    const achieved = Number(text);
    if (text === '' || !Number.isFinite(achieved) || achieved < 0) {
      this.ratingFormError.set('Ingrese un valor alcanzado valido mayor o igual a 0.');
      return;
    }
    const expected = g.expectedValue;
    if (Number.isFinite(expected) && expected > 0 && achieved > expected * 2) {
      const confirmed = window.confirm(
        `El valor alcanzado (${achieved}) supera el doble del valor meta (${expected}). ¿Confirma que desea registrarlo?`
      );
      if (!confirmed) {
        return;
      }
    }
    this.ratingFormError.set('');
    this.savingRating.set(true);
    this.goalsService.rateGoalAchievement(g.id, this.cicloNavService.cicloId()!, { achievedValue: achieved }).subscribe({
      next: (detail: GoalDetail) => {
        this.goals.update((rows) =>
          rows.map((row) =>
            row.id === detail.id
              ? {
                  ...row,
                  achievedValue: detail.achievedValue ?? null,
                  calculatedScore: detail.calculatedScore ?? null
                }
              : row
          )
        );
        this.toastService.success('Calificación registrada', 'La meta fue calificada correctamente.');
        this.closeCalificarModal();
      },
      error: (error: Error) => {
        this.ratingFormError.set(error.message || 'No fue posible registrar la calificacion.');
        this.savingRating.set(false);
      }
    });
  }

  markSessionReady(): void {
    this.sessionReady.set(true);
    this.tryLoadEvaluationLookup();
  }

  evaluatedIdFor(goal: GoalSummary): number | null {
    return this.evaluatedIdsByAssignment()[goal.assignmentId] ?? null;
  }

  hasSecondaryActions(goal: GoalSummary): boolean {
    return (
      this.canRequestGoalChange() ||
      this.canSendGoalToOrh() ||
      (this.evaluatedIdFor(goal) !== null &&
        (this.canViewFinalEvaluations() || this.canViewDocuments() || this.canViewImprovements()))
    );
  }

  canViewFinalEvaluations(): boolean {
    return this.authService.canAccessFeature('finalEvaluationsView');
  }

  canViewDocuments(): boolean {
    return this.authService.canAccessFeature('documents');
  }

  canViewImprovements(): boolean {
    return this.authService.canAccessFeature('improvements');
  }

  canRequestGoalChange(): boolean {
    const actor = this.authService.functionalActor();
    return (
      this.authService.canAccessFeature('goalsView') &&
      (actor === 'EVALUADOR' || actor === 'EVALUADO' || actor === 'EVALUADOR_Y_EVALUADO')
    );
  }

  canSendGoalToOrh(): boolean {
    const actor = this.authService.functionalActor();
    return (
      this.authService.canAccessFeature('goalsView') &&
      (actor === 'EVALUADOR' || actor === 'EVALUADOR_Y_EVALUADO')
    );
  }

  goalMorePopoverId(goalId: number): string {
    return `goal-more-pop-${goalId}`;
  }

  onGoalMorePopoverToggle(event: Event): void {
    const toggleEvent = event as ToggleEvent;
    const panel = toggleEvent.target;
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    if (toggleEvent.newState !== 'open') {
      panel.classList.remove('goal-more-popover--anchored');
      panel.style.top = '';
      panel.style.right = '';
      panel.style.left = '';
      panel.style.position = '';
      panel.style.margin = '';
      panel.style.boxSizing = '';
      panel.style.maxHeight = '';
      panel.style.maxWidth = '';
      panel.style.overflowY = '';
      this.detachGoalActionsReposition(panel);
      return;
    }

    this.scheduleAnchorGoalActionsPopover(panel, 0);
    this.attachGoalActionsReposition(panel);
  }

  private dismissGoalActionsPopover(goalId: number): void {
    const panel = document.getElementById(this.goalMorePopoverId(goalId)) as HTMLElement & {
      hidePopover?: () => void;
    };
    if (typeof panel?.hidePopover === 'function') {
      panel.hidePopover();
    }
  }

  private scheduleAnchorGoalActionsPopover(panel: HTMLElement, attempt: number): void {
    requestAnimationFrame(() => {
      const ok = this.anchorGoalActionsPopover(panel);
      if (!ok && attempt < 3) {
        this.scheduleAnchorGoalActionsPopover(panel, attempt + 1);
        return;
      }
      panel.classList.add('goal-more-popover--anchored');
    });
  }

  private attachGoalActionsReposition(panel: HTMLElement): void {
    this.detachGoalActionsReposition(panel);
    const handler = () => this.anchorGoalActionsPopover(panel);
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    this.goalActionsRepositionHandlers.set(panel, handler);
  }

  private detachGoalActionsReposition(panel: HTMLElement): void {
    const handler = this.goalActionsRepositionHandlers.get(panel);
    if (!handler) {
      return;
    }
    window.removeEventListener('scroll', handler, true);
    window.removeEventListener('resize', handler);
    this.goalActionsRepositionHandlers.delete(panel);
  }

  private anchorGoalActionsPopover(panel: HTMLElement): boolean {
    if (!panel.id) {
      return false;
    }

    const trigger = document.querySelector<HTMLElement>(
      `[popovertarget="${CSS.escape(panel.id)}"]`
    );
    if (!trigger) {
      return false;
    }

    const r = trigger.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      return false;
    }

    const gutter = 6;
    const pad = 8;
    panel.style.margin = '0';
    panel.style.boxSizing = 'border-box';
    panel.style.position = 'fixed';

    panel.style.right = `${Math.max(pad, window.innerWidth - r.right)}px`;
    panel.style.left = 'auto';

    let topPx = r.bottom + gutter;
    panel.style.top = `${topPx}px`;

    panel.style.maxHeight = `${window.innerHeight - topPx - pad}px`;

    requestAnimationFrame(() => {
      let bounds = panel.getBoundingClientRect();
      if (bounds.bottom > window.innerHeight - pad) {
        topPx = Math.max(pad, r.top - bounds.height - gutter);
        panel.style.top = `${topPx}px`;
        panel.style.maxHeight = `${Math.max(pad * 4, window.innerHeight - topPx - pad)}px`;
        bounds = panel.getBoundingClientRect();
      }

      if (bounds.top < pad) {
        panel.style.top = `${pad}px`;
        panel.style.maxHeight = `${window.innerHeight - 2 * pad}px`;
      }

      panel.style.overflowY = panel.scrollHeight > panel.clientHeight + 4 ? 'auto' : '';

      const b2 = panel.getBoundingClientRect();
      if (b2.right > window.innerWidth - pad) {
        panel.style.right = `${pad}px`;
      }
      if (b2.left < pad) {
        panel.style.left = `${pad}px`;
        panel.style.right = 'auto';
        panel.style.maxWidth = `${window.innerWidth - 2 * pad}px`;
      }
    });

    return true;
  }

  openChangeRequestModal(goal: GoalSummary): void {
    this.dismissGoalActionsPopover(goal.id);
    this.changeRequestError.set('');
    this.changeRequestGoal.set(goal);
    this.changeRequestType.set('');
    this.changeRequestReason.set('');
    this.changeRequestComment.set('');
  }

  closeChangeRequestModal(): void {
    if (this.changeRequestSubmitting()) {
      return;
    }
    this.changeRequestGoal.set(null);
    this.changeRequestType.set('');
    this.changeRequestReason.set('');
    this.changeRequestComment.set('');
    this.changeRequestError.set('');
  }

  updateChangeRequestType(event: Event): void {
    this.changeRequestType.set(this.modalEventTextValue(event) as GoalChangeRequestType | '');
    this.changeRequestError.set('');
  }

  updateChangeRequestReason(event: Event): void {
    this.changeRequestReason.set(this.modalEventTextValue(event));
    this.changeRequestError.set('');
  }

  updateChangeRequestComment(event: Event): void {
    this.changeRequestComment.set(this.modalEventTextValue(event));
    this.changeRequestError.set('');
  }

  canSubmitChangeRequest(): boolean {
    return (
      !this.changeRequestSubmitting() &&
      this.changeRequestGoal() !== null &&
      this.changeRequestType() !== '' &&
      this.changeRequestReason().trim().length > 0
    );
  }

  submitChangeRequest(event: Event): void {
    event.preventDefault();
    const goal = this.changeRequestGoal();
    const requestType = this.changeRequestType();
    const reason = this.changeRequestReason().trim();
    const comment = this.changeRequestComment().trim();

    if (!goal || !requestType) {
      this.changeRequestError.set('Seleccione el tipo de modificacion solicitado.');
      return;
    }

    if (!reason) {
      this.changeRequestError.set('Ingrese el motivo de la solicitud.');
      return;
    }

    const payload: GoalChangeRequestCreateRequest = {
      requestType,
      reason,
      comment: comment || null
    };

    this.changeRequestSubmitting.set(true);
    this.changeRequestError.set('');

    this.goalsService
      .createGoalChangeRequest(goal.id, payload)
      .pipe(finalize(() => this.changeRequestSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.changeRequestGoal.set(null);
          this.changeRequestType.set('');
          this.changeRequestReason.set('');
          this.changeRequestComment.set('');
          this.changeRequestError.set('');
          this.toastService.success(
            'Solicitud registrada',
            `Solicitud de modificacion registrada para la meta "${goal.title}".`
          );
        },
        error: (error: unknown) =>
          this.changeRequestError.set(this.resolveOperationalError(error, 'No se pudo registrar la solicitud de modificacion.'))
      });
  }

  openOrhSubmissionModal(goal: GoalSummary): void {
    this.dismissGoalActionsPopover(goal.id);
    this.orhSubmissionError.set('');
    this.orhSubmissionGoal.set(goal);
    this.orhSubmissionComment.set('');
  }

  closeOrhSubmissionModal(): void {
    if (this.orhSubmissionSubmitting()) {
      return;
    }
    this.orhSubmissionGoal.set(null);
    this.orhSubmissionComment.set('');
    this.orhSubmissionError.set('');
  }

  updateOrhSubmissionComment(event: Event): void {
    this.orhSubmissionComment.set(this.modalEventTextValue(event));
    this.orhSubmissionError.set('');
  }

  canSubmitOrhSubmission(): boolean {
    return (
      !this.orhSubmissionSubmitting() &&
      this.orhSubmissionGoal() !== null &&
      this.orhSubmissionComment().length <= 1000
    );
  }

  submitOrhSubmission(event: Event): void {
    event.preventDefault();
    const goal = this.orhSubmissionGoal();
    const comment = this.orhSubmissionComment().trim();

    if (!goal) {
      this.orhSubmissionError.set('Seleccione una meta para enviar a ORH.');
      return;
    }

    if (comment.length > 1000) {
      this.orhSubmissionError.set('El comentario del envio a ORH no puede exceder 1000 caracteres.');
      return;
    }

    const payload: GoalOrhSubmissionCreateRequest = {
      comment: comment || null
    };

    this.orhSubmissionSubmitting.set(true);
    this.orhSubmissionError.set('');

    this.goalsService
      .createGoalOrhSubmission(goal.id, payload)
      .pipe(finalize(() => this.orhSubmissionSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.orhSubmissionGoal.set(null);
          this.orhSubmissionComment.set('');
          this.orhSubmissionError.set('');
          this.toastService.success('Envio registrado', `Envio a ORH registrado para la meta "${goal.title}".`);
        },
        error: (error: unknown) =>
          this.orhSubmissionError.set(this.resolveOperationalError(error, 'No se pudo registrar el envio a ORH.'))
      });
  }

  openCreateModal(): void {
    void this.router.navigate([...this.cicloNavService.moduleRoute('metas'), 'new']);
  }

  openEditModal(goalId: number): void {
    void this.router.navigate(this.cicloNavService.moduleRoute('metas', String(goalId)));
  }

  @HostListener('document:click')
  closeIndicatorDropdown(): void {
    this.indicatorDropdownOpen.set(false);
  }

  toggleIndicatorDropdown(event: Event): void {
    event.stopPropagation();
    if (this.indicatorDropdownOpen()) {
      this.closeIndicatorDropdown();
      return;
    }

    this.indicatorSearch.set(this.selectedIndicatorLabel());
    this.indicatorDropdownOpen.set(true);
    setTimeout(() => this.indicatorSearchInput?.nativeElement.focus());
  }

  onIndicatorSearch(event: Event): void {
    this.indicatorSearch.set((event.target as HTMLInputElement).value);
  }

  filteredIndicators(): Indicator[] {
    const query = this.indicatorSearch().trim().toLowerCase();
    if (!query) {
      return this.indicators().slice(0, 20);
    }

    return this.indicators()
      .filter((indicator) => {
        const code = indicator.code.toLowerCase();
        const name = indicator.name.toLowerCase();
        return code.includes(query) || name.includes(query);
      })
      .slice(0, 20);
  }

  selectIndicator(indicator: Indicator): void {
    this.selectedIndicator.set(indicator);
    this.indicatorSearch.set(this.formatIndicator(indicator));
    this.form.controls.indicatorId.setValue(indicator.id);
    this.form.controls.indicatorId.markAsDirty();
    this.form.controls.indicatorId.updateValueAndValidity();
    this.closeIndicatorDropdown();
    this.sanitizeExpectedValueControl();
  }

  selectedIndicatorLabel(): string {
    const indicator = this.selectedIndicator();
    return indicator ? this.formatIndicator(indicator) : '';
  }

  sanitizePercentControl(controlName: 'weight'): void {
    const control = this.form.controls[controlName];
    const sanitized = sanitizePercentText(control.value);
    if (control.value !== sanitized) {
      control.setValue(sanitized, { emitEvent: false });
    }
  }

  sanitizeExpectedValueControl(): void {
    const control = this.form.controls.expectedValue;
    const kind = resolveExpectedValueInputKind(this.selectedIndicator());
    const sanitized = sanitizeExpectedValueForKind(control.value, kind);
    if (control.value !== sanitized) {
      control.setValue(sanitized, { emitEvent: false });
    }
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingGoalId.set(null);
    this.selectedGoal.set(null);
    this.selectedIndicator.set(null);
    this.indicatorSearch.set('');
    this.indicatorDropdownOpen.set(false);
    this.formError.set('');
    this.saving.set(false);
    this.handledRouteKey = '';
    this.form.reset({
      evaluatedPersonId: null,
      indicatorId: null,
      title: '',
      description: '',
      expectedValue: null,
      weight: null,
      startDate: '',
      endDate: ''
    });
    if (!this.isMetasListUrl()) {
      void this.router.navigate(this.cicloNavService.moduleRoute('metas'));
    }
  }

  saveGoal(): void {
    if (!this.canManageGoals()) {
      this.formError.set('No tiene permisos para gestionar metas en este ciclo.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Complete los campos requeridos de la meta.');
      return;
    }

    const raw = this.form.getRawValue();
    const expectedValue = parsePercentNumber(raw.expectedValue);
    const weight = parsePercentNumber(raw.weight);
    const startDate = raw.startDate ?? '';
    const endDate = raw.endDate ?? '';

    if (expectedValue === null || weight === null) {
      this.formError.set('Valor esperado y Peso deben ser numeros entre 0 y 100. Puede incluir el simbolo %.');
      return;
    }
    if (!startDate || !endDate) {
      this.formError.set('Plazo inicial y Plazo final son obligatorios.');
      return;
    }
    if (startDate > endDate) {
      this.formError.set('El plazo final no puede ser menor que el plazo inicial.');
      return;
    }

    const payload: GoalUpsertRequest = {
      evaluatedPersonId: raw.evaluatedPersonId as number,
      indicatorId: raw.indicatorId as number,
      title: (raw.title ?? '').trim(),
      description: (raw.description ?? '').trim() || null,
      expectedValue,
      weight,
      startDate,
      endDate
    };

    this.saving.set(true);
    this.formError.set('');

    const cycleId = this.cicloNavService.cicloId()!;
    const request$ = this.editingGoalId()
      ? this.goalsService.updateGoal(this.editingGoalId() as number, cycleId, payload)
      : this.goalsService.createGoal(cycleId, payload);

    request$.subscribe({
      next: () => {
        this.toastService.success(
          this.editingGoalId() ? 'Actualizacion exitosa' : 'Registro exitoso',
          this.editingGoalId() ? 'La meta fue actualizada correctamente.' : 'La meta fue registrada correctamente.'
        );
        this.closeModal();
        this.loadGoals();
      },
      error: (error: Error) => {
        this.formError.set(error.message || 'No fue posible guardar la meta.');
        this.saving.set(false);
      }
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    if (!this.canManageGoals()) {
      this.evaluatedPersons.set([]);
      this.indicators.set([]);
      this.loadGoals();
      return;
    }

    this.participantsService.listParticipants(this.cicloNavService.cicloId()!).subscribe({
      next: (participants) => {
        this.evaluatedPersons.set(
          participants.filter((person) => person.role === 'EVALUADO' || person.role === 'MIXTO')
        );
        this.indicatorsService.listIndicators().subscribe({
          next: (indicators) => {
            this.indicators.set(indicators);
            this.loadGoals();
          },
          error: () => {
            this.errorMessage.set('No fue posible cargar los indicadores disponibles.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar los participantes del ciclo.');
        this.loading.set(false);
      }
    });
  }

  private loadGoals(): void {
    this.goalsService.listGoals(this.cicloNavService.cicloId()!).subscribe({
      next: (goals) => {
        this.goals.set(goals);
        if (this.currentPage() > Math.max(1, Math.ceil(goals.length / this.pageSize))) {
          this.currentPage.set(1);
        }
        this.loading.set(false);
        this.tryLoadEvaluationLookup();
        this.syncRouteIntent();
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar las metas activas.');
        this.loading.set(false);
      }
    });
  }

  private tryLoadEvaluationLookup(): void {
    const relevantAssignmentIds = this.relevantAssignmentIdsFromGoals();

    if (
      this.evaluationLookupLoaded() ||
      this.evaluationLookupLoading() ||
      !this.sessionReady() ||
      !this.shouldLoadEvaluationLookup() ||
      relevantAssignmentIds.size === 0
    ) {
      return;
    }

    this.evaluationLookupLoading.set(true);

    this.finalEvaluationService
      .listFinalEvaluations(this.cicloNavService.cicloId()!)
      .pipe(finalize(() => this.evaluationLookupLoading.set(false)))
      .subscribe({
        next: (evaluations) => {
          const lookup = evaluations.reduce<Record<number, number>>((accumulator, evaluation) => {
            if (relevantAssignmentIds.has(evaluation.assignmentId)) {
              accumulator[evaluation.assignmentId] = evaluation.evaluatedId;
            }
            return accumulator;
          }, {});
          this.evaluatedIdsByAssignment.set(lookup);
          this.evaluationLookupLoaded.set(true);
        },
        error: () => {
          this.evaluatedIdsByAssignment.set({});
          this.evaluationLookupLoaded.set(true);
        }
      });
  }

  private shouldLoadEvaluationLookup(): boolean {
    return this.canViewFinalEvaluations() || this.canViewDocuments() || this.canViewImprovements();
  }

  private relevantAssignmentIdsFromGoals(): Set<number> {
    return new Set(
      this.goals()
        .map((goal) => goal.assignmentId)
        .filter((assignmentId) => Number.isFinite(assignmentId) && assignmentId > 0)
    );
  }

  private modalEventTextValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  private resolveOperationalError(error: unknown, fallback: string): string {
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

  private syncRouteIntent(): void {
    if (this.loading()) {
      return;
    }

    const routeKey = `${this.pendingRouteMode}:${this.pendingRouteGoalId ?? 0}`;
    if (this.handledRouteKey === routeKey) {
      return;
    }

    if (this.pendingRouteMode === 'create') {
      if (!this.canManageGoals()) {
        this.errorMessage.set('Su perfil solo tiene acceso de consulta para metas.');
        void this.router.navigate(this.cicloNavService.moduleRoute('metas'));
        return;
      }
      this.handledRouteKey = routeKey;
      this.editingGoalId.set(null);
      this.selectedGoal.set(null);
      this.selectedIndicator.set(null);
      this.indicatorSearch.set('');
      this.indicatorDropdownOpen.set(false);
      this.formError.set('');
      this.modalOpen.set(true);
      this.form.reset({
        evaluatedPersonId: null,
        indicatorId: null,
        title: '',
        description: '',
        expectedValue: null,
        weight: null,
        startDate: '',
        endDate: ''
      });
      return;
    }

    if (this.pendingRouteMode === 'edit' && this.pendingRouteGoalId) {
      if (!this.canManageGoals()) {
        this.errorMessage.set('Su perfil solo tiene acceso de consulta para metas.');
        void this.router.navigate(this.cicloNavService.moduleRoute('metas'));
        return;
      }
      this.handledRouteKey = routeKey;
      this.formError.set('');
      this.goalsService.getGoal(this.pendingRouteGoalId, this.cicloNavService.cicloId()!).subscribe({
        next: (goal) => {
          this.selectedGoal.set(goal);
          this.editingGoalId.set(goal.id);
          this.syncSelectedIndicator(goal.indicatorId);
          this.modalOpen.set(true);
          this.form.reset({
            evaluatedPersonId: goal.evaluatedPersonId,
            indicatorId: goal.indicatorId,
            title: goal.title,
            description: goal.description ?? '',
            expectedValue: String(goal.expectedValue),
            weight: String(goal.weight),
            startDate: goal.startDate,
            endDate: goal.endDate
          });
          this.sanitizeExpectedValueControl();
        },
        error: (error: Error) => {
          this.formError.set(error.message || 'No fue posible cargar el detalle de la meta.');
        }
      });
      return;
    }

    this.handledRouteKey = routeKey;
  }

  private isMetasListUrl(): boolean {
    const currentPath = this.router.url.split('?')[0]?.split('#')[0] ?? '';
    return currentPath === this.cicloNavService.moduleRoute('metas').join('/');
  }

  private syncSelectedIndicator(indicatorId: number): void {
    const indicator = this.indicators().find((item) => item.id === indicatorId) ?? null;
    this.selectedIndicator.set(indicator);
    this.indicatorSearch.set(indicator ? this.formatIndicator(indicator) : '');
    this.indicatorDropdownOpen.set(false);
  }

  private formatIndicator(indicator: Indicator): string {
    return `${indicator.code} - ${indicator.name}`;
  }
}
