import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { ProtectedFeature } from './auth.models';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

export const featureAccessGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const feature = route.data['feature'] as ProtectedFeature | undefined;

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (!feature || authService.canAccessFeature(feature)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
