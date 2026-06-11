import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoCiclo, MACRO_FLOW_ORDER } from '../../../features/gdr/gdr-ciclo-board/gdr-ciclo-board-phase.registry';

interface FlowStep {
  estado: EstadoCiclo;
  label: string;
  status: 'completed' | 'active' | 'upcoming';
}

const FLOW_STEPS: Array<{ estado: EstadoCiclo; label: string }> = [
  { estado: 'EN_PLANIFICACION', label: 'Planificación' },
  { estado: 'EN_SEGUIMIENTO', label: 'Seguimiento' },
  { estado: 'EN_EVALUACION', label: 'Evaluación' },
  { estado: 'EN_CONFIRMACION', label: 'Confirmación' },
  { estado: 'EN_RENDIMIENTO_DISTINGUIDO', label: 'Distinguido' },
  { estado: 'CERRADO', label: 'Cerrado' },
];

@Component({
  selector: 'app-gdr-macro-flow-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gdr-macro-flow-bar.component.html',
  styleUrl: './gdr-macro-flow-bar.component.css',
})
export class GdrMacroFlowBarComponent {
  readonly estadoEtapa = input.required<string>();

  readonly steps = computed((): FlowStep[] => {
    const current = this.estadoEtapa() as EstadoCiclo;
    const currentIdx = MACRO_FLOW_ORDER.indexOf(current);
    return FLOW_STEPS.map((s) => {
      const idx = MACRO_FLOW_ORDER.indexOf(s.estado);
      let status: FlowStep['status'];
      if (idx < currentIdx) status = 'completed';
      else if (idx === currentIdx) status = 'active';
      else status = 'upcoming';
      return { ...s, status };
    });
  });
}
