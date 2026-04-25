import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HrAssignmentSummary } from '../../../../core/hr/hr.models';
import { HrService } from '../../../../core/hr/hr.service';

@Component({
  selector: 'app-assignment-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page">
      <div class="page__header">
        <div>
          <p class="page__eyebrow">RRHH / ORH base</p>
          <h1>Asignaciones</h1>
          <p class="page__subtitle">
            Relaciones activas del ciclo vigente para operar metas, con visualizacion clara en
            escritorio, tablet y movil.
          </p>
        </div>
        <a routerLink="/dashboard" class="page__link">Volver</a>
      </div>

      @if (errorMessage()) {
        <div class="page__state page__state--error">{{ errorMessage() }}</div>
      } @else if (loading()) {
        <div class="page__state">Cargando asignaciones...</div>
      } @else {
        <section class="table-card">
          <div class="table-card__header">
            <div>
              <h2>Listado</h2>
              <p>Revise las relaciones evaluador-evaluado disponibles para el ciclo activo.</p>
            </div>
          </div>

          <div class="desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Ciclo</th>
                  <th>Evaluador</th>
                  <th>Evaluado</th>
                  <th>Unidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (assignment of assignments(); track assignment.assignmentId) {
                  <tr>
                    <td>{{ assignment.cycleName }}</td>
                    <td>{{ assignment.evaluatorName }}</td>
                    <td>{{ assignment.evaluatedName }}</td>
                    <td>{{ assignment.orgUnitName }}</td>
                    <td><span class="status-pill">{{ assignment.status }}</span></td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5">No hay asignaciones activas para el ciclo actual.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mobile-cards">
            @for (assignment of assignments(); track assignment.assignmentId) {
              <article class="assignment-card">
                <div class="assignment-card__row">
                  <span>Ciclo</span>
                  <strong>{{ assignment.cycleName }}</strong>
                </div>
                <div class="assignment-card__row">
                  <span>Evaluador</span>
                  <strong>{{ assignment.evaluatorName }}</strong>
                </div>
                <div class="assignment-card__row">
                  <span>Evaluado</span>
                  <strong>{{ assignment.evaluatedName }}</strong>
                </div>
                <div class="assignment-card__row">
                  <span>Unidad</span>
                  <strong>{{ assignment.orgUnitName }}</strong>
                </div>
                <div class="assignment-card__row">
                  <span>Estado</span>
                  <strong><span class="status-pill">{{ assignment.status }}</span></strong>
                </div>
              </article>
            } @empty {
              <div class="page__state">No hay asignaciones activas para el ciclo actual.</div>
            }
          </div>
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

    .page__link {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      text-decoration: none;
      background: rgba(127, 23, 20, 0.08);
      color: #7f1714;
      font-weight: 600;
      font-size: 0.82rem;
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
      min-width: 720px;
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

    .mobile-cards {
      display: none;
      padding: 12px;
      gap: 10px;
    }

    .assignment-card {
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 12px;
      background: #fff;
      padding: 12px;
      display: grid;
      gap: 10px;
    }

    .assignment-card__row {
      display: grid;
      gap: 3px;
    }

    .assignment-card__row span {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #667085;
      font-weight: 700;
    }

    .assignment-card__row strong {
      color: #1f2937;
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.04);
      color: #475467;
      font-size: 0.74rem;
      font-weight: 600;
      width: fit-content;
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

    @media (max-width: 900px) {
      .page {
        padding: 16px 18px 24px;
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

      .page__link {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class AssignmentListComponent {
  private readonly hrService = inject(HrService);

  readonly assignments = signal<HrAssignmentSummary[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.loadAssignments();
  }

  private loadAssignments(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.hrService.listAssignments().subscribe({
      next: (assignments) => {
        this.assignments.set(assignments);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar las asignaciones activas.');
        this.loading.set(false);
      }
    });
  }
}
