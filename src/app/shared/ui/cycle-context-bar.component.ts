import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CicloNavService } from '../../core/gdr/ciclo-nav.service';
import { functionalActorLabel } from '../utils/functional-actor-label.util';

@Component({
  selector: 'app-cycle-context-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="context-bar" role="status" aria-label="Contexto de operación del ciclo">
      <div class="context-bar__item">
        <span class="context-bar__label">Ciclo</span>
        <span class="context-bar__value">{{ cycleName() }}</span>
      </div>
      @if (estadoEtapaLabel()) {
        <div class="context-bar__item">
          <span class="context-bar__label">Estado</span>
          <span class="context-bar__badge" [attr.data-estado]="estadoEtapa()">{{ estadoEtapaLabel() }}</span>
        </div>
      }
      @if (functionalActor()) {
        <div class="context-bar__item">
          <span class="context-bar__label">Actor</span>
          <span class="context-bar__value">{{ functionalActor() }}</span>
        </div>
      }
      @if (orgUnitName()) {
        <div class="context-bar__item">
          <span class="context-bar__label">Unidad</span>
          <span class="context-bar__value">{{ orgUnitName() }}</span>
        </div>
      }
      @if (!isActiveCycle()) {
        <div class="context-bar__item">
          <span class="context-bar__label">Modo</span>
          <span class="context-bar__badge context-bar__badge--historical">HISTÓRICO</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .context-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      overflow: hidden;
    }

    .context-bar__item {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 9px 16px;
      border-right: 1px solid #e5e7eb;
      min-width: 0;
    }

    .context-bar__item:last-child {
      border-right: none;
    }

    .context-bar__label {
      font-size: 0.63rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      color: #9ca3af;
      white-space: nowrap;
    }

    .context-bar__value {
      font-size: 0.78rem;
      font-weight: 600;
      color: #1a1a2e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 28ch;
    }

    .context-bar__badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 99px;
      background: #e5e7eb;
      color: #374151;
    }

    .context-bar__badge[data-estado="BORRADOR"] { background: #f1f5f9; color: #64748b; }
    .context-bar__badge[data-estado="EN_PLANIFICACION"] { background: #eff6ff; color: #1d4ed8; }
    .context-bar__badge[data-estado="EN_SEGUIMIENTO"] { background: #f0fdf4; color: #15803d; }
    .context-bar__badge[data-estado="EN_EVALUACION"] { background: #fffbeb; color: #b45309; }
    .context-bar__badge[data-estado="EN_CONFIRMACION"] { background: #faf5ff; color: #7c3aed; }
    .context-bar__badge[data-estado="EN_RENDIMIENTO_DISTINGUIDO"] { background: #fefce8; color: #a16207; }
    .context-bar__badge[data-estado="EN_CIERRE"] { background: #fff7ed; color: #c2410c; }
    .context-bar__badge[data-estado="CERRADO"] { background: #f1f5f9; color: #475569; }
    .context-bar__badge[data-estado="ANULADO"] { background: #fef2f2; color: #991b1b; }

    .context-bar__badge--historical {
      background: #fef9c3;
      color: #713f12;
      letter-spacing: 0.05em;
    }
  `]
})
export class CycleContextBarComponent {
  private readonly cicloNavService = inject(CicloNavService);
  private readonly authService = inject(AuthService);

  readonly isActiveCycle = this.cicloNavService.isActiveCycle;

  private readonly ciclo = this.cicloNavService.ciclo;
  private readonly ctx = this.authService.currentContext;

  readonly cycleName = computed(() => this.ciclo()?.name ?? '—');
  readonly estadoEtapa = computed(() => this.ciclo()?.estadoEtapa ?? '');
  readonly estadoEtapaLabel = computed(() => this.ciclo()?.estadoEtapaLabel ?? '');
  readonly functionalActor = computed(() =>
    functionalActorLabel(this.ctx()?.functionalActor)
  );
  readonly orgUnitName = computed(() => this.ctx()?.orgUnitName ?? '');
}
