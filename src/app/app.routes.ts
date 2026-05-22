import { Routes } from '@angular/router';
import { authGuard, featureAccessGuard, publicGuard } from './core/auth/auth.guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { PrivateLayoutComponent } from './layouts/private-layout/private-layout.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { AccessHomeComponent } from './features/auth/pages/access-home/access-home.component';
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
      {
        path: 'hr/assignments',
        component: AssignmentListComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'assignments' }
      },
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
      {
        path: 'admin/participacion-gdr',
        component: ParticipacionGdrComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'assignmentManagement' }
      },
      {
        path: 'indicators',
        component: IndicatorListComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'indicatorsView' }
      },
      {
        path: 'mi-gestion-gdr',
        component: MiGestionGdrComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'goalsView' }
      },
      {
        path: 'goals',
        component: GoalListComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'goalsView' }
      },
      {
        path: 'goals/new',
        component: GoalListComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'goalsView', mode: 'create' }
      },
      {
        path: 'goals/:id',
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
      {
        path: 'evaluacion-final',
        component: FinalEvaluationListComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'finalEvaluationsView' }
      },
      {
        path: 'evaluacion-final/:evaluatedId',
        component: FinalEvaluationDetailComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'finalEvaluationsView' }
      },
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
      {
        path: 'reportes',
        component: ReportesComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'reports' }
      },
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
      {
        path: 'orh/recepcion',
        component: OrhReceptionComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'orhReception' }
      },
      {
        path: 'orh/distinguidos-candidatos',
        component: OrhDistinguidosCandidatosComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'orhDistinguidosCandidates' }
      },
      {
        path: 'junta/distinguidos-asignacion',
        component: JuntaDistinguidosAsignacionComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'juntaDistinguidosAssign' }
      }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
