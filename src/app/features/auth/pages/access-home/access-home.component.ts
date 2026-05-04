import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserSessionResponse } from '../../../../core/auth/auth.models';

@Component({
  selector: 'app-access-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './access-home.component.html',
  styleUrl: './access-home.component.css'
})
export class AccessHomeComponent {
  private readonly authService = inject(AuthService);

  readonly profile = signal<UserSessionResponse | null>(null);
  readonly errorMessage = signal('');
  readonly notices = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }

    const messages: string[] = [];
    if (!profile.context.hrPersonLinked && profile.roles.some((role) => role.startsWith('ROLE_GDR_'))) {
      messages.push('Su usuario tiene rol GDR, pero todavia no esta vinculado a una persona HR. Solicite regularizacion a administracion.');
    }
    if (!profile.context.cycleActive) {
      messages.push('No existe un ciclo activo configurado para operar modulos GDR.');
    }
    if (profile.context.cycleActive && !profile.context.assigned && profile.context.gdrOperational) {
      messages.push('Tiene identidad laboral vinculada, pero aun no cuenta con asignacion de contexto explicita para este ciclo.');
    }
    return messages;
  });
  /**
   * UI: el panel no muestra Lote 4 documental / mejora al actor funcional EVALUADOR puro
   * (rutas y permisos backend no cambian).
   */
  readonly hideLote4DashboardCards = computed(
    () => this.profile()?.context.functionalActor === 'EVALUADOR'
  );

  readonly hasVisibleModules = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return false;
    }
    const access = profile.featureAccess;
    const hideLote4 = this.hideLote4DashboardCards();
    const documentsVisible = access.canViewDocuments && !hideLote4;
    const improvementsVisible = access.canViewImprovements && !hideLote4;
    return access.canViewAssignments
      || access.canViewIndicators
      || access.canViewGoals
      || access.canViewFinalEvaluations
      || documentsVisible
      || improvementsVisible
      || access.canViewReports
      || access.canViewNotifications
      || access.canViewConsents
      || access.canViewOrhReception
      || access.canManageUsers
      || access.canManageDistinguidoRequisites
      || access.canAssignDistinguido;
  });

  constructor() {
    this.authService.me().subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  documentsQueryParams(): Record<string, number> | null {
    return this.ownEvaluatedQueryParams();
  }

  improvementsQueryParams(): Record<string, number> | null {
    return this.ownEvaluatedQueryParams();
  }

  private ownEvaluatedQueryParams(): Record<string, number> | null {
    const profile = this.profile();
    if (!profile || profile.context.functionalActor !== 'EVALUADO' || !profile.context.personId) {
      return null;
    }
    return { evaluatedId: profile.context.personId };
  }
}
