import { AssignmentListItemResponse } from '../../../../../core/admin/assignments.models';
import { CicloConCronogramaResponse, CronogramaEtapaResponse } from '../../../../../core/admin/cycles.models';
import { GoalSummary } from '../../../../../core/goals/goals.models';
import {
  CronogramaAvanceChecklistResult,
  CronogramaChecklistItem,
  CronogramaChecklistStatus,
} from '../models/cronograma-avance-checklist.model';

export const ETAPAS_CRONOGRAMA_TOTAL = 7;
export const DIAS_MINIMOS_SEGUIMIENTO = 180;
const PESO_META_MIN = 99.995;
const PESO_META_MAX = 100.005;
const ACTIVE_STATUS = 'ACTIVE';

function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffDays(start: Date, end: Date): number {
  const msPerDay = 86_400_000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

function resolveFechaFinSeguimiento(
  ciclo: CicloConCronogramaResponse,
  etapas: CronogramaEtapaResponse[]
): string | null {
  if (ciclo.fechaFinSeguimiento) {
    return ciclo.fechaFinSeguimiento;
  }
  return etapas.find((e) => e.etapa === 'SEGUIMIENTO')?.fechaFin ?? null;
}

function isGoalWeightTotalValid(total: number): boolean {
  return total >= PESO_META_MIN && total <= PESO_META_MAX;
}

function buildCronogramaCompletoItem(configuradas: number): CronogramaChecklistItem {
  const passed = configuradas >= ETAPAS_CRONOGRAMA_TOTAL;
  return {
    code: 'CRONOGRAMA_COMPLETO',
    title: 'Cronograma normativo completo',
    description: 'Las siete etapas del cronograma deben tener fecha de inicio y fin.',
    status: passed ? 'passed' : configuradas > 0 ? 'pending' : 'failed',
    detail: passed
      ? `${configuradas} de ${ETAPAS_CRONOGRAMA_TOTAL} etapas configuradas.`
      : `${configuradas} de ${ETAPAS_CRONOGRAMA_TOTAL} etapas configuradas. Complete las fechas pendientes.`,
    normativaRef: 'RPE 068-2020-SERVIR-PE Art. 14',
    actionLabel: passed ? null : 'Revisar etapas arriba',
    actionRoute: null,
  };
}

function buildVal01Item(
  ciclo: CicloConCronogramaResponse,
  etapas: CronogramaEtapaResponse[]
): CronogramaChecklistItem {
  const inicio = parseLocalDate(ciclo.startDate);
  const finSeguimiento = parseLocalDate(resolveFechaFinSeguimiento(ciclo, etapas));

  if (!inicio || !finSeguimiento) {
    return {
      code: 'VAL-01',
      title: 'Seguimiento mínimo de 6 meses',
      description:
        'Debe existir fecha de inicio del ciclo y fecha fin de la etapa Seguimiento en el cronograma.',
      status: 'failed',
      detail: 'Configure la etapa Seguimiento y verifique las fechas de inicio del ciclo.',
      normativaRef: 'RPE 068-2020-SERVIR-PE Art. 26',
      actionLabel: 'Editar etapa Seguimiento',
      actionRoute: null,
    };
  }

  const dias = diffDays(inicio, finSeguimiento);
  const passed = dias >= DIAS_MINIMOS_SEGUIMIENTO;

  return {
    code: 'VAL-01',
    title: 'Seguimiento mínimo de 6 meses',
    description:
      'El sistema valida al menos 180 días entre el inicio del ciclo y la fecha fin de Seguimiento.',
    status: passed ? 'passed' : 'failed',
    detail: passed
      ? `${dias} días registrados (mínimo ${DIAS_MINIMOS_SEGUIMIENTO}). Fin seguimiento: ${finSeguimiento.toLocaleDateString('es-PE')}.`
      : `Solo ${dias} días registrados; se requieren ${DIAS_MINIMOS_SEGUIMIENTO} días (6 meses). Ajuste la fecha fin de Seguimiento.`,
    normativaRef: 'RPE 068-2020-SERVIR-PE Art. 26',
    actionLabel: passed ? null : 'Ajustar fecha fin de Seguimiento',
    actionRoute: null,
  };
}

function buildVal07Item(
  assignments: AssignmentListItemResponse[],
  goals: GoalSummary[],
  cycleId: number
): CronogramaChecklistItem {
  const metasRoute = ['/dashboard', 'ciclo', String(cycleId), 'metas'];
  const participacionRoute = ['/dashboard', 'ciclo', String(cycleId), 'participacion-gdr'];

  const activeAssignments = assignments.filter((a) => a.status === ACTIVE_STATUS);
  if (activeAssignments.length === 0) {
    return {
      code: 'VAL-07',
      title: 'Metas con peso total 100 %',
      description: 'Cada evaluado con asignación activa debe tener metas que sumen 100 %.',
      status: 'pending',
      detail: 'No hay asignaciones evaluador-evaluado activas en este ciclo. Registre participación antes de avanzar.',
      normativaRef: 'RPE 076-2021-SERVIR-PE',
      actionLabel: 'Ir a Participación GDR',
      actionRoute: participacionRoute,
    };
  }

  const activeGoals = goals.filter((g) => g.status.toUpperCase() === ACTIVE_STATUS);
  const weightByAssignment = new Map<number, number>();
  for (const goal of activeGoals) {
    const current = weightByAssignment.get(goal.assignmentId) ?? 0;
    weightByAssignment.set(goal.assignmentId, current + goal.weight);
  }

  const evaluadosConError: string[] = [];
  for (const assignment of activeAssignments) {
    const total = weightByAssignment.get(assignment.id) ?? 0;
    if (!isGoalWeightTotalValid(total)) {
      evaluadosConError.push(assignment.evaluated.displayName);
    }
  }

  const passed = evaluadosConError.length === 0;
  return {
    code: 'VAL-07',
    title: 'Metas con peso total 100 %',
    description: 'Todos los evaluados con asignación activa deben tener metas cuyos pesos sumen 100 %.',
    status: passed ? 'passed' : 'failed',
    detail: passed
      ? `${activeAssignments.length} asignación(es) activa(s) cumplen el peso total.`
      : `Revise metas de: ${evaluadosConError.join(', ')}.`,
    normativaRef: 'RPE 076-2021-SERVIR-PE',
    actionLabel: passed ? null : 'Ir a Metas del ciclo',
    actionRoute: passed ? null : metasRoute,
  };
}

export function buildCronogramaAvanceChecklist(
  ciclo: CicloConCronogramaResponse,
  etapas: CronogramaEtapaResponse[],
  assignments: AssignmentListItemResponse[],
  goals: GoalSummary[],
  cycleId: number
): CronogramaAvanceChecklistResult {
  const configuradas = etapas.filter((e) => e.fechaInicio && e.fechaFin).length;

  const items: CronogramaChecklistItem[] = [
    buildCronogramaCompletoItem(configuradas),
    buildVal01Item(ciclo, etapas),
    buildVal07Item(assignments, goals, cycleId),
  ];

  const failedCount = items.filter((i) => i.status === 'failed').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const canAdvance = items.every((i) => i.status === 'passed');

  return { items, canAdvance, failedCount, pendingCount };
}

export function checklistStatusLabel(status: CronogramaChecklistStatus): string {
  switch (status) {
    case 'passed':
      return 'Cumplido';
    case 'failed':
      return 'Pendiente de corrección';
    case 'pending':
      return 'En revisión';
  }
}
