import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinalEvaluationSummary } from '../../../../core/final-evaluation/final-evaluation.models';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

@Component({
  selector: 'app-final-evaluation-list',
  standalone: true,
  imports: [RouterLink, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './final-evaluation-list.component.html',
  styleUrl: './final-evaluation-list.component.css'
})
export class FinalEvaluationListComponent {
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  readonly cicloNavService = inject(CicloNavService);

  readonly evaluations = signal<FinalEvaluationSummary[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.loadEvaluations();
  }

  private loadEvaluations(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.finalEvaluationService.listFinalEvaluations(this.cicloNavService.cicloId()!).subscribe({
      next: (evaluations) => {
        this.evaluations.set(evaluations);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }
}
