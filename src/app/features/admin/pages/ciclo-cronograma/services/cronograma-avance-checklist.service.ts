import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { AssignmentsService } from '../../../../../core/admin/assignments.service';
import { CicloConCronogramaResponse, CronogramaEtapaResponse } from '../../../../../core/admin/cycles.models';
import { GoalsService } from '../../../../../core/goals/goals.service';
import { CronogramaAvanceChecklistResult } from '../models/cronograma-avance-checklist.model';
import { buildCronogramaAvanceChecklist } from '../utils/cronograma-avance-checklist.util';

@Injectable({ providedIn: 'root' })
export class CronogramaAvanceChecklistService {
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly goalsService = inject(GoalsService);

  loadChecklist(
    cycleId: number,
    ciclo: CicloConCronogramaResponse,
    etapas: CronogramaEtapaResponse[]
  ): Observable<CronogramaAvanceChecklistResult> {
    return forkJoin({
      goals: this.goalsService.listGoals(cycleId).pipe(catchError(() => of([]))),
      assignments: this.assignmentsService.list(cycleId, null, 'ACTIVE').pipe(catchError(() => of([]))),
    }).pipe(
      map(({ goals, assignments }) =>
        buildCronogramaAvanceChecklist(ciclo, etapas, assignments, goals, cycleId)
      )
    );
  }
}
