import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { DistinguidoGovernanceService } from '../../../../core/distinguido/distinguido-governance.service';
import type { DistinguidoCandidatoFila, DistinguidoCandidatosResponse } from '../../../../core/distinguido/distinguido-governance.models';
import { downloadBlob } from '../../../../shared/utils/download-blob.util';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

/**
 * P5 — Junta: asignación de Rendimiento distinguido con bloqueo VAL-08.
 */
@Component({
  selector: 'app-junta-distinguidos-asignacion',
  standalone: true,
  imports: [RouterLink, DecimalPipe, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './junta-distinguidos-asignacion.component.html',
  styleUrl: './junta-distinguidos-asignacion.component.css'
})
export class JuntaDistinguidosAsignacionComponent {
  private readonly gov = inject(DistinguidoGovernanceService);
  private readonly auth = inject(AuthService);
  readonly cicloNavService = inject(CicloNavService);

  readonly snapshot = signal<DistinguidoCandidatosResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly selected = signal(new Set<number>());
  readonly assigning = signal(false);
  readonly confirmandoAsignacion = signal(false);
  readonly descargandoActa = signal(false);
  readonly downloadError = signal<string | null>(null);

  readonly selectableRows = computed(() => {
    const snap = this.snapshot();
    if (!snap) {
      return null;
    }
    return snap.rows.filter((r: DistinguidoCandidatoFila) => r.eligibleForDistinguidoPool && !r.alreadyDistinguido);
  });

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
        next: (data) => this.snapshot.set(data),
        error: () => this.error.set('No se puede consultar cupo distinguido.')
      });
  }

  toggle(row: DistinguidoCandidatoFila, ev: Event): void {
    if (row.bloqueadoPorVal08) {
      return;
    }
    const input = ev.target as HTMLInputElement | null;
    const on = !!input?.checked;
    const snap = this.snapshot();
    const next = new Set(this.selected());
    const remaining = snap?.remainingDistinguidoSlots ?? 0;

    if (on) {
      if (next.size >= remaining) {
        if (input) {
          input.checked = false;
        }
        this.error.set('La selección excede el cupo institucional restante.');
        return;
      }
      next.add(row.finalEvaluationId);
    } else {
      next.delete(row.finalEvaluationId);
    }
    this.error.set(null);
    this.selected.set(next);
  }

  iniciarAsignacion(): void {
    if (this.selected().size === 0) {
      return;
    }
    this.confirmandoAsignacion.set(true);
  }

  cancelarAsignacion(): void {
    this.confirmandoAsignacion.set(false);
  }

  descargarActaJunta(): void {
    this.descargandoActa.set(true);
    this.downloadError.set(null);
    this.gov
      .downloadActaJuntaPdf(this.cicloNavService.cicloId()!)
      .pipe(finalize(() => this.descargandoActa.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, 'acta_junta_distinguido.pdf'),
        error: (err) => this.downloadError.set(
          err?.error?.message
          ?? 'No se pudo generar el acta de la Junta. Asigne al menos un Rendimiento distinguido e intente nuevamente.'
        )
      });
  }

  submit(): void {
    const ids = [...this.selected()];
    const remaining = this.snapshot()?.remainingDistinguidoSlots ?? 0;
    if (ids.length === 0 || ids.length > remaining) {
      this.error.set('Selección inválida o excede el cupo institucional restante.');
      this.confirmandoAsignacion.set(false);
      return;
    }
    this.success.set(null);
    this.assigning.set(true);
    this.gov
      .asignar(this.cicloNavService.cicloId()!, { finalEvaluationIds: ids })
      .pipe(finalize(() => {
        this.assigning.set(false);
        this.confirmandoAsignacion.set(false);
      }))
      .subscribe({
        next: (r) => {
          this.success.set(
            `Asignaciones registradas (${r.assignedCount}). Restantes después de la decisión: ${r.remainingDistinguidoSlotsAfter}.`
          );
          this.selected.set(new Set());
          this.reload();
        },
        error: (err) => this.error.set(
          err?.error?.message
          ?? 'No se pudo completar la asignación. Revise confirmaciones pendientes (VAL-08) y requisitos ORH.'
        )
      });
  }
}
