import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

const fallbackMessage = 'No fue posible completar la solicitud.';

function pickStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function extractHttpErrorMessage(error: HttpErrorResponse): string {
  const body = error.error;

  if (typeof body === 'string') {
    const stripped = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (stripped.length > 0 && stripped.length < 400) {
      return stripped;
    }
  }

  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    const direct =
      pickStringField(record, 'message') ??
      pickStringField(record, 'detail') ??
      pickStringField(record, 'error_description') ??
      pickStringField(record, 'title');
    if (direct) {
      return direct;
    }
    const errField = pickStringField(record, 'error');
    if (errField) {
      return errField;
    }
  }

  if (error.status === 403) {
    return 'No tiene permiso para esta operacion (403).';
  }
  if (error.status === 401) {
    return 'Sesion expirada o no autenticado (401).';
  }

  const fromStatus = error.statusText?.trim();
  return fromStatus && fromStatus !== 'Unknown Error' ? fromStatus : fallbackMessage;
}

export const errorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        return throwError(() => new Error(extractHttpErrorMessage(error)));
      }
      return throwError(() => (error instanceof Error ? error : new Error(fallbackMessage)));
    })
  );
