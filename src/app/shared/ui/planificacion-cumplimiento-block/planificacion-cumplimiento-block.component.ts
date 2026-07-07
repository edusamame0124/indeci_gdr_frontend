import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CicloBoardContext } from '../../../features/gdr/gdr-ciclo-board/utils/gdr-ciclo-board-access.resolver';

export interface ChecklistItemUi {
  code: string;
  title: string;
  detail: string;
  normativaRef: string;
  tipo: 'obligatorio' | 'configurable';
  status: 'passed' | 'failed' | 'pending' | 'na';
}

function buildChecklist(ctx: CicloBoardContext | null): ChecklistItemUi[] {
  const c = ctx;
  return [
    {
      code: 'REQ-01',
      title: 'Cronograma normativo completo (7 etapas)',
      detail: 'Las 7 etapas del cronograma deben tener fecha de inicio y fin.',
      normativaRef: 'RPE 068-2020 Art. 14',
      tipo: 'obligatorio',
      status: c == null ? 'pending' : c.cronogramaCompleto ? 'passed' : 'failed',
    },
    {
      code: 'REQ-02',
      title: 'Seguimiento mínimo de 6 meses (VAL-01)',
      detail: 'Al menos 180 días entre inicio del ciclo y fin de la etapa Seguimiento.',
      normativaRef: 'RPE 068-2020 Art. 26',
      tipo: 'obligatorio',
      status: c == null ? 'pending' : c.seguimientoMinimoSeisMeses ? 'passed' : 'failed',
    },
    {
      code: 'REQ-03',
      title: 'Participantes registrados',
      detail: 'Al menos un participante GDR registrado para este ciclo.',
      normativaRef: 'RPE 068-2020 Art. 10-12',
      tipo: 'obligatorio',
      status: c == null ? 'pending' : c.participantesRegistrados ? 'passed' : 'failed',
    },
    {
      code: 'REQ-05',
      title: 'Indicadores habilitados',
      detail: 'Al menos un indicador habilitado para el ciclo.',
      normativaRef: 'RPE 076-2021 Art. 8',
      tipo: 'obligatorio',
      status: c == null ? 'pending' : c.indicadoresHabilitados ? 'passed' : 'failed',
    },
    {
      code: 'REQ-06',
      title: 'Metas formalizadas (pesos = 100 % por evaluado)',
      detail: 'Cada evaluado debe tener metas con pesos que sumen 100%.',
      normativaRef: 'RPE 076-2021',
      tipo: 'obligatorio',
      status: c == null ? 'pending' : c.metasFormalizadas100 ? 'passed' : 'failed',
    },
    {
      code: 'REQ-07',
      title: 'CIE conformado',
      detail: 'El Comité Institucional de Evaluación debe estar configurado para este ciclo.',
      normativaRef: 'RPE 068-2020 Art. 42-48',
      tipo: 'configurable', // POSIBLE_CAMBIO_RRHH_GDR_001: puede volverse obligatorio
      status: c == null ? 'na' : !c.cieAplica ? 'na' : c.cieConfigurado ? 'passed' : 'failed',
    },
    {
      code: 'REQ-08',
      title: 'Notificaciones de toma de conocimiento enviadas',
      detail: 'Las metas deben haber sido notificadas a los evaluados antes de avanzar.',
      normativaRef: 'RPE 068-2020 Art. 26',
      tipo: 'configurable',
      status: c == null ? 'pending' : c.notificacionesTomaConocimiento ? 'passed' : 'failed',
    },
  ];
}

@Component({
  selector: 'app-planificacion-cumplimiento-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planificacion-cumplimiento-block.component.html',
  styleUrl: './planificacion-cumplimiento-block.component.css',
})
export class PlanificacionCumplimientoBlockComponent {
  /** Contexto del tablero (del endpoint /planning-checklist). Null mientras carga. */
  readonly boardContext = input<CicloBoardContext | null>(null);
  /** Solo true si el usuario es ORH funcional en esta etapa. */
  readonly canAdvance = input<boolean>(false);
  /** Etapa actual del ciclo. */
  readonly estadoEtapa = input.required<string>();

  /** D-01: operativo solo en EN_PLANIFICACION; colapsado en otras etapas. */
  readonly isOperativo = computed(() => this.estadoEtapa() === 'EN_PLANIFICACION');

  readonly collapsed = signal(false);

  readonly checklist = computed(() => buildChecklist(this.boardContext()));

  readonly obligatoriosPasados = computed(() =>
    this.checklist().filter((i) => i.tipo === 'obligatorio' && i.status === 'passed').length
  );
  readonly obligatoriosTotal = computed(() =>
    this.checklist().filter((i) => i.tipo === 'obligatorio').length
  );
  readonly allRequired = computed(() =>
    this.checklist()
      .filter((i) => i.tipo === 'obligatorio')
      .every((i) => i.status === 'passed')
  );
  readonly porcentaje = computed(() =>
    Math.round((this.obligatoriosPasados() / this.obligatoriosTotal()) * 100)
  );

  readonly avanzarClick = output<void>();

  onAvanzar(): void {
    this.avanzarClick.emit();
  }

  toggleCollapse(): void {
    this.collapsed.update((v) => !v);
  }

  statusIcon(status: ChecklistItemUi['status']): string {
    switch (status) {
      case 'passed': return '✓';
      case 'failed': return '✗';
      case 'pending': return '…';
      case 'na': return '—';
    }
  }
}
