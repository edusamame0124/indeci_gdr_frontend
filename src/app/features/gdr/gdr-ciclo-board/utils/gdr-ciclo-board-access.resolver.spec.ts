import { describe, expect, it } from 'vitest';
import { resolveGdrBoardCards, CicloBoardContext } from './gdr-ciclo-board-access.resolver';
import { FeatureAccess } from '../../../../core/auth/auth.models';

function fullAccess(): FeatureAccess {
  return {
    canAccessDashboard: true,
    canViewAssignments: true,
    canViewCatalogs: true,
    canViewIndicators: true,
    canManageIndicators: true,
    canViewGoals: true,
    canManageGoals: true,
    canViewEvidences: true,
    canManageEvidences: true,
    canReviewEvidences: true,
    canViewFinalEvaluations: true,
    canManageFinalEvaluations: true,
    canViewResults: true,
    canViewDocuments: true,
    canPrepareDocuments: true,
    canStartSignatureFlow: true,
    canRegisterSignatureReturn: true,
    canRegisterSignedDocuments: true,
    canViewImprovements: true,
    canManageImprovements: true,
    canFollowupImprovements: true,
    canViewReports: true,
    canViewNotifications: true,
    canViewConsents: true,
    canViewOrhReception: true,
    canManageUsers: false,
    canViewParticipacion: true,
    canManageParticipacion: true,
    canViewDistinguidoCandidates: true,
    canManageDistinguidoRequisites: true,
    canAssignDistinguido: false,
    canViewCronograma: true,
    canEditCronograma: true,
    canViewSeguimiento: true,
    canRegistrarSeguimiento: true,
    canSolicitarConfirmacion: true,
    canViewConfirmacion: true,
    canViewCie: true,
    canResolverCasosCie: true,
    canViewInformeCierre: true,
    canGenerarInformeCierre: true,
    canViewAuditoria: true,
  };
}

function noContext(): CicloBoardContext {
  return {
    canAdvanceToSeguimiento: false,
    hasExcepcionEdicion: false,
    planificacionCompletadaEn: null,
    planificacionCompletadaPor: null,
    cronogramaCompleto: false,
    participantesRegistrados: false,
    asignacionesCompletas: false,
    cieAplica: false,
    cieConfigurado: false,
    indicadoresHabilitados: false,
    metasFormalizadas100: false,
    notificacionesTomaConocimiento: false,
  };
}

function card(slug: string, cards: ReturnType<typeof resolveGdrBoardCards>) {
  return cards.find((c) => c.entry.slug === slug);
}

describe('resolveGdrBoardCards', () => {
  it('F8 seguimiento → PROXIMA_FASE cuando etapa es EN_PLANIFICACION', () => {
    const cards = resolveGdrBoardCards('EN_PLANIFICACION', 'ORH', fullAccess(), noContext());
    const f8 = card('seguimiento', cards);
    expect(f8?.state).toBe('PROXIMA_FASE');
    expect(f8?.isNavigable).toBe(false);
  });

  it('F17 reportes → DISPONIBLE en EN_PLANIFICACION (transversal, nunca bloqueado)', () => {
    const cards = resolveGdrBoardCards('EN_PLANIFICACION', 'ORH', fullAccess(), noContext());
    const f17 = card('reportes', cards);
    expect(f17?.state).toBe('DISPONIBLE');
    expect(f17?.isNavigable).toBe(true);
  });

  it('F2 participacion → NO_APLICA para actor EVALUADOR (no está en showWhen)', () => {
    const access = { ...fullAccess(), canViewParticipacion: true };
    const cards = resolveGdrBoardCards('EN_PLANIFICACION', 'EVALUADOR', access, noContext());
    const f2 = card('participacion-gdr', cards);
    expect(f2?.state).toBe('NO_APLICA');
    expect(f2?.blockReasonCode).toBe('NO_APLICA_ROL');
  });

  it('F9 oportunidades → NO_APLICA para actor EVALUADOR puro (showWhen excluye EVALUADOR)', () => {
    const cards = resolveGdrBoardCards('EN_SEGUIMIENTO', 'EVALUADOR', fullAccess(), noContext());
    const f9 = card('oportunidades-mejora', cards);
    expect(f9?.state).toBe('NO_APLICA');
  });

  it('F1 cronograma → SOLO_LECTURA en EN_SEGUIMIENTO sin excepción (D-02)', () => {
    const ctx = { ...noContext(), hasExcepcionEdicion: false };
    const cards = resolveGdrBoardCards('EN_SEGUIMIENTO', 'ORH', fullAccess(), ctx);
    const f1 = card('cronograma', cards);
    expect(f1?.state).toBe('SOLO_LECTURA');
    expect(f1?.isNavigable).toBe(true);
  });

  it('F6 metas → ACTIVO en EN_SEGUIMIENTO con permiso excepcional (D-02)', () => {
    const ctx = { ...noContext(), hasExcepcionEdicion: true };
    const cards = resolveGdrBoardCards('EN_SEGUIMIENTO', 'ORH', fullAccess(), ctx);
    const f6 = card('metas', cards);
    expect(f6?.state).toBe('ACTIVO');
  });

  it('F12 confirmacion → PENDIENTE_REQUISITOS en EN_EVALUACION', () => {
    const cards = resolveGdrBoardCards('EN_EVALUACION', 'ORH', fullAccess(), noContext());
    const f12 = card('confirmacion', cards);
    expect(f12?.state).toBe('PENDIENTE_REQUISITOS');
    expect(f12?.isNavigable).toBe(false);
  });

  it('Ciclo CERRADO: todos los módulos operativos son SOLO_LECTURA excepto F16 informe (ACTIVO)', () => {
    const cards = resolveGdrBoardCards('CERRADO', 'ORH', fullAccess(), noContext());
    const f1 = card('cronograma', cards);
    const f8 = card('seguimiento', cards);
    const f16 = card('informe-cierre', cards);
    expect(f1?.state).toBe('SOLO_LECTURA');
    expect(f8?.state).toBe('SOLO_LECTURA');
    expect(f16?.state).toBe('ACTIVO');
  });

  it('Sin featureAccess → todos los cards son NO_APLICA', () => {
    const cards = resolveGdrBoardCards('EN_PLANIFICACION', 'ORH', null, null);
    expect(cards.every((c) => c.state === 'NO_APLICA')).toBe(true);
  });
});
