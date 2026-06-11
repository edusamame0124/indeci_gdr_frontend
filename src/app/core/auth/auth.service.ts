import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  ActiveCycleContext,
  FeatureAccess,
  LoginRequest,
  ProtectedFeature,
  RefreshTokenRequest,
  TokenResponse,
  UserSession,
  UserSessionResponse
} from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionSignal = signal<UserSession | null>(this.restoreSession());

  readonly currentUser = this.sessionSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly roles = computed(() => this.sessionSignal()?.roles ?? []);
  readonly currentContext = computed<ActiveCycleContext | null>(() => this.sessionSignal()?.context ?? null);
  readonly featureAccess = computed<FeatureAccess | null>(() => this.sessionSignal()?.featureAccess ?? null);

  login(loginId: string, password: string, rememberDevice: boolean): Observable<TokenResponse> {
    const payload: LoginRequest = { loginId, password };
    return this.http.post<ApiResponse<TokenResponse>>(`${environment.apiBaseUrl}/auth/login`, payload).pipe(
      map((response) => response.data),
      tap((response) => this.applyTokenResponse(response, rememberDevice))
    );
  }

  refreshToken(): Observable<TokenResponse> {
    const refreshToken = this.sessionSignal()?.refreshToken;
    if (!refreshToken) {
      throw new Error('No existe refresh token disponible.');
    }
    const payload: RefreshTokenRequest = { refreshToken };
    return this.http.post<ApiResponse<TokenResponse>>(`${environment.apiBaseUrl}/auth/refresh`, payload).pipe(
      map((response) => response.data),
      tap((response) => this.applyTokenResponse(response, this.sessionSignal()?.rememberDevice ?? false))
    );
  }

  logout(notifyServer = true): void {
    const session = this.sessionSignal();
    const refreshToken = session?.refreshToken;
    const isSsoSession = !!session?.accessToken && !refreshToken;

    if (notifyServer && refreshToken) {
      const payload: RefreshTokenRequest = { refreshToken };
      this.http.post<ApiResponse<null>>(`${environment.apiBaseUrl}/auth/logout`, payload).subscribe({
        error: () => undefined
      });
    }
    this.clearSession();

    if (isSsoSession && environment.sisrhPortalUrl) {
      const base = environment.sisrhPortalUrl.replace(/\/$/, '');
      window.location.assign(`${base}/auth/seleccionar-sistema`);
      return;
    }

    this.router.navigate(['/login']);
  }

  me(): Observable<UserSessionResponse> {
    return this.http.get<ApiResponse<UserSessionResponse>>(`${environment.apiBaseUrl}/auth/me`).pipe(
      map((response) => response.data),
      tap((profile) => this.mergeProfile(profile))
    );
  }

  getAccessToken(): string | null {
    return this.sessionSignal()?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.sessionSignal()?.refreshToken ?? null;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.roles().includes(role));
  }

  hasTechnicalRole(role: string): boolean {
    return this.roles().includes(role);
  }

  canAccessFeature(feature: ProtectedFeature): boolean {
    const access = this.featureAccess();
    if (!access) {
      return false;
    }

    switch (feature) {
      case 'assignments':
        return access.canViewAssignments;
      case 'catalogs':
        return access.canViewCatalogs;
      case 'indicatorsView':
        return access.canViewIndicators;
      case 'indicatorsManage':
        return access.canManageIndicators;
      case 'goalsView':
        return access.canViewGoals;
      case 'goalsManage':
        return access.canManageGoals;
      case 'evidencesView':
        return access.canViewEvidences;
      case 'finalEvaluationsView':
        return access.canViewFinalEvaluations;
      case 'documents':
        return access.canViewDocuments;
      case 'improvements':
        return access.canViewImprovements;
      case 'reports':
        return access.canViewReports;
      case 'notifications':
        return access.canViewNotifications;
      case 'consents':
        return access.canViewConsents;
      case 'orhReception':
        return access.canViewOrhReception;
      case 'orhDistinguidosCandidates':
        return access.canViewDistinguidoCandidates && access.canManageDistinguidoRequisites;
      case 'juntaDistinguidosAssign':
        return access.canAssignDistinguido && access.canViewDistinguidoCandidates;
      case 'userManagement':
        return access.canManageUsers;
      case 'assignmentManagement':
        return access.canEditCronograma;
      case 'participacion':
        return access.canViewParticipacion;
      case 'cronograma':
        return access.canViewCronograma;
      case 'cronogramaEdit':
        return access.canEditCronograma;
      case 'seguimiento':
        return access.canViewSeguimiento;
      case 'confirmacion':
        return access.canViewConfirmacion;
      case 'cie':
        return access.canViewCie;
      case 'informeCierre':
        return access.canViewInformeCierre;
      case 'auditoria':
        return access.canViewAuditoria;
      default:
        return false;
    }
  }

  isHrPersonLinked(): boolean {
    return this.currentContext()?.hrPersonLinked ?? false;
  }

  functionalActor(): string {
    return this.currentContext()?.functionalActor ?? 'SIN_ROL_FUNCIONAL_GDR';
  }

  operationalScope(): string {
    return this.currentContext()?.operationalScope ?? 'SIN_ACCESO_GDR';
  }

  redirectAfterLogin(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * SSO Fase 3 — Ingiere el token del SISRH al entrar a GDR desde el Portal
   * Selector (`/?token=<JWT>`). Decodifica el payload (sub + sistemas.rendimiento)
   * y establece una sesión mínima con el token como accessToken; el resto del
   * perfil (context/featureAccess) lo hidrata `me()` al cargar el dashboard.
   * Devuelve true si estableció la sesión.
   */
  ingestSsoToken(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    const subject = payload?.['sub'];
    if (!payload || typeof subject !== 'string' || subject.length === 0) {
      return false;
    }
    const sistemas = payload['sistemas'] as Record<string, unknown> | undefined;
    const rendimiento = sistemas?.['rendimiento'];
    const roles = Array.isArray(rendimiento) ? rendimiento.map((r) => String(r)) : [];

    const session: UserSession = {
      username: subject,
      email: null,
      displayName: subject,
      roles,
      context: null,
      featureAccess: null,
      accessToken: token,
      refreshToken: '',
      rememberDevice: false
    };
    this.persistSession(session);
    return true;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private applyTokenResponse(tokenResponse: TokenResponse, rememberDevice: boolean): void {
    const current = this.sessionSignal();
    const nextSession: UserSession = {
      username: tokenResponse.username,
      email: current?.email ?? null,
      displayName: tokenResponse.displayName,
      roles: tokenResponse.roles,
      context: current?.context ?? null,
      featureAccess: current?.featureAccess ?? null,
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      rememberDevice
    };
    this.persistSession(nextSession);
  }

  private mergeProfile(profile: UserSessionResponse): void {
    const current = this.sessionSignal();
    if (!current) {
      return;
    }
    const merged: UserSession = {
      ...current,
      username: profile.username,
      email: profile.email,
      displayName: profile.displayName,
      roles: profile.roles,
      context: profile.context,
      featureAccess: profile.featureAccess
    };
    this.persistSession(merged);
  }

  private persistSession(session: UserSession): void {
    this.sessionSignal.set(session);
    const serialized = JSON.stringify(session);
    if (session.rememberDevice) {
      localStorage.setItem(environment.localStorageKey, serialized);
      sessionStorage.removeItem(environment.sessionStorageKey);
    } else {
      sessionStorage.setItem(environment.sessionStorageKey, serialized);
      localStorage.removeItem(environment.localStorageKey);
    }
  }

  private clearSession(): void {
    this.sessionSignal.set(null);
    sessionStorage.removeItem(environment.sessionStorageKey);
    localStorage.removeItem(environment.localStorageKey);
  }

  private restoreSession(): UserSession | null {
    const persisted =
      localStorage.getItem(environment.localStorageKey) ??
      sessionStorage.getItem(environment.sessionStorageKey);
    if (!persisted) {
      return null;
    }
    try {
      return JSON.parse(persisted) as UserSession;
    } catch {
      return null;
    }
  }
}
