import { CicloAvanceChecklistApiResponse, CicloChecklistItemApiResponse, CicloConCronogramaResponse, CronogramaEtapaResponse } from '../../../../../core/admin/cycles.models';
import {
  CronogramaAvanceChecklistResult,
  CronogramaChecklistItem,
  CronogramaChecklistStatus,
} from '../models/cronograma-avance-checklist.model';

export const ETAPAS_CRONOGRAMA_TOTAL = 7;

const ESTADO_PLANIFICACION = 'EN_PLANIFICACION';

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

/**
 * Mapea un ítem del checklist calculado por el backend (que reutiliza la misma
 * validación normativa que aplicaría avanzar-etapa) al modelo del frontend.
 * El detalle explicativo ya viene armado del backend — es el mismo mensaje que
 * se mostraría como error si se intentara avanzar sin cumplirlo.
 */
function mapBackendChecklistItem(item: CicloChecklistItemApiResponse): CronogramaChecklistItem {
  const passed = item.status === 'PASSED';
  return {
    code: item.code,
    title: item.title,
    description: item.title,
    status: passed ? 'passed' : 'failed',
    detail: item.detail,
    normativaRef: null,
    actionLabel: null,
    actionRoute: null,
  };
}

/**
 * Checklist de requisitos para AVANZAR desde la etapa actual del ciclo a la
 * siguiente. El único requisito calculado en el frontend es que el cronograma
 * esté completo (solo aplica al salir de Planificación); el resto de
 * requisitos normativos (VAL-01, fecha límite de evaluación, evaluaciones
 * finales registradas, casos CIE resueltos, notificaciones pendientes) los
 * calcula el backend reutilizando las mismas validaciones de avanzar-etapa,
 * para que nunca diverjan entre lo que el checklist muestra y lo que el
 * servidor realmente exige.
 */
export function buildCronogramaAvanceChecklist(
  ciclo: CicloConCronogramaResponse,
  etapas: CronogramaEtapaResponse[],
  backendChecklist: CicloAvanceChecklistApiResponse
): CronogramaAvanceChecklistResult {
  const items: CronogramaChecklistItem[] = [];

  if (ciclo.estadoEtapa === ESTADO_PLANIFICACION) {
    const configuradas = etapas.filter((e) => e.fechaInicio && e.fechaFin).length;
    items.push(buildCronogramaCompletoItem(configuradas));
  }

  items.push(...backendChecklist.items.map(mapBackendChecklistItem));

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
