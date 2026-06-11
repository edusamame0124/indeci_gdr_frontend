import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CicloNavService } from '../../../core/gdr/ciclo-nav.service';
import { GdrBoardCardResolvedState } from '../../../features/gdr/gdr-ciclo-board/utils/gdr-ciclo-board-access.resolver';
import { GDR_BOARD_MESSAGES } from '../../../features/gdr/gdr-ciclo-board/utils/gdr-ciclo-board-messages';
import { GdrBoardPhaseEntry } from '../../../features/gdr/gdr-ciclo-board/gdr-ciclo-board-phase.registry';

@Component({
  selector: 'app-gdr-ciclo-board-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gdr-ciclo-board-card.component.html',
  styleUrl: './gdr-ciclo-board-card.component.css',
})
export class GdrCicloBoardCardComponent {
  private readonly cicloNavService = inject(CicloNavService);

  readonly resolved = input.required<GdrBoardCardResolvedState>();

  get phaseEntry(): GdrBoardPhaseEntry | null {
    const e = this.resolved().entry;
    return e.isNavigable ? (e as GdrBoardPhaseEntry) : null;
  }

  get phaseLabel(): string | null {
    const e = this.resolved().entry;
    return e.phase !== null ? `Fase ${e.phase}` : null;
  }

  get blockReasonMessage() {
    const code = this.resolved().blockReasonCode;
    return code ? GDR_BOARD_MESSAGES[code] : null;
  }

  get route(): string[] {
    const r = this.resolved().route;
    if (!r) return [];
    const cicloId = this.cicloNavService.cicloId();
    return ['/dashboard', 'ciclo', String(cicloId ?? 0), ...r];
  }

  get isInfo(): boolean {
    return !this.resolved().entry.isNavigable;
  }
}
