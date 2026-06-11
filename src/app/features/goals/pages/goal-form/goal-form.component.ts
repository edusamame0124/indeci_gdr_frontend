import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { HrAssignmentSummary } from '../../../../core/hr/hr.models';
import { HrService } from '../../../../core/hr/hr.service';
import { Indicator } from '../../../../core/indicators/indicators.models';
import { IndicatorsService } from '../../../../core/indicators/indicators.service';
import { GoalDetail, GoalUpsertRequest } from '../../../../core/goals/goals.models';
import { GoalsService } from '../../../../core/goals/goals.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';

@Component({
  selector: 'app-goal-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="page">
      <div class="page__header">
        <div>
          <p class="page__eyebrow">Metas e indicadores</p>
          <h1>{{ mode() === 'create' ? 'Nueva meta' : 'Editar meta' }}</h1>
          <p class="page__subtitle">Formulario reutilizado para registrar y actualizar metas del ciclo activo.</p>
        </div>
        <div class="page__actions">
          <a [routerLink]="cicloNavService.moduleRoute('metas')" class="page__link page__link--ghost">Volver al listado</a>
        </div>
      </div>

      @if (loading()) {
        <div class="page__state">Cargando formulario de meta...</div>
      } @else {
        <div class="form-card">
          <div class="form-card__topbar">
            <div class="form-card__topbar-copy">
              <strong>{{ mode() === 'create' ? 'Registro de meta' : 'Edicion de meta' }}</strong>
              <span>Complete los datos principales y guarde los cambios al finalizar.</span>
            </div>

            <button type="submit" form="goal-form" class="primary-button primary-button--top" [disabled]="saving()">
              {{ mode() === 'create' ? 'Registrar meta' : 'Guardar cambios' }}
            </button>
          </div>

          @if (goalDetail()) {
            <div class="summary-strip">
              <div>
                <span>Evaluador</span>
                <strong>{{ goalDetail()!.evaluatorName }}</strong>
              </div>
              <div>
                <span>Evaluado</span>
                <strong>{{ goalDetail()!.evaluatedName }}</strong>
              </div>
              <div>
                <span>Ciclo</span>
                <strong>{{ goalDetail()!.cycleName }}</strong>
              </div>
            </div>
          }

          <form id="goal-form" [formGroup]="form" (ngSubmit)="saveGoal()" class="form-grid">
            <label class="field">
              <span>Asignacion</span>
              <select formControlName="assignmentId">
                <option [ngValue]="null">Seleccione</option>
                @for (assignment of assignments(); track assignment.assignmentId) {
                  <option [ngValue]="assignment.assignmentId">
                    {{ assignment.evaluatedName }} - {{ assignment.cycleName }}
                  </option>
                }
              </select>
            </label>

            <label class="field">
              <span>Indicador</span>
              <select formControlName="indicatorId">
                <option [ngValue]="null">Seleccione</option>
                @for (indicator of indicators(); track indicator.id) {
                  <option [ngValue]="indicator.id">
                    {{ indicator.code }} - {{ indicator.name }}
                  </option>
                }
              </select>
            </label>

            <label class="field field--full">
              <span>Titulo</span>
              <input type="text" formControlName="title" placeholder="Titulo de la meta" />
            </label>

            <label class="field field--full">
              <span>Descripcion</span>
              <textarea rows="4" formControlName="description" placeholder="Descripcion opcional"></textarea>
            </label>

            <label class="field">
              <span>Fecha inicio</span>
              <input type="date" formControlName="startDate" />
            </label>

            <label class="field">
              <span>Fecha fin</span>
              <input type="date" formControlName="endDate" />
            </label>

            <label class="field">
              <span>Valor esperado</span>
              <input type="number" formControlName="expectedValue" min="0.0001" step="0.0001" />
            </label>

            <label class="field">
              <span>Peso</span>
              <input type="number" formControlName="weight" min="0.01" max="100" step="0.01" />
            </label>

            <div class="form-actions">
              <button type="submit" class="primary-button" [disabled]="saving()">
                {{ mode() === 'create' ? 'Registrar meta' : 'Guardar cambios' }}
              </button>
            </div>
          </form>

          @if (formError()) {
            <div class="page__state page__state--error">{{ formError() }}</div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .page {
      padding: 18px 22px 26px;
      max-width: 1040px;
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
      font-size: 1.38rem;
    }

    .page__subtitle {
      margin: 6px 0 0;
      color: #667085;
      max-width: 640px;
      font-size: 0.82rem;
    }

    .page__actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .page__link {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      text-decoration: none;
      background: #7f1714;
      color: #fff;
      font-weight: 600;
      font-size: 0.82rem;
    }

    .page__link--ghost {
      background: rgba(127, 23, 20, 0.08);
      color: #7f1714;
    }

    .form-card {
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
      padding: 16px;
      display: grid;
      gap: 12px;
    }

    .form-card__topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.06);
      flex-wrap: wrap;
    }

    .form-card__topbar-copy {
      display: grid;
      gap: 4px;
    }

    .form-card__topbar-copy strong {
      color: #1f2937;
      font-size: 0.9rem;
    }

    .form-card__topbar-copy span {
      color: #667085;
      font-size: 0.76rem;
      line-height: 1.45;
    }

    .summary-strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .summary-strip div {
      border-radius: 12px;
      background: #f8fafc;
      padding: 10px 12px;
      display: grid;
      gap: 3px;
    }

    .summary-strip span {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #667085;
      font-weight: 700;
    }

    .summary-strip strong {
      color: #1f2937;
      font-size: 0.82rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 12px;
    }

    .field {
      display: grid;
      gap: 5px;
      color: #415065;
      font-size: 0.78rem;
    }

    .field--full,
    .form-actions {
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
      min-height: 40px;
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
      min-height: 88px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
    }

    .primary-button {
      min-height: 38px;
      border: none;
      border-radius: 10px;
      padding: 0 16px;
      font-weight: 600;
      font-size: 0.82rem;
      background: #7f1714;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 10px 18px rgba(127, 23, 20, 0.12);
    }

    .primary-button--top {
      min-width: 152px;
    }

    .page__state {
      border-radius: 12px;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(15, 23, 42, 0.08);
      color: #526274;
      font-size: 0.84rem;
    }

    .page__state--error {
      color: #a12622;
    }

    @media (min-width: 860px) {
      .form-actions {
        display: none;
      }
    }

    @media (max-width: 780px) {
      .summary-strip,
      .form-grid {
        grid-template-columns: 1fr;
      }

      .page {
        padding: 14px 14px 22px;
      }

      .page__actions,
      .page__actions > * {
        width: 100%;
      }

      .form-card__topbar {
        align-items: stretch;
      }

      .primary-button--top {
        width: 100%;
      }
    }

    @media (max-width: 520px) {
      .page__header h1 {
        font-size: 1.18rem;
      }

      .page__subtitle {
        font-size: 0.78rem;
      }

      .form-card {
        padding: 14px;
      }

      .summary-strip div {
        padding: 9px 10px;
      }
    }

    @media (max-width: 859px) {
      .primary-button--top {
        display: none;
      }
    }
  `]
})
export class GoalFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hrService = inject(HrService);
  private readonly indicatorsService = inject(IndicatorsService);
  private readonly goalsService = inject(GoalsService);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

  readonly mode = signal<'create' | 'edit'>('create');
  readonly assignments = signal<HrAssignmentSummary[]>([]);
  readonly indicators = signal<Indicator[]>([]);
  readonly goalDetail = signal<GoalDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formError = signal('');

  readonly form = this.fb.group({
    assignmentId: [null as number | null, [Validators.required]],
    indicatorId: [null as number | null, [Validators.required]],
    title: ['', [Validators.required]],
    description: [''],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    expectedValue: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    weight: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(100)]]
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const goalId = idParam ? Number(idParam) : null;
      const editMode = Number.isFinite(goalId) && goalId !== null;
      this.mode.set(editMode ? 'edit' : 'create');
      this.loadPage(editMode ? (goalId as number) : null);
    });
  }

  saveGoal(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Complete los campos requeridos de la meta.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: GoalUpsertRequest = {
      assignmentId: raw.assignmentId as number,
      indicatorId: raw.indicatorId as number,
      title: (raw.title ?? '').trim(),
      description: (raw.description ?? '').trim() || null,
      startDate: raw.startDate as string,
      endDate: raw.endDate as string,
      expectedValue: Number(raw.expectedValue),
      weight: Number(raw.weight)
    };

    this.saving.set(true);
    this.formError.set('');

    const cycleId = this.cicloNavService.cicloId()!;
    const request$ = this.mode() === 'edit' && this.goalDetail()
      ? this.goalsService.updateGoal(this.goalDetail()!.id, cycleId, payload)
      : this.goalsService.createGoal(cycleId, payload);

    request$.subscribe({
      next: (goal) => {
        const editing = this.mode() === 'edit';
        this.goalDetail.set(goal);
        this.saving.set(false);
        this.toastService.success(
          editing ? 'Actualización exitosa' : 'Registro exitoso',
          editing ? 'La meta fue actualizada correctamente.' : 'La meta fue registrada correctamente.'
        );

        if (!editing) {
          this.router.navigate(this.cicloNavService.moduleRoute('metas', String(goal.id)));
        } else {
          this.patchForm(goal);
        }
      },
      error: (error: Error) => {
        this.formError.set(error.message || 'No fue posible guardar la meta.');
        this.saving.set(false);
      }
    });
  }

  private loadPage(goalId: number | null): void {
    this.loading.set(true);
    this.formError.set('');

    this.hrService.listAssignments().subscribe({
      next: (assignments) => {
        this.assignments.set(assignments);
        this.indicatorsService.listIndicators().subscribe({
          next: (indicators) => {
            this.indicators.set(indicators);
            const goalRequest$: Observable<GoalDetail | null> =
              goalId !== null ? this.goalsService.getGoal(goalId, this.cicloNavService.cicloId()!) : of<GoalDetail | null>(null);
            goalRequest$.subscribe({
              next: (goal: GoalDetail | null) => {
                this.goalDetail.set(goal);
                if (goal) {
                  this.patchForm(goal);
                } else {
                  this.form.reset({
                    assignmentId: null,
                    indicatorId: null,
                    title: '',
                    description: '',
                    startDate: '',
                    endDate: '',
                    expectedValue: null,
                    weight: null
                  });
                }
                this.loading.set(false);
              },
              error: () => {
                this.formError.set('No fue posible cargar el detalle de la meta.');
                this.loading.set(false);
              }
            });
          },
          error: () => {
            this.formError.set('No fue posible cargar los indicadores disponibles.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.formError.set('No fue posible cargar las asignaciones activas.');
        this.loading.set(false);
      }
    });
  }

  private patchForm(goal: GoalDetail): void {
    this.form.reset({
      assignmentId: goal.assignmentId,
      indicatorId: goal.indicatorId,
      title: goal.title,
      description: goal.description ?? '',
      startDate: goal.startDate,
      endDate: goal.endDate,
      expectedValue: goal.expectedValue,
      weight: goal.weight
    });
  }
}
