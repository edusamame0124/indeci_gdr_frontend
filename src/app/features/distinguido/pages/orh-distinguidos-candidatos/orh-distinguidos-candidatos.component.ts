import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { DistinguidoGovernanceService } from '../../../../core/distinguido/distinguido-governance.service';
import type { DistinguidoCandidatoFila, DistinguidoCandidatosResponse } from '../../../../core/distinguido/distinguido-governance.models';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

/**
 * P5 — ORH: cuadro de candidatos a Rendimiento distinguido con trazabilidad VAL-08.
 */
@Component({
  selector: 'app-orh-distinguidos-candidatos',
  standalone: true,
  imports: [RouterLink, DecimalPipe, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orh-distinguidos-candidatos.component.html',
  styleUrl: './orh-distinguidos-candidatos.component.css'
})
export class OrhDistinguidosCandidatosComponent {
  private readonly gov = inject(DistinguidoGovernanceService);
  private readonly auth = inject(AuthService);
  readonly cicloNavService = inject(CicloNavService);

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
      .getCandidatos(this.cicloNavService.cicloId()!)
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
      .patchRequisitos(row.assignmentId, this.cicloNavService.cicloId()!, {
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
