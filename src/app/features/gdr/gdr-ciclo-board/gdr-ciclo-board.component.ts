import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CicloNavService } from '../../../core/gdr/ciclo-nav.service';
import { GdrCronogramaApiService } from '../../../core/admin/gdr-cronograma-api.service';
import { CicloConCronogramaResponse } from '../../../core/admin/cycles.models';
import { CycleContextBarComponent } from '../../../shared/ui/cycle-context-bar.component';
import { GdrCicloBoardCardComponent } from '../../../shared/ui/gdr-ciclo-board-card/gdr-ciclo-board-card.component';
import { GdrMacroFlowBarComponent } from '../../../shared/ui/gdr-macro-flow-bar/gdr-macro-flow-bar.component';
import { resolveGdrBoardCards, CicloBoardContext, GdrBoardCardResolvedState } from './utils/gdr-ciclo-board-access.resolver';
import {
  CardBlock,
  BLOCK_LABELS,
} from './gdr-ciclo-board-phase.registry';
import { GDR_BOARD_BANNER_MESSAGES } from './utils/gdr-ciclo-board-messages';
import { PlanificacionCumplimientoBlockComponent } from '../../../shared/ui/planificacion-cumplimiento-block/planificacion-cumplimiento-block.component';

interface BlockGroup {
  block: CardBlock;
  label: string;
  cards: GdrBoardCardResolvedState[];
}

const BLOCK_ORDER: CardBlock[] = ['A', 'B', 'C', 'D', 'E', 'F'];

@Component({
  selector: 'app-gdr-ciclo-board',
  standalone: true,
  imports: [RouterLink, DatePipe, CycleContextBarComponent, GdrCicloBoardCardComponent, GdrMacroFlowBarComponent, PlanificacionCumplimientoBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gdr-ciclo-board.component.html',
  styleUrl: './gdr-ciclo-board.component.css',
})
export class GdrCicloBoardComponent {
  private readonly authService = inject(AuthService);
  private readonly cicloNavService = inject(CicloNavService);
  private readonly cronogramaService = inject(GdrCronogramaApiService);

  readonly cicloId = this.cicloNavService.cicloId;
  readonly isActiveCycle = this.cicloNavService.isActiveCycle;

  readonly cicloDetail = signal<CicloConCronogramaResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** Context del tablero desde la API (T4). Por ahora null hasta implementar endpoint. */
  readonly boardContext = signal<CicloBoardContext | null>(null);

  readonly fa = this.authService.featureAccess;
  readonly ctx = computed(() => this.authService.currentUser()?.context ?? null);

  private readonly navCiclo = this.cicloNavService.ciclo;

  readonly cycleName = computed(
    () => this.cicloDetail()?.name ?? this.navCiclo()?.name ?? this.ctx()?.cycleName ?? '—'
  );
  readonly cycleCode = computed(
    () => this.cicloDetail()?.code ?? this.navCiclo()?.code ?? this.ctx()?.cycleCode ?? ''
  );
  readonly estadoEtapa = computed(
    () => this.cicloDetail()?.estadoEtapa ?? this.navCiclo()?.estadoEtapa ?? this.ctx()?.estadoEtapa ?? ''
  );
  readonly estadoEtapaLabel = computed(
    () => this.cicloDetail()?.estadoEtapaLabel ?? this.navCiclo()?.estadoEtapaLabel ?? this.mapEtapaLabel(this.estadoEtapa())
  );
  readonly functionalActor = computed(() => this.ctx()?.functionalActor ?? '');
  readonly orgUnitName = computed(() => this.ctx()?.orgUnitName ?? '');

  /** ACTOR_MIXTO: usuario con asignaciones como evaluador Y evaluado en el mismo ciclo. */
  readonly esMixto = computed(() => this.functionalActor() === 'EVALUADOR_Y_EVALUADO');
  readonly contextoMixto = signal<'MI_EVALUACION' | 'MIS_EVALUADOS'>('MIS_EVALUADOS');

  /** Actor efectivo según el selector de contexto (sólo cambia para ACTOR_MIXTO). */
  readonly actorEfectivo = computed((): string => {
    if (this.esMixto()) {
      return this.contextoMixto() === 'MI_EVALUACION' ? 'EVALUADO' : 'EVALUADOR';
    }
    return this.functionalActor();
  });

  readonly bannerMessage = computed(() => {
    const actor = this.actorEfectivo();
    return actor ? GDR_BOARD_BANNER_MESSAGES[actor as keyof typeof GDR_BOARD_BANNER_MESSAGES] ?? null : null;
  });

  /** Todos los cards resueltos (estado por etapa+actor+featureAccess). */
  readonly resolvedCards = computed(() =>
    resolveGdrBoardCards(
      this.estadoEtapa(),
      this.actorEfectivo(),
      this.fa(),
      this.boardContext(),
    )
  );

  /** Cards agrupados por bloque A–F, excluyendo NO_APLICA vacíos. */
  readonly blockGroups = computed((): BlockGroup[] => {
    const cards = this.resolvedCards();
    return BLOCK_ORDER.map((block) => ({
      block,
      label: BLOCK_LABELS[block],
      cards: cards.filter((c) => c.entry.block === block),
    })).filter((g) => g.cards.some((c) => c.state !== 'NO_APLICA'));
  });

  readonly hasCards = computed(() => this.blockGroups().length > 0);

  readonly showMacroFlow = computed(() =>
    !!this.estadoEtapa() && this.estadoEtapa() !== 'BORRADOR'
  );

  /** Mostrar bloque cumplimiento en EN_PLANIFICACION y también colapsado en etapas posteriores */
  readonly showCumplimientoBlock = computed(() => {
    const etapa = this.estadoEtapa();
    const actor = this.actorEfectivo();
    return ['EN_PLANIFICACION', 'EN_SEGUIMIENTO', 'EN_EVALUACION'].includes(etapa)
      && actor !== 'EVALUADO';
  });

  /** ORH funcional puede avanzar a Seguimiento */
  readonly canAdvanceToSeguimiento = computed(() => {
    const actor = this.functionalActor();
    const etapa = this.estadoEtapa();
    return actor === 'ORH' && etapa === 'EN_PLANIFICACION';
  });

  readonly showAvanzarModal = signal(false);

  onAvanzarClick(): void {
    this.showAvanzarModal.set(true);
  }

  closeModal(): void {
    this.showAvanzarModal.set(false);
  }

  setContexto(ctx: 'MI_EVALUACION' | 'MIS_EVALUADOS'): void {
    this.contextoMixto.set(ctx);
  }

  constructor() {
    const id = this.cicloId();
    if (id && id > 0) {
      this.loadDetail(id);
    } else {
      this.loading.set(false);
    }
  }

  reload(): void {
    const id = this.cicloId();
    if (id && id > 0) this.loadDetail(id);
  }

  private loadDetail(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      detalle: this.cronogramaService.getCronograma(id),
      context: this.cronogramaService.getBoardContext(id),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ detalle, context }) => {
          this.cicloDetail.set(detalle);
          this.boardContext.set(context);
        },
        error: () =>
          this.error.set(
            'No se pudo cargar el detalle del ciclo. Los módulos siguen disponibles según sus permisos.'
          ),
      });
  }

  private mapEtapaLabel(etapa: string): string {
    const MAP: Record<string, string> = {
      BORRADOR: 'Borrador',
      EN_PLANIFICACION: 'En planificación',
      EN_SEGUIMIENTO: 'En seguimiento',
      EN_EVALUACION: 'En evaluación',
      EN_CONFIRMACION: 'En confirmación',
      EN_RENDIMIENTO_DISTINGUIDO: 'Rendimiento distinguido',
      CERRADO: 'Cerrado',
      ANULADO: 'Anulado',
    };
    return MAP[etapa] ?? etapa;
  }
}
