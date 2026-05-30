import { AuthService } from './auth.service';

/**
 * SSO Fase 3 — Ingesta del token del SISRH al arrancar GDR.
 *
 * Cuando el usuario entra a GDR desde el Portal Selector del SISRH, llega a
 * `http://localhost:4202/?token=<JWT>`. Este APP_INITIALIZER corre ANTES de la
 * navegación inicial del router: si hay `?token=`, establece la sesión local y
 * reescribe la URL (sin el token) hacia `/dashboard`, de modo que el authGuard
 * ya encuentre sesión y no rebote al login. Una vez en el dashboard,
 * AccessHomeComponent llama `me()` y se hidratan context/featureAccess.
 *
 * Es idempotente y silencioso: si no hay token, no hace nada.
 */
export function createSsoTokenInitializer(auth: AuthService): () => void {
  return () => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (!token) {
      return;
    }

    const established = auth.ingestSsoToken(token);

    // Quita el token de la URL en cualquier caso (no debe quedar en el historial).
    url.searchParams.delete('token');

    let target = url.pathname + url.search + url.hash;
    if (established) {
      // El token SISRH no debe dejar al usuario en el login: aterriza en el panel.
      target = '/dashboard';
    }

    window.history.replaceState({}, '', target);
  };
}
