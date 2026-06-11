import { FeatureAccess } from '../../../core/auth/auth.models';

export type EstadoCiclo =
  | 'BORRADOR'
  | 'EN_PLANIFICACION'
  | 'EN_SEGUIMIENTO'
  | 'EN_EVALUACION'
  | 'EN_CONFIRMACION'
  | 'EN_RENDIMIENTO_DISTINGUIDO'
  | 'CERRADO'
  | 'ANULADO';

export type ActorFuncional =
  | 'ORH'
  | 'JUNTA_DIRECTIVOS'
  | 'CIE'
  | 'TITULAR'
  | 'AUDITOR'
  | 'EVALUADOR'
  | 'EVALUADO'
  | 'EVALUADOR_Y_EVALUADO'
  | 'CONSULTA'
  | 'SIN_ROL_FUNCIONAL_GDR';

export type MacroFlow =
  | 'planificacion'
  | 'seguimiento'
  | 'evaluacion'
  | 'confirmacion'
  | 'distinguido'
  | 'cierre'
  | 'transversal';

export type CardBlock = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type CardVisualState =
  | 'ACTIVO'
  | 'DISPONIBLE'
  | 'PROXIMA_FASE'
  | 'BLOQUEADO'
  | 'SOLO_LECTURA'
  | 'PENDIENTE_REQUISITOS'
  | 'NO_APLICA';

export interface GdrBoardPhaseEntry {
  phase: number | null;
  block: CardBlock;
  slug: string;
  title: string;
  description: string;
  normativaRef: string;
  permissionKey: keyof FeatureAccess;
  showWhen: ActorFuncional[];
  macroFlow: MacroFlow;
  routeSegments: string[];
  isNavigable: true;
  hasSubmodule?: true;
}

export interface GdrBoardInfoEntry {
  phase: null;
  block: CardBlock;
  slug: string;
  title: string;
  description: string;
  normativaRef: string;
  permissionKey: keyof FeatureAccess;
  showWhen: ActorFuncional[];
  macroFlow: MacroFlow;
  isNavigable: false;
}

export type GdrBoardEntry = GdrBoardPhaseEntry | GdrBoardInfoEntry;

const ALL_OPERATIONAL: ActorFuncional[] = [
  'ORH', 'JUNTA_DIRECTIVOS', 'CIE', 'TITULAR', 'AUDITOR',
  'EVALUADOR', 'EVALUADO', 'EVALUADOR_Y_EVALUADO', 'CONSULTA',
];

const ORH_ONLY: ActorFuncional[] = ['ORH'];
const ORH_ADMIN: ActorFuncional[] = ['ORH'];
const CIE_ONLY: ActorFuncional[] = ['CIE'];
const JUNTA_ONLY: ActorFuncional[] = ['JUNTA_DIRECTIVOS'];
const EVALUACION_ACTORS: ActorFuncional[] = ['ORH', 'EVALUADOR', 'EVALUADO', 'EVALUADOR_Y_EVALUADO'];
const EVALUADO_ACTORS: ActorFuncional[] = ['ORH', 'EVALUADO', 'EVALUADOR_Y_EVALUADO'];
const EVALUADOR_ACTORS: ActorFuncional[] = ['ORH', 'EVALUADOR', 'EVALUADOR_Y_EVALUADO'];
const REPORTES_ACTORS: ActorFuncional[] = [
  'ORH', 'JUNTA_DIRECTIVOS', 'TITULAR', 'AUDITOR', 'CONSULTA',
];
const SIN_F9_F11: ActorFuncional[] = [
  'ORH', 'EVALUADO', 'EVALUADOR_Y_EVALUADO', 'CONSULTA', 'TITULAR', 'AUDITOR',
];

/**
 * Registro normativo de las fases del tablero GDR.
 * Sustento: RPE 068-2020, RPE 076-2021, RPE 000041-2025/PE, RPE 000095-2024.
 * Orden: Bloque A (Planificación) → B (Seguimiento) → C (Evaluación) →
 *        D (Confirmación) → E (Distinguido) → F (Cierre/Reportes)
 */
export const GDR_BOARD_PHASE_REGISTRY: GdrBoardEntry[] = [

  // ── BLOQUE A — Planificación ──────────────────────────────────────────────
  {
    phase: 1,
    block: 'A',
    slug: 'cronograma',
    title: 'Cronograma del ciclo',
    description: 'Etapas, fechas normativas y transición del ciclo GDR.',
    normativaRef: 'RPE 068-2020 Art. 14',
    permissionKey: 'canViewCronograma',
    showWhen: ALL_OPERATIONAL,
    macroFlow: 'planificacion',
    routeSegments: ['cronograma'],
    isNavigable: true,
  },
  {
    phase: 2,
    block: 'A',
    slug: 'participacion-gdr',
    title: 'Participación GDR por ciclo',
    description: 'Registro de participantes y cálculo del actor funcional.',
    normativaRef: 'RPE 068-2020 Art. 10-12',
    permissionKey: 'canViewParticipacion',
    showWhen: ORH_ADMIN,
    macroFlow: 'planificacion',
    routeSegments: ['participacion-gdr'],
    isNavigable: true,
  },
  {
    phase: 3,
    block: 'A',
    slug: 'asignaciones',
    title: 'Asignaciones evaluador-evaluado',
    description: 'Relaciones evaluador-evaluado dentro del alcance del ciclo.',
    normativaRef: 'RPE 068-2020 Art. 15-20',
    permissionKey: 'canViewAssignments',
    showWhen: ALL_OPERATIONAL,
    macroFlow: 'planificacion',
    routeSegments: ['asignaciones'],
    isNavigable: true,
  },
  {
    phase: 4,
    block: 'A',
    slug: 'cie-conformacion',
    title: 'Conformación del CIE',
    description: 'Registro y gestión del Comité Institucional de Evaluación.',
    normativaRef: 'RPE 068-2020 Art. 42-48',
    permissionKey: 'canViewCie',
    showWhen: ['ORH', 'CIE', 'TITULAR', 'AUDITOR', 'CONSULTA'],
    macroFlow: 'planificacion',
    routeSegments: ['cie', 'conformacion'],
    isNavigable: true,
  },
  {
    phase: 5,
    block: 'A',
    slug: 'indicadores',
    title: 'Indicadores',
    description: 'Catálogo de indicadores habilitados para este ciclo.',
    normativaRef: 'RPE 076-2021 Art. 8',
    permissionKey: 'canViewIndicators',
    showWhen: ALL_OPERATIONAL,
    macroFlow: 'planificacion',
    routeSegments: ['indicadores'],
    isNavigable: true,
  },
  {
    phase: 6,
    block: 'A',
    slug: 'metas',
    title: 'Metas del ciclo',
    description: 'Metas visibles y gestionables según el actor funcional.',
    normativaRef: 'RPE 068-2020 Art. 21-25',
    permissionKey: 'canViewGoals',
    showWhen: ALL_OPERATIONAL,
    macroFlow: 'planificacion',
    routeSegments: ['metas'],
    isNavigable: true,
  },
  {
    phase: 7,
    block: 'A',
    slug: 'toma-conocimiento',
    title: 'Notificaciones y consentimientos',
    description: 'Comunicación de metas y registro de conformidad antes del seguimiento.',
    normativaRef: 'RPE 068-2020 Art. 26',
    permissionKey: 'canViewNotifications',
    showWhen: ALL_OPERATIONAL,
    macroFlow: 'planificacion',
    routeSegments: ['notificaciones'],
    isNavigable: true,
  },

  // ── BLOQUE B — Seguimiento ────────────────────────────────────────────────
  {
    phase: 8,
    block: 'B',
    slug: 'seguimiento',
    title: 'Seguimiento periódico',
    description: 'Reuniones y compromisos (mín. 6 meses). Incluye Retroalimentación.',
    normativaRef: 'RPE 068-2020 Art. 26-32',
    permissionKey: 'canViewSeguimiento',
    showWhen: EVALUACION_ACTORS,
    macroFlow: 'seguimiento',
    routeSegments: ['seguimiento'],
    isNavigable: true,
    hasSubmodule: true,
  },
  {
    phase: null,
    block: 'B',
    slug: 'retroalimentacion-nota',
    title: 'Retroalimentación',
    description: 'La retroalimentación es transversal al proceso. Se gestiona dentro del módulo de Seguimiento (Fase 8).',
    normativaRef: 'RPE 068-2020 Art. 33-36',
    permissionKey: 'canViewSeguimiento',
    showWhen: EVALUACION_ACTORS,
    macroFlow: 'seguimiento',
    isNavigable: false,
  },
  {
    phase: 9,
    block: 'B',
    slug: 'oportunidades-mejora',
    title: 'Oportunidades de mejora',
    description: 'Registro, seguimiento y cierre de compromisos de mejora.',
    normativaRef: 'RPE 076-2021 Art. 18-22',
    permissionKey: 'canViewImprovements',
    showWhen: SIN_F9_F11,
    macroFlow: 'seguimiento',
    routeSegments: ['oportunidades-mejora'],
    isNavigable: true,
  },

  // ── BLOQUE C — Evaluación ─────────────────────────────────────────────────
  {
    phase: 10,
    block: 'C',
    slug: 'evaluacion-final',
    title: 'Evaluación final',
    description: 'Calificación consolidada y gestión del cierre evaluativo.',
    normativaRef: 'RPE 068-2020 Art. 37-40',
    permissionKey: 'canViewFinalEvaluations',
    showWhen: EVALUACION_ACTORS,
    macroFlow: 'evaluacion',
    routeSegments: ['evaluacion-final'],
    isNavigable: true,
  },
  {
    phase: 11,
    block: 'C',
    slug: 'documentos',
    title: 'Documentos firmados',
    description: 'Flujo documental y firma según el alcance autorizado.',
    normativaRef: 'RPE 000041-2025/PE',
    permissionKey: 'canViewDocuments',
    showWhen: SIN_F9_F11,
    macroFlow: 'evaluacion',
    routeSegments: ['documentos'],
    isNavigable: true,
  },

  // ── BLOQUE D — Confirmación ───────────────────────────────────────────────
  {
    phase: 12,
    block: 'D',
    slug: 'confirmacion',
    title: 'Confirmación de calificación',
    description: 'Solicitud de confirmación ante el CIE en el plazo normativo.',
    normativaRef: 'RPE 068-2020 Art. 41',
    permissionKey: 'canViewConfirmacion',
    showWhen: EVALUADO_ACTORS,
    macroFlow: 'confirmacion',
    routeSegments: ['confirmacion'],
    isNavigable: true,
  },
  {
    phase: 13,
    block: 'D',
    slug: 'cie-casos',
    title: 'Bandeja de casos CIE',
    description: 'Revisión y resolución de solicitudes de confirmación.',
    normativaRef: 'RPE 068-2020 Art. 44',
    permissionKey: 'canViewCie',
    showWhen: ['ORH', 'CIE', 'TITULAR', 'AUDITOR'],
    macroFlow: 'confirmacion',
    routeSegments: ['cie'],
    isNavigable: true,
  },

  // ── BLOQUE E — Rendimiento distinguido ───────────────────────────────────
  {
    phase: 14,
    block: 'E',
    slug: 'distinguidos-candidatos',
    title: 'Rendimiento distinguido — candidatos',
    description: 'Lista institucional y verificación de requisitos 8.2.',
    normativaRef: 'RPE 000095-2024 Art. 8.2',
    permissionKey: 'canManageDistinguidoRequisites',
    showWhen: [...ORH_ONLY, ...JUNTA_ONLY],
    macroFlow: 'distinguido',
    routeSegments: ['distinguidos-candidatos'],
    isNavigable: true,
  },
  {
    phase: 15,
    block: 'E',
    slug: 'distinguidos-asignacion',
    title: 'Rendimiento distinguido',
    description: 'Decisión dentro del cupo institucional (Junta de Directivos).',
    normativaRef: 'RPE 000095-2024 Art. 9',
    permissionKey: 'canAssignDistinguido',
    showWhen: JUNTA_ONLY,
    macroFlow: 'distinguido',
    routeSegments: ['distinguidos-asignacion'],
    isNavigable: true,
  },

  // ── BLOQUE F — Cierre y reportes ─────────────────────────────────────────
  {
    phase: 16,
    block: 'F',
    slug: 'informe-cierre',
    title: 'Informe de cierre',
    description: 'Consolidación exportable. Plazo normativo: hasta el 31 de mayo.',
    normativaRef: 'RPE 068-2020 Art. 55',
    permissionKey: 'canViewInformeCierre',
    showWhen: ['ORH', 'TITULAR', 'AUDITOR'],
    macroFlow: 'cierre',
    routeSegments: ['informe-cierre'],
    isNavigable: true,
  },
  {
    phase: 17,
    block: 'F',
    slug: 'reportes',
    title: 'Reportes del ciclo',
    description: 'Lectura consolidada y exportación para supervisión institucional.',
    normativaRef: 'RPE 068-2020 Art. 56',
    permissionKey: 'canViewReports',
    showWhen: REPORTES_ACTORS,
    macroFlow: 'transversal',
    routeSegments: ['reportes'],
    isNavigable: true,
  },
  {
    phase: 18,
    block: 'F',
    slug: 'auditoria',
    title: 'Auditoría del ciclo',
    description: 'Eventos críticos para control institucional y revisión de acciones.',
    normativaRef: 'D.L. 1451',
    permissionKey: 'canViewAuditoria',
    showWhen: ['ORH', 'TITULAR', 'AUDITOR'],
    macroFlow: 'transversal',
    routeSegments: ['auditoria'],
    isNavigable: true,
  },

  // ── Admin / ORH institucional (sin número de fase normativa) ──────────────
  {
    phase: null,
    block: 'F',
    slug: 'orh-recepcion',
    title: 'Recepción ORH',
    description: 'Consulta de solicitudes y envíos recibidos para revisión institucional.',
    normativaRef: 'RPE 068-2020 Art. 12',
    permissionKey: 'canViewOrhReception',
    showWhen: ORH_ONLY,
    macroFlow: 'transversal',
    routeSegments: ['orh-recepcion'],
    isNavigable: true,
  },
];

export const BLOCK_LABELS: Record<CardBlock, string> = {
  A: 'Planificación',
  B: 'Seguimiento',
  C: 'Evaluación',
  D: 'Confirmación',
  E: 'Rendimiento distinguido',
  F: 'Cierre y reportes',
};

export const MACRO_FLOW_ORDER: EstadoCiclo[] = [
  'BORRADOR',
  'EN_PLANIFICACION',
  'EN_SEGUIMIENTO',
  'EN_EVALUACION',
  'EN_CONFIRMACION',
  'EN_RENDIMIENTO_DISTINGUIDO',
  'CERRADO',
];
