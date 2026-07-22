import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CronogramaAvanceChecklistResult,
  CronogramaChecklistItem,
} from '../../models/cronograma-avance-checklist.model';
import { checklistStatusLabel } from '../../utils/cronograma-avance-checklist.util';

@Component({
  selector: 'app-cronograma-avance-checklist-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cronograma-avance-checklist-card.component.html',
  styleUrl: './cronograma-avance-checklist-card.component.css',
})
export class CronogramaAvanceChecklistCardComponent {
  readonly checklist = input.required<CronogramaAvanceChecklistResult>();
  readonly loading = input(false);
  readonly serverMessage = input<string | null>(null);
  readonly transitionLabel = input('la siguiente etapa');

  statusLabel(item: CronogramaChecklistItem): string {
    return checklistStatusLabel(item.status);
  }
}
