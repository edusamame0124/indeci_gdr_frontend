import { Routes } from '@angular/router';
import { authGuard, featureAccessGuard, publicGuard } from './core/auth/auth.guard';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { PrivateLayoutComponent } from './layouts/private-layout/private-layout.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { AccessHomeComponent } from './features/auth/pages/access-home/access-home.component';
import { AssignmentListComponent } from './features/hr/pages/assignment-list/assignment-list.component';
import { CatalogsComponent } from './features/admin/pages/catalogs/catalogs.component';
import { IndicatorListComponent } from './features/indicators/pages/indicator-list/indicator-list.component';
import { GoalListComponent } from './features/goals/pages/goal-list/goal-list.component';
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
        path: 'indicators',
        component: IndicatorListComponent,
        canActivate: [featureAccessGuard],
        data: { feature: 'indicatorsView' }
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
      }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
