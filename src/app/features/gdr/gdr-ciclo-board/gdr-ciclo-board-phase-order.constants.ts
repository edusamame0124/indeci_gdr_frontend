/**
 * Orden funcional de las fases del tablero del ciclo GDR.
 *
 * Sustento normativo:
 * - RPE N.° 068-2020-SERVIR-PE — Directiva GDR (planificación, seguimiento, evaluación, retroalimentación).
 * - RPE N.° 076-2021-SERVIR-PE — Guía de implementación por etapas y actores.
 *
 * La Fase 7 (toma de conocimiento) cierra la planificación antes del seguimiento (Fase 8).
 * Este orden es referencia de trazabilidad UI; el template sigue la misma secuencia.
 */
export const GDR_CICLO_BOARD_PHASE_ORDER = [
  { phase: 1, slug: 'apertura', label: 'Fase 1 — Apertura' },
  { phase: 2, slug: 'participacion', label: 'Fase 2 — Participación' },
  { phase: 3, slug: 'asignaciones', label: 'Fase 3 — Asignaciones' },
  { phase: 4, slug: 'cie-conformacion', label: 'Fase 4 — CIE' },
  { phase: 5, slug: 'indicadores', label: 'Fase 5 — Indicadores' },
  { phase: 6, slug: 'metas', label: 'Fase 6 — Metas' },
  { phase: 7, slug: 'toma-conocimiento', label: 'Fase 7 — Toma de conocimiento' },
  { phase: 8, slug: 'seguimiento', label: 'Fase 8 — Seguimiento' },
  { phase: 9, slug: 'mejora', label: 'Fase 9 — Mejora' },
  { phase: 10, slug: 'evaluacion', label: 'Fase 10 — Evaluación' },
  { phase: 11, slug: 'documentos', label: 'Fase 11 — Documentos' },
  { phase: 12, slug: 'confirmacion', label: 'Fase 12 — Confirmación' },
  { phase: 13, slug: 'cie-casos', label: 'Fase 13 — CIE casos' },
  { phase: 14, slug: 'distinguido-candidatos', label: 'Fase 14 — Rendimiento distinguido candidatos' },
  { phase: 15, slug: 'distinguido-asignacion', label: 'Fase 15 — Rendimiento distinguido' },
  { phase: 17, slug: 'cierre', label: 'Fase 17 — Cierre' },
  { phase: 18, slug: 'reportes', label: 'Fase 18 — Reportes / Auditoría' },
] as const;
