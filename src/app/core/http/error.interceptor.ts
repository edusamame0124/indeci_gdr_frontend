import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

const fallbackMessage = 'No fue posible completar la solicitud.';

export const errorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const apiMessage =
          typeof error.error === 'object' && error.error
            ? (error.error.message as string | undefined)
            : undefined;
        return throwError(() => new Error(apiMessage ?? fallbackMessage));
      }
      return throwError(() => (error instanceof Error ? error : new Error(fallbackMessage)));
    })
  );
