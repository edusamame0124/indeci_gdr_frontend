export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
  displayName: string;
  roles: string[];
}

export type ProtectedFeature =
  | 'assignments'
  | 'catalogs'
  | 'indicatorsView'
  | 'indicatorsManage'
  | 'goalsView'
  | 'goalsManage'
  | 'evidencesView'
  | 'finalEvaluationsView'
  | 'documents'
  | 'improvements'
  | 'reports'
  | 'notifications'
  | 'consents'
  | 'orhReception'
  | 'orhDistinguidosCandidates'
  | 'juntaDistinguidosAssign'
  | 'userManagement'
  | 'assignmentManagement'
  | 'participacion'       // T0-01: canViewParticipacion (ORH funcional)
  | 'cronograma'
  | 'cronogramaEdit'
  | 'seguimiento'
  | 'confirmacion'
  | 'cie'
  | 'informeCierre'
  | 'auditoria';

export interface FeatureAccess {
  canAccessDashboard: boolean;
  canViewAssignments: boolean;
  canViewCatalogs: boolean;
  canViewIndicators: boolean;
  canManageIndicators: boolean;
  canViewGoals: boolean;
  canManageGoals: boolean;
  canViewEvidences: boolean;
  canManageEvidences: boolean;
  canReviewEvidences: boolean;
  canViewFinalEvaluations: boolean;
  canManageFinalEvaluations: boolean;
  canViewResults: boolean;
  canViewDocuments: boolean;
  canPrepareDocuments: boolean;
  canStartSignatureFlow: boolean;
  canRegisterSignatureReturn: boolean;
  canRegisterSignedDocuments: boolean;
  canViewImprovements: boolean;
  canManageImprovements: boolean;
  canFollowupImprovements: boolean;
  canViewReports: boolean;
  canViewNotifications: boolean;
  canViewConsents: boolean;
  canViewOrhReception: boolean;
  canManageUsers: boolean;
  canViewDistinguidoCandidates: boolean;
  canManageDistinguidoRequisites: boolean;
  canAssignDistinguido: boolean;
  // T0-01: permisos GDR participación (ORH funcional, no admin técnico)
  canViewParticipacion: boolean;
  canManageParticipacion: boolean;
  // P0/P1: capacidades normativas nuevas (RPE 068-2020)
  canViewCronograma: boolean;
  canEditCronograma: boolean;
  canViewSeguimiento: boolean;
  canRegistrarSeguimiento: boolean;
  canSolicitarConfirmacion: boolean;
  canViewConfirmacion: boolean;
  canViewCie: boolean;
  canResolverCasosCie: boolean;
  canViewInformeCierre: boolean;
  canGenerarInformeCierre: boolean;
  canViewAuditoria: boolean;
}

export interface ActiveCycleContext {
  cycleId: number | null;
  cycleCode: string | null;
  cycleName: string | null;
  contextCode: string | null;
  contextName: string | null;
  cycleActive: boolean;
  assigned: boolean;
  hrPersonLinked: boolean;
  personId: number | null;
  personDocumentNumber: string | null;
  personDisplayName: string | null;
  orgUnitId: number | null;
  orgUnitCode: string | null;
  orgUnitName: string | null;
  functionalActor: string;
  operationalScope: string;
  gdrOperational: boolean;
  estadoEtapa: string | null;
}

export interface UserSessionResponse {
  username: string;
  email: string;
  displayName: string;
  roles: string[];
  context: ActiveCycleContext;
  featureAccess: FeatureAccess;
}

export interface UserSession {
  username: string;
  email: string | null;
  displayName: string;
  roles: string[];
  context: ActiveCycleContext | null;
  featureAccess: FeatureAccess | null;
  accessToken: string;
  refreshToken: string;
  rememberDevice: boolean;
}
