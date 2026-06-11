import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BrandingService } from '../../core/branding/branding.service';
import { CicloNavService } from '../../core/gdr/ciclo-nav.service';
import { UiToastComponent } from '../../shared/ui/ui-toast.component';
import { functionalActorLabel } from '../../shared/utils/functional-actor-label.util';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, UiToastComponent],
  host: { class: 'private-layout-host' },
  templateUrl: './private-layout.component.html',
  styleUrl: './private-layout.component.css'
})
export class PrivateLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly brandingService = inject(BrandingService);
  private readonly cicloNavService = inject(CicloNavService);

  readonly branding = this.brandingService.branding;
  readonly brandingLoading = this.brandingService.loading;
  readonly headerLogoFailed = signal(false);
  readonly currentUser = this.authService.currentUser;
  readonly displayName = computed(() => this.currentUser()?.displayName ?? '');
  readonly userIdentifier = computed(() => {
    const username = this.currentUser()?.username ?? '';
    const contextName = this.currentUser()?.context?.contextName ?? '';
    if (!username) {
      return contextName || 'Sesion activa';
    }
    return contextName ? `${username} - ${contextName}` : username;
  });

  readonly activeCycleName = computed(() =>
    this.cicloNavService.ciclo()?.name
    ?? this.currentUser()?.context?.cycleName
    ?? ''
  );

  readonly actorLabel = computed(() =>
    functionalActorLabel(this.currentUser()?.context?.functionalActor)
  );
  readonly unitLabel = computed(() => this.currentUser()?.context?.orgUnitName ?? '');

  readonly estadoEtapaRaw = computed(() =>
    this.cicloNavService.ciclo()?.estadoEtapa
    ?? this.currentUser()?.context?.estadoEtapa
    ?? ''
  );

  readonly estadoEtapaLabel = computed(() => {
    const ciclo = this.cicloNavService.ciclo();
    if (ciclo) {
      const etapa = ciclo.estadoEtapa;
      if (!etapa || etapa === 'BORRADOR') return '';
      return ciclo.estadoEtapaLabel || etapa;
    }
    const etapa = this.currentUser()?.context?.estadoEtapa ?? '';
    if (!etapa || etapa === 'BORRADOR') return '';
    const LABELS: Record<string, string> = {
      EN_PLANIFICACION: 'En planificación',
      EN_SEGUIMIENTO: 'En seguimiento',
      EN_EVALUACION: 'En evaluación',
      EN_CONFIRMACION: 'En confirmación de calificación',
      EN_RENDIMIENTO_DISTINGUIDO: 'Rendimiento distinguido',
      CERRADO: 'Cerrado',
      ANULADO: 'Anulado',
    };
    return LABELS[etapa] ?? etapa;
  });

  readonly userInitials = computed(() => {
    const name = this.displayName().trim();
    if (!name) {
      return 'U';
    }
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  readonly brandingInitials = computed(() => {
    const name = this.branding()?.institutionName?.trim();
    if (!name) {
      return '';
    }
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  constructor() {
    this.brandingService.ensureLoaded();
  }

  logout(): void {
    this.authService.logout();
  }
}
