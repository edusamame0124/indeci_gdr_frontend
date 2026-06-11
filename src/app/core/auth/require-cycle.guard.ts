import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { CicloNavService } from '../gdr/ciclo-nav.service';
import { CycleValidateService } from '../gdr/cycle-validate.service';

const AVISO_SIN_PARTICIPACION =
  'No tiene participación activa en este ciclo. Contacte a ORH para registrar su asignación en Participación GDR.';

export const requireCycleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const cycleValidateService = inject(CycleValidateService);
  const cicloNavService = inject(CicloNavService);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const raw = route.paramMap.get('cicloId');
  const cicloId = Number(raw);

  if (!raw || !Number.isInteger(cicloId) || cicloId <= 0) {
    router.navigate(['/dashboard'], {
      queryParams: { aviso: 'Debe seleccionar un ciclo GDR para continuar.' }
    });
    return false;
  }

  const featureAccess = authService.featureAccess();
  if (featureAccess && !featureAccess.canViewCronograma) {
    router.navigate(['/dashboard'], {
      queryParams: { aviso: AVISO_SIN_PARTICIPACION }
    });
    return false;
  }

  // Skip backend call if the same cycle is already validated in the service
  if (cicloNavService.cicloId() === cicloId) {
    return true;
  }

  cicloNavService.setLoading(true);

  return cycleValidateService.validateAccess(cicloId).pipe(
    map((response) => {
      cicloNavService.setCiclo(response);
      cicloNavService.setLoading(false);
      return true;
    }),
    catchError(() => {
      cicloNavService.setLoading(false);
      cicloNavService.clear();
      router.navigate(['/dashboard'], {
        queryParams: { aviso: AVISO_SIN_PARTICIPACION }
      });
      return of(false);
    })
  );
};
