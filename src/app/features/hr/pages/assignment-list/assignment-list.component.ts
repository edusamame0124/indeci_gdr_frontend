import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HrAssignmentSummary } from '../../../../core/hr/hr.models';
import { HrService } from '../../../../core/hr/hr.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

@Component({
  selector: 'app-assignment-list',
  standalone: true,
  imports: [RouterLink, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assignment-list.component.html',
  styleUrl: './assignment-list.component.css'
})
export class AssignmentListComponent {
  private readonly hrService = inject(HrService);
  readonly cicloNavService = inject(CicloNavService);

  readonly assignments = signal<HrAssignmentSummary[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.loadAssignments();
  }

  private loadAssignments(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.hrService.listAssignments().subscribe({
      next: (assignments) => {
        this.assignments.set(assignments);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar las asignaciones activas.');
        this.loading.set(false);
      }
    });
  }
}
