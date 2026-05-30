import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { errorInterceptor } from './core/http/error.interceptor';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { createSsoTokenInitializer } from './core/auth/sso-token.initializer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    // SSO Fase 3 — ingiere el ?token= del SISRH antes de la navegación inicial,
    // para que el authGuard ya encuentre sesión (debe correr antes del router).
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthService],
      useFactory: createSsoTokenInitializer
    }
  ]
};
