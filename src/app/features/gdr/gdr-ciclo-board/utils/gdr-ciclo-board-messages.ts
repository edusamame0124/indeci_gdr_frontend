import { ActorFuncional } from '../gdr-ciclo-board-phase.registry';

export type BlockReasonCode =
  | 'ETAPA_NO_ACTIVA'
  | 'ETAPA_CERRADA'
  | 'ETAPA_FUTURA'
  | 'SIN_PERMISO_ROL'
  | 'SIN_ACTOR_FUNCIONAL'
  | 'SOLO_LECTURA_SEGUIMIENTO'
  | 'SOLO_LECTURA_EVALUACION'
  | 'SOLO_LECTURA_CICLO_CERRADO'
  | 'PEND_REQ_CRONOGRAMA'
  | 'PEND_REQ_PARTICIPANTES'
  | 'PEND_REQ_ASIGNACIONES'
  | 'PEND_REQ_CIE'
  | 'PEND_REQ_INDICADORES'
  | 'PEND_REQ_METAS'
  | 'PEND_REQ_TOMA_CONOCIMIENTO'
  | 'NO_APLICA_ROL'
  | 'PROXIMA_FASE_DISPONIBLE';

export interface BlockReasonMessage {
  label: string;
  detail: string;
  suggestedAction: string;
}

export const GDR_BOARD_MESSAGES: Record<BlockReasonCode, BlockReasonMessage> = {
  ETAPA_NO_ACTIVA: {
    label: 'No disponible en esta etapa',
    detail: 'Este módulo no está habilitado en la etapa actual del ciclo.',
    suggestedAction: 'Verifique la etapa del ciclo en Cronograma.',
  },
  ETAPA_CERRADA: {
    label: 'Ciclo cerrado',
    detail: 'El ciclo está cerrado. Solo se permite consulta de información.',
    suggestedAction: 'Puede consultar los reportes históricos.',
  },
  ETAPA_FUTURA: {
    label: 'Fase no iniciada',
    detail: 'Esta fase se habilitará cuando el ciclo avance a la etapa correspondiente.',
    suggestedAction: 'Complete los requisitos de la etapa actual.',
  },
  SIN_PERMISO_ROL: {
    label: 'Sin acceso',
    detail: 'No cuenta con los permisos necesarios para acceder a este módulo.',
    suggestedAction: 'Contacte al administrador del sistema.',
  },
  SIN_ACTOR_FUNCIONAL: {
    label: 'Sin rol funcional GDR',
    detail: 'No tiene un rol funcional asignado en este ciclo.',
    suggestedAction: 'Verifique su vínculo laboral y asignaciones del ciclo activo con la ORH.',
  },
  SOLO_LECTURA_SEGUIMIENTO: {
    label: 'Solo lectura',
    detail: 'En la etapa de Seguimiento, este módulo es de consulta. La corrección requiere permiso excepcional.',
    suggestedAction: 'Si necesita corregir datos, solicite a la ORH habilitación excepcional.',
  },
  SOLO_LECTURA_EVALUACION: {
    label: 'Solo lectura',
    detail: 'En la etapa de Evaluación, la planificación es de solo consulta.',
    suggestedAction: 'Consulte el módulo de Evaluación final para continuar.',
  },
  SOLO_LECTURA_CICLO_CERRADO: {
    label: 'Ciclo cerrado — solo consulta',
    detail: 'El ciclo está cerrado. Todos los módulos operativos son de solo lectura.',
    suggestedAction: 'Consulte los reportes o el informe de cierre.',
  },
  PEND_REQ_CRONOGRAMA: {
    label: 'Pendiente: Cronograma',
    detail: 'El cronograma del ciclo no está completo. Defina las fechas antes de avanzar.',
    suggestedAction: 'Complete el cronograma en Fase 1.',
  },
  PEND_REQ_PARTICIPANTES: {
    label: 'Pendiente: Participantes',
    detail: 'Aún no se han registrado participantes en este ciclo.',
    suggestedAction: 'Registre los participantes en Fase 2.',
  },
  PEND_REQ_ASIGNACIONES: {
    label: 'Pendiente: Asignaciones',
    detail: 'Las asignaciones evaluador-evaluado no están completas.',
    suggestedAction: 'Complete las asignaciones en Fase 3.',
  },
  PEND_REQ_CIE: {
    label: 'Pendiente: Conformación CIE',
    detail: 'El CIE no está conformado para este ciclo.',
    suggestedAction: 'Configure el CIE en Fase 4.',
  },
  PEND_REQ_INDICADORES: {
    label: 'Pendiente: Indicadores',
    detail: 'Los indicadores del ciclo no están habilitados.',
    suggestedAction: 'Habilite los indicadores en Fase 5.',
  },
  PEND_REQ_METAS: {
    label: 'Pendiente: Metas',
    detail: 'Las metas no están al 100% del peso requerido.',
    suggestedAction: 'Formalice las metas en Fase 6 (pesos deben sumar 100%).',
  },
  PEND_REQ_TOMA_CONOCIMIENTO: {
    label: 'Pendiente: Toma de conocimiento',
    detail: 'Las notificaciones de metas no han sido enviadas.',
    suggestedAction: 'Envíe las notificaciones en Fase 7 antes de avanzar.',
  },
  NO_APLICA_ROL: {
    label: 'No aplica para su rol',
    detail: 'Esta fase no aplica para su actor funcional en este ciclo.',
    suggestedAction: '',
  },
  PROXIMA_FASE_DISPONIBLE: {
    label: 'Próxima fase',
    detail: 'Esta fase estará disponible cuando se complete la etapa actual.',
    suggestedAction: 'Avance el ciclo a la siguiente etapa desde Cronograma.',
  },
};

export const GDR_BOARD_BANNER_MESSAGES: Record<ActorFuncional, string> = {
  ORH: 'Como ORH, gestiona el ciclo institucional: cronograma, participantes, asignaciones y avance de etapas.',
  JUNTA_DIRECTIVOS: 'Como Junta de Directivos, su rol es la asignación de Rendimiento Distinguido.',
  CIE: 'Como CIE, accede a la bandeja de casos y gestión del Comité Institucional de Evaluación.',
  TITULAR: 'Acceso de consulta institucional al ciclo GDR.',
  AUDITOR: 'Acceso de auditoría al ciclo GDR. Todos los módulos son de solo lectura.',
  EVALUADOR: 'Como Evaluador, gestiona las metas y la evaluación de sus evaluados a cargo.',
  EVALUADO: 'Como Evaluado, consulta sus metas, seguimiento y resultados de evaluación.',
  EVALUADOR_Y_EVALUADO: 'Tiene asignaciones tanto como Evaluador como Evaluado en este ciclo.',
  CONSULTA: 'Acceso de consulta restringida al ciclo GDR.',
  SIN_ROL_FUNCIONAL_GDR: 'No tiene un rol funcional asignado en este ciclo. Verifique su vínculo laboral y asignaciones con la ORH.',
};
