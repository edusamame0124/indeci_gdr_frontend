import { FeatureAccess } from '../../../../core/auth/auth.models';
import {
  ActorFuncional,
  CardVisualState,
  EstadoCiclo,
  GdrBoardEntry,
  GdrBoardPhaseEntry,
  GDR_BOARD_PHASE_REGISTRY,
} from '../gdr-ciclo-board-phase.registry';
import { BlockReasonCode } from './gdr-ciclo-board-messages';

export interface CicloBoardContext {
  canAdvanceToSeguimiento: boolean;
  hasExcepcionEdicion: boolean;
  planificacionCompletadaEn: string | null;
  planificacionCompletadaPor: string | null;
  // checklist flags (del endpoint /planning-checklist)
  cronogramaCompleto: boolean;
  seguimientoMinimoSeisMeses: boolean;
  participantesRegistrados: boolean;
  asignacionesCompletas: boolean;
  cieAplica: boolean;
  cieConfigurado: boolean;
  indicadoresHabilitados: boolean;
  metasFormalizadas100: boolean;
  notificacionesTomaConocimiento: boolean;
}

export interface GdrBoardCardResolvedState {
  entry: GdrBoardEntry;
  state: CardVisualState;
  stateLabel: string;
  blockReasonCode: BlockReasonCode | null;
  isNavigable: boolean;
  route: string[] | null;
}

type SlugStateMap = Record<string, CardVisualState>;

// ── Tabla maestra de estados por etapa (§5.1 del plan) ──────────────────────
// Mapea: estadoEtapa → { slug → estado base }
const STATE_TABLE: Partial<Record<EstadoCiclo, SlugStateMap>> = {
  EN_PLANIFICACION: {
    'cronograma': 'ACTIVO',
    'participacion-gdr': 'ACTIVO',
    'asignaciones': 'ACTIVO',
    'cie-conformacion': 'ACTIVO',
    'indicadores': 'ACTIVO',
    'metas': 'ACTIVO',
    'toma-conocimiento': 'ACTIVO',
    'seguimiento': 'PROXIMA_FASE',
    'oportunidades-mejora': 'BLOQUEADO',
    'evaluacion-final': 'BLOQUEADO',
    'documentos': 'BLOQUEADO',
    'confirmacion': 'BLOQUEADO',
    'cie-casos': 'BLOQUEADO',
    'distinguidos-candidatos': 'BLOQUEADO',
    'distinguidos-asignacion': 'BLOQUEADO',
    'formato-gdr': 'BLOQUEADO',
    'informe-cierre': 'BLOQUEADO',
    'reportes': 'DISPONIBLE',
    'auditoria': 'DISPONIBLE',
    'orh-recepcion': 'DISPONIBLE',
  },
  EN_SEGUIMIENTO: {
    'cronograma': 'SOLO_LECTURA',
    'participacion-gdr': 'SOLO_LECTURA',
    'asignaciones': 'SOLO_LECTURA',
    'cie-conformacion': 'SOLO_LECTURA',
    'indicadores': 'SOLO_LECTURA',
    'metas': 'SOLO_LECTURA',
    'toma-conocimiento': 'ACTIVO',
    'seguimiento': 'ACTIVO',
    'oportunidades-mejora': 'ACTIVO',
    'evaluacion-final': 'PROXIMA_FASE',
    'documentos': 'SOLO_LECTURA',
    'confirmacion': 'BLOQUEADO',
    'cie-casos': 'BLOQUEADO',
    'distinguidos-candidatos': 'BLOQUEADO',
    'distinguidos-asignacion': 'BLOQUEADO',
    'formato-gdr': 'BLOQUEADO',
    'informe-cierre': 'BLOQUEADO',
    'reportes': 'DISPONIBLE',
    'auditoria': 'DISPONIBLE',
    'orh-recepcion': 'DISPONIBLE',
  },
  EN_EVALUACION: {
    'cronograma': 'SOLO_LECTURA',
    'participacion-gdr': 'SOLO_LECTURA',
    'asignaciones': 'SOLO_LECTURA',
    'cie-conformacion': 'SOLO_LECTURA',
    'indicadores': 'SOLO_LECTURA',
    'metas': 'SOLO_LECTURA',
    'toma-conocimiento': 'ACTIVO',
    'seguimiento': 'SOLO_LECTURA',
    'oportunidades-mejora': 'ACTIVO',
    'evaluacion-final': 'ACTIVO',
    'documentos': 'ACTIVO',
    'confirmacion': 'PENDIENTE_REQUISITOS',
    'cie-casos': 'PENDIENTE_REQUISITOS',
    'distinguidos-candidatos': 'BLOQUEADO',
    'distinguidos-asignacion': 'BLOQUEADO',
    'formato-gdr': 'ACTIVO',
    'informe-cierre': 'BLOQUEADO',
    'reportes': 'DISPONIBLE',
    'auditoria': 'DISPONIBLE',
    'orh-recepcion': 'DISPONIBLE',
  },
  EN_CONFIRMACION: {
    'cronograma': 'SOLO_LECTURA',
    'participacion-gdr': 'SOLO_LECTURA',
    'asignaciones': 'SOLO_LECTURA',
    'cie-conformacion': 'ACTIVO',
    'indicadores': 'SOLO_LECTURA',
    'metas': 'SOLO_LECTURA',
    'toma-conocimiento': 'ACTIVO',
    'seguimiento': 'SOLO_LECTURA',
    'oportunidades-mejora': 'SOLO_LECTURA',
    'evaluacion-final': 'SOLO_LECTURA',
    'documentos': 'ACTIVO',
    'confirmacion': 'ACTIVO',
    'cie-casos': 'ACTIVO',
    'distinguidos-candidatos': 'BLOQUEADO',
    'distinguidos-asignacion': 'BLOQUEADO',
    'formato-gdr': 'ACTIVO',
    'informe-cierre': 'BLOQUEADO',
    'reportes': 'DISPONIBLE',
    'auditoria': 'DISPONIBLE',
    'orh-recepcion': 'DISPONIBLE',
  },
  EN_RENDIMIENTO_DISTINGUIDO: {
    'cronograma': 'SOLO_LECTURA',
    'participacion-gdr': 'SOLO_LECTURA',
    'asignaciones': 'SOLO_LECTURA',
    'cie-conformacion': 'SOLO_LECTURA',
    'indicadores': 'SOLO_LECTURA',
    'metas': 'SOLO_LECTURA',
    'toma-conocimiento': 'ACTIVO',
    'seguimiento': 'SOLO_LECTURA',
    'oportunidades-mejora': 'SOLO_LECTURA',
    'evaluacion-final': 'SOLO_LECTURA',
    'documentos': 'ACTIVO',
    'confirmacion': 'SOLO_LECTURA',
    'cie-casos': 'SOLO_LECTURA',
    'distinguidos-candidatos': 'ACTIVO',
    'distinguidos-asignacion': 'ACTIVO',
    'formato-gdr': 'ACTIVO',
    'informe-cierre': 'DISPONIBLE',
    'reportes': 'DISPONIBLE',
    'auditoria': 'DISPONIBLE',
    'orh-recepcion': 'DISPONIBLE',
  },
  CERRADO: {
    'cronograma': 'SOLO_LECTURA',
    'participacion-gdr': 'SOLO_LECTURA',
    'asignaciones': 'SOLO_LECTURA',
    'cie-conformacion': 'SOLO_LECTURA',
    'indicadores': 'SOLO_LECTURA',
    'metas': 'SOLO_LECTURA',
    'toma-conocimiento': 'SOLO_LECTURA',
    'seguimiento': 'SOLO_LECTURA',
    'oportunidades-mejora': 'SOLO_LECTURA',
    'evaluacion-final': 'SOLO_LECTURA',
    'documentos': 'SOLO_LECTURA',
    'confirmacion': 'SOLO_LECTURA',
    'cie-casos': 'SOLO_LECTURA',
    'distinguidos-candidatos': 'SOLO_LECTURA',
    'distinguidos-asignacion': 'SOLO_LECTURA',
    'formato-gdr': 'ACTIVO',
    'informe-cierre': 'ACTIVO',
    'reportes': 'SOLO_LECTURA',
    'auditoria': 'SOLO_LECTURA',
    'orh-recepcion': 'DISPONIBLE',
  },
  BORRADOR: {
    'cronograma': 'ACTIVO',
    'participacion-gdr': 'DISPONIBLE',
    'asignaciones': 'BLOQUEADO',
    'cie-conformacion': 'BLOQUEADO',
    'indicadores': 'BLOQUEADO',
    'metas': 'BLOQUEADO',
    'toma-conocimiento': 'BLOQUEADO',
    'seguimiento': 'BLOQUEADO',
    'oportunidades-mejora': 'BLOQUEADO',
    'evaluacion-final': 'BLOQUEADO',
    'documentos': 'BLOQUEADO',
    'confirmacion': 'BLOQUEADO',
    'cie-casos': 'BLOQUEADO',
    'distinguidos-candidatos': 'BLOQUEADO',
    'distinguidos-asignacion': 'BLOQUEADO',
    'formato-gdr': 'BLOQUEADO',
    'informe-cierre': 'BLOQUEADO',
    'reportes': 'DISPONIBLE',
    'auditoria': 'DISPONIBLE',
    'orh-recepcion': 'DISPONIBLE',
  },
};

const STATE_LABELS: Record<CardVisualState, string> = {
  ACTIVO: 'Activo',
  DISPONIBLE: 'Disponible',
  PROXIMA_FASE: 'Próxima fase',
  BLOQUEADO: 'Bloqueado',
  SOLO_LECTURA: 'Solo lectura',
  PENDIENTE_REQUISITOS: 'Pendiente',
  NO_APLICA: 'No aplica',
};

/**
 * Resuelve el estado visual de cada card del tablero GDR.
 * Lógica por prioridad:
 * 1. Sin permiso base → NO_APLICA
 * 2. Actor no en showWhen → NO_APLICA
 * 3. Reportes/Auditoría → siempre DISPONIBLE (nunca bloqueados por etapa)
 * 4. Estado base de la tabla §5.1
 * 5. D-02: SOLO_LECTURA en seguimiento → ACTIVO si tiene excepción
 * 6. BLOQUEADO inmediatamente siguiente → PROXIMA_FASE
 */
export function resolveGdrBoardCards(
  estadoEtapa: string,
  functionalActor: string,
  featureAccess: FeatureAccess | null,
  boardContext: CicloBoardContext | null,
): GdrBoardCardResolvedState[] {
  const etapa = estadoEtapa as EstadoCiclo;
  const actor = functionalActor as ActorFuncional;
  const etapaMap = STATE_TABLE[etapa] ?? {};
  const hasExcepcion = boardContext?.hasExcepcionEdicion ?? false;

  return GDR_BOARD_PHASE_REGISTRY.map((entry): GdrBoardCardResolvedState => {
    // 1. Sin featureAccess → no operativo
    if (!featureAccess) {
      return noAplica(entry, 'SIN_ACTOR_FUNCIONAL');
    }

    // 2. Permiso base ausente
    const permKey = entry.permissionKey as keyof FeatureAccess;
    if (!featureAccess[permKey]) {
      return noAplica(entry, 'SIN_PERMISO_ROL');
    }

    // 3. Actor funcional no en showWhen
    if (!entry.showWhen.includes(actor)) {
      return noAplica(entry, 'NO_APLICA_ROL');
    }

    // 4. Tarjetas informativas (no navegables) — siempre visibles si llegó aquí
    if (!entry.isNavigable) {
      return {
        entry,
        state: 'DISPONIBLE',
        stateLabel: STATE_LABELS['DISPONIBLE'],
        blockReasonCode: null,
        isNavigable: false,
        route: null,
      };
    }

    const navEntry = entry as GdrBoardPhaseEntry;

    // 5. Transversales (reportes/auditoría) → siempre DISPONIBLE, nunca bloqueados
    if (navEntry.macroFlow === 'transversal') {
      const baseTransversal = etapaMap[navEntry.slug] ?? 'DISPONIBLE';
      return {
        entry,
        state: baseTransversal,
        stateLabel: STATE_LABELS[baseTransversal],
        blockReasonCode: null,
        isNavigable: true,
        route: buildRoute(navEntry),
      };
    }

    // 6. Estado base de la tabla §5.1
    let baseState: CardVisualState = etapaMap[navEntry.slug] ?? 'BLOQUEADO';

    // 7. D-02: en seguimiento los módulos A son SOLO_LECTURA por defecto,
    //    pero si el usuario tiene permiso excepcional → ACTIVO
    if (
      baseState === 'SOLO_LECTURA'
      && etapa === 'EN_SEGUIMIENTO'
      && navEntry.block === 'A'
      && hasExcepcion
    ) {
      baseState = 'ACTIVO';
    }

    // 8. BLOQUEADO → PROXIMA_FASE si es la fase inmediatamente siguiente al ACTIVO
    if (baseState === 'BLOQUEADO' && isProximaFase(navEntry.slug, etapa, etapaMap)) {
      baseState = 'PROXIMA_FASE';
    }

    const blockReasonCode = deriveReasonCode(baseState, navEntry.slug, etapa);

    return {
      entry,
      state: baseState,
      stateLabel: STATE_LABELS[baseState],
      blockReasonCode,
      isNavigable: isCardNavigable(baseState),
      route: isCardNavigable(baseState) ? buildRoute(navEntry) : null,
    };
  });
}

function isCardNavigable(state: CardVisualState): boolean {
  return state === 'ACTIVO' || state === 'DISPONIBLE' || state === 'SOLO_LECTURA';
}

function buildRoute(entry: GdrBoardPhaseEntry): string[] {
  return entry.routeSegments;
}

function isProximaFase(slug: string, etapa: EstadoCiclo, etapaMap: SlugStateMap): boolean {
  const slugOrder = GDR_BOARD_PHASE_REGISTRY
    .filter((e): e is GdrBoardPhaseEntry => e.isNavigable && e.phase !== null)
    .map((e) => e.slug);
  const activeSlugIdx = slugOrder.findIndex(
    (s) => (etapaMap[s] === 'ACTIVO' || etapaMap[s] === 'DISPONIBLE') && s !== slug
  );
  const currentIdx = slugOrder.indexOf(slug);
  if (activeSlugIdx === -1 || currentIdx === -1) return false;
  const lastActiveIdx = Math.max(
    ...slugOrder
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => etapaMap[s] === 'ACTIVO' || etapaMap[s] === 'DISPONIBLE')
      .map(({ i }) => i)
  );
  return currentIdx === lastActiveIdx + 1;
}

function deriveReasonCode(
  state: CardVisualState,
  slug: string,
  etapa: EstadoCiclo,
): BlockReasonCode | null {
  switch (state) {
    case 'ACTIVO':
    case 'DISPONIBLE':
    case 'SOLO_LECTURA':
      return null;
    case 'PROXIMA_FASE':
      return 'PROXIMA_FASE_DISPONIBLE';
    case 'NO_APLICA':
      return 'NO_APLICA_ROL';
    case 'BLOQUEADO':
      return etapa === 'CERRADO' ? 'ETAPA_CERRADA' : 'ETAPA_FUTURA';
    case 'PENDIENTE_REQUISITOS':
      if (slug === 'confirmacion') return 'PEND_REQ_TOMA_CONOCIMIENTO';
      if (slug === 'cie-casos') return 'PEND_REQ_ASIGNACIONES';
      return 'ETAPA_NO_ACTIVA';
    default:
      return 'ETAPA_NO_ACTIVA';
  }
}

function noAplica(entry: GdrBoardEntry, code: BlockReasonCode): GdrBoardCardResolvedState {
  return {
    entry,
    state: 'NO_APLICA',
    stateLabel: STATE_LABELS['NO_APLICA'],
    blockReasonCode: code,
    isNavigable: false,
    route: null,
  };
}
