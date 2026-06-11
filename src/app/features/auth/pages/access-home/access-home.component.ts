import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { CyclesService } from '../../../../core/admin/cycles.service';
import { CycleOptionResponse } from '../../../../core/admin/cycles.models';
import { UserSessionResponse } from '../../../../core/auth/auth.models';
import { isInstitutionalFunctionalActor } from '../../../../shared/utils/functional-actor-label.util';

const SIN_ROL_FUNCIONAL_GDR = 'SIN_ROL_FUNCIONAL_GDR';

@Component({
  selector: 'app-access-home',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-home.component.html',
  styleUrl: './access-home.component.css',
})
export class AccessHomeComponent {
  private readonly authService = inject(AuthService);
  private readonly cyclesService = inject(CyclesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly profile = signal<UserSessionResponse | null>(null);
  readonly errorMessage = signal('');
  readonly adminCiclos = signal<CycleOptionResponse[]>([]);
  readonly loadingCiclos = signal(false);
  readonly aviso = signal<string | null>(null);

  readonly esAdmin = computed(() => !!this.profile()?.featureAccess.canManageUsers);

  readonly tieneRolGdr = computed(() =>
    !!this.profile()?.roles.some((r) => r.startsWith('ROLE_GDR_'))
  );

  readonly tieneHerramientasAdmin = computed(() =>
    !!this.profile()?.featureAccess.canManageUsers
  );

  readonly puedeCrearCiclo = computed(() =>
    !!this.profile()?.featureAccess.canEditCronograma
  );

  readonly puedeAccederCiclo = computed(() =>
    !!this.profile()?.featureAccess.canViewCronograma
  );

  readonly avisoCicloBloqueado = computed(() =>
    'No tiene participación activa en este ciclo. Solicite a ORH su registro en Participación GDR.'
  );

  readonly createCycleModalOpen = signal(false);
  readonly createCycleSubmitting = signal(false);
  readonly createCycleError = signal('');
  readonly createCycleCode = signal('');
  readonly createCycleName = signal('');
  readonly createCycleStartDate = signal('');
  readonly createCycleEndDate = signal('');

  readonly canSubmitCreateCycle = computed(() => {
    const code = this.createCycleCode().trim();
    const name = this.createCycleName().trim();
    return code.length > 0
      && name.length > 0
      && this.createCycleStartDate().length > 0
      && this.createCycleEndDate().length > 0
      && !this.createCycleSubmitting();
  });

  readonly ciclosDeSesion = computed((): CycleOptionResponse[] => {
    const ctx = this.profile()?.context;
    if (!ctx?.cycleId) return [];
    return [{
      id: ctx.cycleId,
      code: ctx.cycleCode ?? '',
      name: ctx.cycleName ?? '—',
      status: ctx.estadoEtapa ?? '',
      startDate: null,
      endDate: null,
      active: ctx.cycleActive,
    }];
  });

  readonly ciclosParaMostrar = computed(() => {
    if (this.esAdmin() || this.puedeCrearCiclo()) {
      const admin = this.adminCiclos();
      return admin.length > 0 ? admin : this.ciclosDeSesion();
    }
    return this.ciclosDeSesion();
  });

  readonly notices = computed(() => {
    const profile = this.profile();
    if (!profile) return [];
    const messages: string[] = [];
    if (!profile.context.hrPersonLinked && this.tieneRolGdr()) {
      messages.push('Su usuario tiene rol GDR, pero todavia no esta vinculado a una persona HR. Solicite regularizacion a administracion.');
    }
    if (this.tieneRolGdr() && !profile.context.cycleActive && !this.esAdmin()) {
      messages.push('No existe un ciclo GDR activo configurado para su usuario.');
    }
    if (
      profile.context.cycleActive
      && !profile.context.assigned
      && profile.context.gdrOperational
      && !isInstitutionalFunctionalActor(profile.context.functionalActor)
    ) {
      messages.push('Tiene identidad laboral vinculada, pero aun no cuenta con asignacion de contexto explicita para este ciclo.');
    }
    if (
      profile.context.functionalActor === SIN_ROL_FUNCIONAL_GDR
      && profile.context.hrPersonLinked
      && profile.context.cycleActive
      && this.tieneRolGdr()
      && !profile.featureAccess.canViewCronograma
    ) {
      messages.push(
        'Tiene rol GDR y ciclo activo, pero aun no tiene asignacion de participacion (evaluador/evaluado). '
        + 'Solicite a ORH que lo registre en Participacion GDR.'
      );
    }
    return messages;
  });

  constructor() {
    const avisoParam = this.route.snapshot.queryParamMap.get('aviso');
    if (avisoParam) this.aviso.set(avisoParam);

    this.authService.me().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        if (profile.featureAccess.canManageUsers || profile.featureAccess.canEditCronograma) {
          this.loadAdminCiclos();
        }
      },
      error: (error: Error) => this.errorMessage.set(error.message),
    });
  }

  navigateToCiclo(cicloId: number): void {
    if (!this.puedeAccederCiclo()) {
      return;
    }
    this.router.navigate(['/dashboard/ciclo', cicloId]);
  }

  openCreateCycleModal(): void {
    this.createCycleError.set('');
    const year = new Date().getFullYear();
    this.createCycleCode.set(String(year + 1));
    this.createCycleName.set(`Ciclo ${year + 1}`);
    this.createCycleStartDate.set(`${year + 1}-01-01`);
    this.createCycleEndDate.set(`${year + 1}-12-31`);
    this.createCycleModalOpen.set(true);
  }

  closeCreateCycleModal(): void {
    if (this.createCycleSubmitting()) {
      return;
    }
    this.createCycleModalOpen.set(false);
    this.createCycleError.set('');
  }

  onCreateCycleField(event: Event, field: 'code' | 'name' | 'startDate' | 'endDate'): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'code':
        this.createCycleCode.set(value);
        break;
      case 'name':
        this.createCycleName.set(value);
        break;
      case 'startDate':
        this.createCycleStartDate.set(value);
        break;
      case 'endDate':
        this.createCycleEndDate.set(value);
        break;
    }
  }

  submitCreateCycle(event: Event): void {
    event.preventDefault();
    if (!this.canSubmitCreateCycle()) {
      return;
    }
    this.createCycleSubmitting.set(true);
    this.createCycleError.set('');
    this.cyclesService.create({
      code: this.createCycleCode().trim(),
      name: this.createCycleName().trim(),
      startDate: this.createCycleStartDate(),
      endDate: this.createCycleEndDate(),
    }).subscribe({
      next: (created) => {
        this.createCycleSubmitting.set(false);
        this.createCycleModalOpen.set(false);
        this.loadAdminCiclos();
        this.authService.me().subscribe({
          next: (profile) => this.profile.set(profile),
        });
        this.router.navigate(['/dashboard/ciclo', created.id, 'cronograma']);
      },
      error: (error: Error) => {
        this.createCycleSubmitting.set(false);
        this.createCycleError.set(error.message || 'No se pudo crear el ciclo GDR.');
      },
    });
  }

  estadoEtapaLabel(status: string): string {
    const MAP: Record<string, string> = {
      BORRADOR: 'Borrador',
      EN_PLANIFICACION: 'En planificación',
      EN_SEGUIMIENTO: 'En seguimiento',
      EN_EVALUACION: 'En evaluación',
      EN_CONFIRMACION: 'En confirmación',
      EN_RENDIMIENTO_DISTINGUIDO: 'Rendimiento distinguido',
      EN_CIERRE: 'En cierre',
      CERRADO: 'Cerrado',
      ANULADO: 'Anulado',
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
    };
    return MAP[status] ?? status;
  }

  private loadAdminCiclos(): void {
    this.loadingCiclos.set(true);
    this.cyclesService.listAll().subscribe({
      next: (ciclos) => {
        this.adminCiclos.set(ciclos);
        this.loadingCiclos.set(false);
      },
      error: () => this.loadingCiclos.set(false),
    });
  }
}
