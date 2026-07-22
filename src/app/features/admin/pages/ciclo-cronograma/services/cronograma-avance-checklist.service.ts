import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { GdrCronogramaApiService } from '../../../../../core/admin/gdr-cronograma-api.service';
import { CicloConCronogramaResponse, CronogramaEtapaResponse } from '../../../../../core/admin/cycles.models';
import { CronogramaAvanceChecklistResult } from '../models/cronograma-avance-checklist.model';
import { buildCronogramaAvanceChecklist } from '../utils/cronograma-avance-checklist.util';

@Injectable({ providedIn: 'root' })
export class CronogramaAvanceChecklistService {
  private readonly cronogramaApi = inject(GdrCronogramaApiService);

  loadChecklist(
    cycleId: number,
    ciclo: CicloConCronogramaResponse,
    etapas: CronogramaEtapaResponse[]
  ): Observable<CronogramaAvanceChecklistResult> {
    return this.cronogramaApi.getChecklistAvance(cycleId).pipe(
      map((backendChecklist) => buildCronogramaAvanceChecklist(ciclo, etapas, backendChecklist))
    );
  }
}
