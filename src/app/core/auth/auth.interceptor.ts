import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const isPublicRequest = (url: string): boolean =>
  url.startsWith(`${environment.apiBaseUrl}/auth/login`) ||
  url.startsWith(`${environment.apiBaseUrl}/auth/refresh`) ||
  url.startsWith(`${environment.apiBaseUrl}/public/branding/`);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const authRequest =
    token && !isPublicRequest(request.url)
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.startsWith(`${environment.apiBaseUrl}/auth/login`) &&
        !request.url.startsWith(`${environment.apiBaseUrl}/auth/refresh`) &&
        authService.getRefreshToken()
      ) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            const refreshedToken = authService.getAccessToken();
            const retryRequest = refreshedToken
              ? request.clone({ setHeaders: { Authorization: `Bearer ${refreshedToken}` } })
              : request;
            return next(retryRequest);
          }),
          catchError((refreshError) => {
            authService.logout(false);
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
