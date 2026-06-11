import { Routes } from '@angular/router';
import { authGuard, featureAccessGuard, publicGuard } from './core/auth/auth.guard';
import { requireCycleGuard } from './core/auth/require-cycle.guard';
import { cycleModuleGuard } from './core/auth/cycle-module.guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { PrivateLayoutComponent } from './layouts/private-layout/private-layout.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { AccessHomeComponent } from './features/auth/pages/access-home/access-home.component';
import { GdrCicloBoardComponent } from './features/gdr/gdr-ciclo-board/gdr-ciclo-board.component';
import { AssignmentListComponent } from './features/hr/pages/assignment-list/assignment-list.component';
import { CatalogsComponent } from './features/admin/pages/catalogs/catalogs.component';
import { InstitutionBrandingComponent } from './features/admin/pages/institution-branding/institution-branding.component';
import { UserManagementComponent } from './features/admin/pages/user-management/user-management.component';
import { ParticipacionGdrComponent } from './features/admin/pages/participacion-gdr/participacion-gdr.component';
import { IndicatorListComponent } from './features/indicators/pages/indicator-list/indicator-list.component';
import { GoalListComponent } from './features/goals/pages/goal-list/goal-list.component';
import { MiGestionGdrComponent } from './features/goals/pages/mi-gestion-gdr/mi-gestion-gdr.component';
import { EvidenceListComponent } from './features/evidences/pages/evidence-list/evidence-list.component';
import { EvidenceDetailComponent } from './features/evidences/pages/evidence-detail/evidence-detail.component';
import { FinalEvaluationListComponent } from './features/final-evaluation/pages/final-evaluation-list/final-evaluation-list.component';
import { FinalEvaluationDetailComponent } from './features/final-evaluation/pages/final-evaluation-detail/final-evaluation-detail.component';
import { DocumentsComponent } from './features/documents/pages/documents/documents.component';
import { SignedDocumentDetailComponent } from './features/documents/pages/signed-document-detail/signed-document-detail.component';
import { ImprovementListComponent } from './features/improvements/pages/improvement-list/improvement-list.component';
import { ImprovementDetailComponent } from './features/improvements/pages/improvement-detail/improvement-detail.component';
import { ReportesComponent } from './features/reportes/pages/reportes/reportes.component';
import { NotificacionesComponent } from './features/notificaciones/pages/notificaciones/notificaciones.component';
import { ConsentimientosComponent } from './features/consentimientos/pages/consentimientos/consentimientos.component';
import { OrhReceptionComponent } from './features/orh/pages/orh-reception/orh-reception.component';
import { OrhDistinguidosCandidatosComponent } from './features/distinguido/pages/orh-distinguidos-candidatos/orh-distinguidos-candidatos.component';
import { JuntaDistinguidosAsignacionComponent } from './features/distinguido/pages/junta-distinguidos-asignacion/junta-distinguidos-asignacion.component';
import { CicloCronogramaComponent } from './features/admin/pages/ciclo-cronograma/ciclo-cronograma.component';
import { SeguimientoGdrComponent } from './features/admin/pages/seguimiento-gdr/seguimiento-gdr.component';
import { ConfirmacionGdrComponent } from './features/gdr/confirmacion/pages/confirmacion-gdr/confirmacion-gdr.component';
import { CieCasosComponent } from './features/gdr/cie/pages/cie-casos/cie-casos.component';
import { CieConformacionComponent } from './features/gdr/cie/pages/cie-conformacion/cie-conformacion.component';
import { InformeCierreComponent } from './features/gdr/informe-cierre/pages/informe-cierre/informe-cierre.component';
import { AuditoriaGdrComponent } from './features/gdr/auditoria/pages/auditoria-gdr/auditoria-gdr.component';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthLayoutComponent,
    canActivate: [publicGuard],
    children: [
      { path: '', component: LoginComponent }
    ]
  },
  {
    path: 'dashboard',
    component: PrivateLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: AccessHomeComponent },

      // ── Rutas con alcance de ciclo (P1) ──────────────────────────────────
      // requireCycleGuard valida el ciclo en backend y puebla CicloNavService.
      // Se salta la llamada si el mismo cicloId ya está validado en el servicio.
      {
        path: 'ciclo/:cicloId',
        canActivate: [requireCycleGuard],
        children: [
          { path: '', component: GdrCicloBoardComponent },

          // Fase 1 — CYCLE-AWARE (usa cicloId explícito en backend)
          {
            path: 'cronograma',
            component: CicloCronogramaComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'cronograma' }
          },

          // Fase 2 — Participación GDR (CYCLE-AWARE via asignaciones por ciclo)
          {
            path: 'participacion-gdr',
            component: ParticipacionGdrComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'participacion' }  // T0-01: canViewParticipacion
          },

          // Fase 3 — Asignaciones (BACKEND-SINGLETON en P1)
          {
            path: 'asignaciones',
            component: AssignmentListComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'assignments' }
          },

          // Fase 4 — Conformación CIE (BACKEND-SINGLETON en P1)
          {
            path: 'cie/conformacion',
            component: CieConformacionComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'cie' }
          },

          // Fase 5 — Indicadores (BACKEND-SINGLETON en P1)
          {
            path: 'indicadores',
            component: IndicatorListComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'indicatorsView' }
          },

          // Fase 6 — Metas (BACKEND-SINGLETON en P1)
          {
            path: 'metas',
            component: GoalListComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'goalsView' }
          },
          {
            path: 'metas/new',
            component: GoalListComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'goalsView', mode: 'create' }
          },
          {
            path: 'metas/:id',
            component: GoalListComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'goalsView', mode: 'edit' }
          },
          {
            path: 'metas/:id/evidencias',
            component: EvidenceListComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'evidencesView' }
          },
          {
            path: 'evidencias/:id',
            component: EvidenceDetailComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'evidencesView' }
          },

          // Fase 7 — Mi gestión GDR (lectura personal — BACKEND-SINGLETON en P1)
          {
            path: 'mi-gestion-gdr',
            component: MiGestionGdrComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'goalsView' }
          },

          // Fase 8 — Seguimiento (CYCLE-AWARE via listarPorCiclo)
          {
            path: 'seguimiento',
            component: SeguimientoGdrComponent,
            canActivate: [featureAccessGuard, cycleModuleGuard],
            data: { feature: 'seguimiento', moduleSlug: 'seguimiento' }
          },

          // Fase 9 — Oportunidades de mejora (BACKEND-SINGLETON en P1)
          {
            path: 'oportunidades-mejora',
            component: ImprovementListComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'improvements' }
          },
          {
            path: 'oportunidades-mejora/:id',
            component: ImprovementDetailComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'improvements' }
          },

          // Fase 10 — Evaluación final (BACKEND-SINGLETON en P1)
          {
            path: 'evaluacion-final',
            component: FinalEvaluationListComponent,
            canActivate: [featureAccessGuard, cycleModuleGuard],
            data: { feature: 'finalEvaluationsView', moduleSlug: 'evaluacion-final' }
          },
          {
            path: 'evaluacion-final/:evaluatedId',
            component: FinalEvaluationDetailComponent,
            canActivate: [featureAccessGuard, cycleModuleGuard],
            data: { feature: 'finalEvaluationsView', moduleSlug: 'evaluacion-final' }
          },

          // Fase 11/16 — Documentos (BACKEND-SINGLETON en P1)
          {
            path: 'documentos',
            component: DocumentsComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'documents' }
          },
          {
            path: 'documentos/firmados/:id',
            component: SignedDocumentDetailComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'documents' }
          },

          // Fase 12 — Confirmación (BACKEND-SINGLETON en P1)
          {
            path: 'confirmacion',
            component: ConfirmacionGdrComponent,
            canActivate: [featureAccessGuard, cycleModuleGuard],
            data: { feature: 'confirmacion', moduleSlug: 'confirmacion' }
          },

          // Fase 13 — Bandeja CIE (BACKEND-SINGLETON en P1)
          {
            path: 'cie',
            component: CieCasosComponent,
            canActivate: [featureAccessGuard, cycleModuleGuard],
            data: { feature: 'cie', moduleSlug: 'cie' }
          },

          // Fase 14/15 — Rendimiento distinguido (BACKEND-SINGLETON en P1)
          {
            path: 'distinguidos-candidatos',
            component: OrhDistinguidosCandidatosComponent,
            canActivate: [featureAccessGuard, cycleModuleGuard],
            data: { feature: 'orhDistinguidosCandidates', moduleSlug: 'distinguido' }
          },
          {
            path: 'distinguidos-asignacion',
            component: JuntaDistinguidosAsignacionComponent,
            canActivate: [featureAccessGuard, cycleModuleGuard],
            data: { feature: 'juntaDistinguidosAssign', moduleSlug: 'distinguido' }
          },

          // Fase 17 — Informe de cierre (BACKEND-SINGLETON en P1)
          {
            path: 'informe-cierre',
            component: InformeCierreComponent,
            canActivate: [featureAccessGuard, cycleModuleGuard],
            data: { feature: 'informeCierre', moduleSlug: 'informe-cierre' }
          },

          // Fase 18 — Reportes y auditoría (BACKEND-SINGLETON en P1)
          {
            path: 'reportes',
            component: ReportesComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'reports' }
          },
          {
            path: 'auditoria',
            component: AuditoriaGdrComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'auditoria' }
          },

          // Bandeja interna — Notificaciones y consentimientos (BACKEND-SINGLETON en P1)
          {
            path: 'notificaciones',
            component: NotificacionesComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'notifications' }
          },
          {
            path: 'consentimientos',
            component: ConsentimientosComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'consents' }
          },

          // ORH — Recepción (BACKEND-SINGLETON en P1)
          {
            path: 'orh-recepcion',
            component: OrhReceptionComponent,
            canActivate: [featureAccessGuard],
            data: { feature: 'orhReception' }
          },
        ]
      },

      // ── Herramientas administrativas no acotadas por ciclo ────────────────
      {
        path: 'admin/catalogs',
        component: CatalogsComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'catalogs' }
      },
      {
        path: 'admin/users',
        component: UserManagementComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'userManagement' }
      },
      {
        path: 'admin/branding',
        component: InstitutionBrandingComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'userManagement' }
      },

      // ── PT-07: Rutas legacy — redirigen al selector de ciclos ─────────────
      { path: 'hr/assignments',                  redirectTo: '/dashboard' },
      { path: 'admin/participacion-gdr',         redirectTo: '/dashboard' },
      { path: 'indicators',                      redirectTo: '/dashboard' },
      { path: 'mi-gestion-gdr',                  redirectTo: '/dashboard' },
      { path: 'goals',                           redirectTo: '/dashboard' },
      { path: 'goals/new',                       redirectTo: '/dashboard' },
      { path: 'goals/:id',                       redirectTo: '/dashboard' },
      { path: 'metas/:id/evidencias',            redirectTo: '/dashboard' },
      { path: 'evidencias/:id',                  redirectTo: '/dashboard' },
      { path: 'evaluacion-final',                redirectTo: '/dashboard' },
      { path: 'evaluacion-final/:evaluatedId',   redirectTo: '/dashboard' },
      { path: 'documentos',                      redirectTo: '/dashboard' },
      { path: 'documentos/firmados/:id',         redirectTo: '/dashboard' },
      { path: 'oportunidades-mejora',            redirectTo: '/dashboard' },
      { path: 'oportunidades-mejora/:id',        redirectTo: '/dashboard' },
      { path: 'reportes',                        redirectTo: '/dashboard' },
      { path: 'notificaciones',                  redirectTo: '/dashboard' },
      { path: 'consentimientos',                 redirectTo: '/dashboard' },
      { path: 'orh/recepcion',                   redirectTo: '/dashboard' },
      { path: 'orh/distinguidos-candidatos',     redirectTo: '/dashboard' },
      { path: 'junta/distinguidos-asignacion',   redirectTo: '/dashboard' },
      { path: 'gdr/cronograma',                  redirectTo: '/dashboard' },
      { path: 'gdr/seguimiento',                 redirectTo: '/dashboard' },
      { path: 'gdr/confirmacion',                redirectTo: '/dashboard' },
      { path: 'gdr/cie',                         redirectTo: '/dashboard' },
      { path: 'gdr/cie/conformacion',            redirectTo: '/dashboard' },
      { path: 'gdr/informe-cierre',              redirectTo: '/dashboard' },
      { path: 'gdr/auditoria',                   redirectTo: '/dashboard' },
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
