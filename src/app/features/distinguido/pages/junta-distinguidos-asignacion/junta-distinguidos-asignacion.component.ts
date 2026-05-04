import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { DistinguidoGovernanceService } from '../../../../core/distinguido/distinguido-governance.service';
import type { DistinguidoCandidatoFila, DistinguidoCandidatosResponse } from '../../../../core/distinguido/distinguido-governance.models';

@Component({
  selector: 'app-junta-distinguidos-asignacion',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .panel { padding: 1rem 1.25rem 2rem; max-width: 1200px; margin: 0 auto; }
    .muted { opacity: 0.78; font-size: 0.88rem; }
    .banner { background: #fff; border: 1px solid #dfe5ef; border-radius: 14px; padding: 1rem 1.1rem; margin-bottom: 1rem; display: grid; gap: 0.35rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e9f2; margin-bottom: 1rem; }
    th, td { text-align: left; padding: 0.55rem 0.65rem; font-size: 0.86rem; }
    thead { background: #f5f7fb; }
    tr + tr td { border-top: 1px solid #eef1f7; }
    .primary { padding: 0.55rem 1.25rem; border-radius: 10px; border: none; background: #163c5c; color: #fff; font-weight: 700; cursor: pointer; }
    .primary[disabled] { opacity: 0.45; cursor: not-allowed; }
    .breadcrumb { margin-bottom: 1rem; font-size: 0.86rem; }
    .breadcrumb a { color: #7f1714; }
  `,
  template: `
    <section class="panel">
      <nav class="breadcrumb" aria-label="Ruta">
        <a routerLink="/dashboard">Dashboard</a>
        <span> / Junta de Directivos · Rendimiento distinguido</span>
      </nav>

      <header>
        <h1>Decisión institucional de Rendimiento distinguido</h1>
        <p class="muted">
          Seleccione evaluados elegibles (buen rendimiento, calificación notificada y marcador de requisitos 8.2
          cumplimiento confirmado por ORH). Respeta cupo proyectado desde el número de servidoras con evaluación
          notificada en el ciclo.
        </p>
      </header>

      @if (error(); as err) {
        <div class="alert alert--error" role="alert"><span>{{ err }}</span></div>
      }
      @if (success(); as ok) {
        <div class="alert alert--success" role="status"><span>{{ ok }}</span></div>
      }

      @if (snapshot(); as s) {
        <div class="banner">
          <strong>Notificado (universo para el cupo):</strong> {{ s.notifiedUniverseTotal }} ·
          <strong>Máximo distinguidos:</strong>
          {{ s.maxDistinguidosSlots }} · <strong>Restantes en este ciclo:</strong>
          {{ s.remainingDistinguidoSlots }}
        </div>
      }

      @if (loading()) {
        <p class="muted">Cargando resultados institucionales...</p>
      } @else {
        @if (selectableRows(); as list) {
          <table>
            <thead>
              <tr>
                <th aria-label="Selección"></th>
                <th>Evaluado</th>
                <th>Puntaje</th>
                <th>Elegibilidad</th>
                <th>Rango institucional</th>
              </tr>
            </thead>
            <tbody>
              @for (row of list; track row.finalEvaluationId) {
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      [checked]="selected().has(row.finalEvaluationId)"
                      (change)="toggle(row.finalEvaluationId, $event)"
                    />
                  </td>
                  <td>{{ row.evaluatedDisplayName }}</td>
                  <td>{{ row.consolidatedScore | number: '1.2-4' }}</td>
                  <td>{{ row.eligibleForDistinguidoPool ? 'Lista ORH recomendada' : 'Sin elegibilidad' }}</td>
                  <td>{{ row.rankEligible || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>

          <button
            type="button"
            class="primary"
            [disabled]="assigning() || selected().size === 0"
            (click)="submit()"
          >
            Asignar Rendimiento distinguido a seleccionados
          </button>
        }
      }
    </section>
  `
})
export class JuntaDistinguidosAsignacionComponent {
  private readonly gov = inject(DistinguidoGovernanceService);
  private readonly auth = inject(AuthService);

  readonly snapshot = signal<DistinguidoCandidatosResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly selected = signal(new Set<number>());
  readonly assigning = signal(false);

  readonly selectableRows = computed(() => {
    const snap = this.snapshot();
    if (!snap) {
      return null;
    }
    return snap.rows.filter((r: DistinguidoCandidatoFila) => r.eligibleForDistinguidoPool && !r.alreadyDistinguido);
  });

  constructor() {
    // Refrescar permisos y contexto después de entrada a ruta sensible
    this.auth.me().subscribe({ error: () => undefined });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.gov
      .getCandidatos()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.snapshot.set(data),
        error: () => this.error.set('No se puede consultar cupo distinguido.')
      });
  }

  toggle(id: number, ev: Event): void {
    const input = ev.target as HTMLInputElement | null;
    const on = !!input?.checked;
    const snap = this.snapshot();
    const next = new Set(this.selected());
    const remaining = snap?.remainingDistinguidoSlots ?? 0;

    if (on) {
      if (next.size >= remaining) {
        input!.checked = false;
        return;
      }
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selected.set(next);
  }

  submit(): void {
    const ids = [...this.selected()];
    const remaining = this.snapshot()?.remainingDistinguidoSlots ?? 0;
    if (ids.length === 0 || ids.length > remaining) {
      this.error.set('Seleccion inválida o excede el cupo institucional restante.');
      return;
    }
    this.success.set(null);
    this.assigning.set(true);
    this.gov
      .asignar({ finalEvaluationIds: ids })
      .pipe(finalize(() => this.assigning.set(false)))
      .subscribe({
        next: (r) => {
          this.success.set(
            `Asignaciones registradas (${r.assignedCount}). Restantes después de aplicar la decisión institucional: ${r.remainingDistinguidoSlotsAfter}.`
          );
          this.selected.set(new Set());
          this.reload();
        },
        error: () =>
          this.error.set('Fallo técnico o validación institucional. Revise selección contra lo informado por ORH.')
      });
  }
}
