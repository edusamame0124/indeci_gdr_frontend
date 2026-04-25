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
    const refreshToken = this.sessionSignal()?.refreshToken;
    if (notifyServer && refreshToken) {
      const payload: RefreshTokenRequest = { refreshToken };
      this.http.post<ApiResponse<null>>(`${environment.apiBaseUrl}/auth/logout`, payload).subscribe({
        error: () => undefined
      });
    }
    this.clearSession();
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
