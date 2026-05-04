import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { DistinguidoGovernanceService } from '../../../../core/distinguido/distinguido-governance.service';
import type { DistinguidoCandidatoFila, DistinguidoCandidatosResponse } from '../../../../core/distinguido/distinguido-governance.models';

@Component({
  selector: 'app-orh-distinguidos-candidatos',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .panel { padding: 1rem 1.25rem 2rem; max-width: 1200px; margin: 0 auto; }
    .muted { opacity: 0.78; font-size: 0.88rem; }
    .banner { background: #fff; border: 1px solid #dfe5ef; border-radius: 14px; padding: 1rem 1.1rem; margin-bottom: 1rem; display: grid; gap: 0.35rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e9f2; }
    th, td { text-align: left; padding: 0.55rem 0.65rem; font-size: 0.86rem; }
    thead { background: #f5f7fb; }
    tr + tr td { border-top: 1px solid #eef1f7; }
    .actions button { padding: 0.35rem 0.65rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; margin-right: 0.35rem; }
    .btn { background: #7f1714; color: #fff; }
    label { cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; }
    .breadcrumb { margin-bottom: 1rem; font-size: 0.86rem; }
    .breadcrumb a { color: #7f1714; }
  `,
  template: `
    <section class="panel">
      <nav class="breadcrumb" aria-label="Ruta">
        <a routerLink="/dashboard">Dashboard</a>
        <span> / Cupo Rendimiento distinguido · ORH</span>
      </nav>

      <header>
        <h1>Listado institucional y requisitos (ORH)</h1>
        <p class="muted">
          Calificación notificada y cumplimiento 8.2 (marcador operativo hasta incorporar texto normativo institucional). Solo buen rendimiento más notificación y 8.2 ingresan al grupo priorizado.
        </p>
      </header>

      @if (error(); as err) {
        <div class="alert alert--error" role="alert"><span>{{ err }}</span></div>
      }
      @if (success(); as msg) {
        <div class="alert alert--success" role="status"><span>{{ msg }}</span></div>
      }

      @if (summary(); as s) {
        <div class="banner">
          <strong>Universo con calificación notificada:</strong>
          {{ s.notifiedUniverseTotal }} · <strong>Tope Rendimiento distinguido:</strong>
          {{ s.maxDistinguidosSlots }} · <strong>Asignados actualmente:</strong>
          {{ s.currentDistinguidosAssigned }} · <strong>Restantes:</strong> {{ s.remainingDistinguidoSlots }}
        </div>
      }

      @if (loading()) {
        <p class="muted">Cargando resultados...</p>
      } @else {
        @if (rows(); as list) {
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th>Evaluado</th>
                  <th>Puntaje</th>
                  <th>Calificación cualitativa</th>
                  <th>Prioridad</th>
                  <th>Calificación notificada</th>
                  <th>Ordinal 8.2 (marcador)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (r of list; track r.assignmentId) {
                  <tr>
                    <td>{{ r.evaluatedDisplayName }}</td>
                    <td>{{ r.consolidatedScore | number: '1.2-4' }}</td>
                    <td>{{ r.qualitativeRatingLabel || '—' }}</td>
                    <td>
                      @if (r.rankEligible > 0) {
                        {{ r.rankEligible }}
                      } @else { — }
                    </td>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          [checked]="editableNotified()[r.assignmentId]"
                          (change)="setNotified(r.assignmentId, $event)"
                        />
                      </label>
                    </td>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          [checked]="editableDirective82()[r.assignmentId]"
                          (change)="setDirective82(r.assignmentId, $event)"
                        />
                      </label>
                    </td>
                    <td class="actions">
                      <button type="button" class="btn" (click)="saveRow(r)" [disabled]="savingAssignmentId() === r.assignmentId">
                        Actualizar flags
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </section>
  `
})
export class OrhDistinguidosCandidatosComponent {
  private readonly gov = inject(DistinguidoGovernanceService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly snapshot = signal<DistinguidoCandidatosResponse | null>(null);
  readonly editableNotified = signal<Record<number, boolean>>({});
  readonly editableDirective82 = signal<Record<number, boolean>>({});
  readonly savingAssignmentId = signal<number | null>(null);

  readonly summary = computed(() => this.snapshot());
  readonly rows = computed(() => this.snapshot()?.rows ?? null);

  constructor() {
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
        next: (data) => {
          this.snapshot.set(data);
          const n: Record<number, boolean> = {};
          const d: Record<number, boolean> = {};
          for (const row of data.rows) {
            n[row.assignmentId] = row.qualRatingNotified;
            d[row.assignmentId] = row.directive82Compliance;
          }
          this.editableNotified.set(n);
          this.editableDirective82.set(d);
        },
        error: () => this.error.set('No se pudo cargar el cuadro de candidatos institucional.')
      });
  }

  setNotified(assignmentId: number, ev: Event): void {
    const input = ev.target as HTMLInputElement | null;
    this.editableNotified.update((curr) => ({ ...curr, [assignmentId]: !!input?.checked }));
  }

  setDirective82(assignmentId: number, ev: Event): void {
    const input = ev.target as HTMLInputElement | null;
    this.editableDirective82.update((curr) => ({ ...curr, [assignmentId]: !!input?.checked }));
  }

  saveRow(row: DistinguidoCandidatoFila): void {
    const n = this.editableNotified()[row.assignmentId];
    const d = this.editableDirective82()[row.assignmentId];
    this.success.set(null);
    this.error.set(null);
    if (typeof n !== 'boolean' || typeof d !== 'boolean') {
      return;
    }
    this.savingAssignmentId.set(row.assignmentId);
    this.gov
      .patchRequisitos(row.assignmentId, {
        qualRatingNotified: n,
        directive82ComplianceConfirmed: d
      })
      .pipe(finalize(() => this.savingAssignmentId.set(null)))
      .subscribe({
        next: () => {
          this.success.set('Marcadores institucionales actualizados correctamente.');
          this.reload();
        },
        error: () => this.error.set('No tiene permiso o el resultado no existe para esta asignación.')
      });
  }
}
