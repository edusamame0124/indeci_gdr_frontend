import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { BrandingUpdateRequest, LoginBrandingResponse } from './branding.models';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly cacheKey = 'gdr.branding';
  private readonly http = inject(HttpClient);
  private readonly brandingSignal = signal<LoginBrandingResponse | null>(this.restoreCachedBranding());
  private readonly loadingSignal = signal(false);
  private loaded = this.brandingSignal() !== null;

  readonly branding = this.brandingSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  ensureLoaded(): void {
    if (this.loaded || this.loadingSignal()) {
      return;
    }

    this.loadingSignal.set(true);
    this.http
      .get<ApiResponse<LoginBrandingResponse>>(`${environment.apiBaseUrl}/public/branding/login`)
      .pipe(map((response) => response.data))
      .subscribe({
        next: (branding) => {
          this.brandingSignal.set(branding);
          this.cacheBranding(branding);
          this.loadingSignal.set(false);
          this.loaded = true;
        },
        error: () => {
          if (!this.brandingSignal()) {
            this.brandingSignal.set(null);
          }
          this.loadingSignal.set(false);
          this.loaded = true;
        }
      });
  }

  getAdminBranding() {
    return this.http
      .get<ApiResponse<LoginBrandingResponse>>(`${environment.apiBaseUrl}/admin/branding`)
      .pipe(map((response) => response.data));
  }

  updateAdminBranding(payload: BrandingUpdateRequest, logo: File | null) {
    const formData = new FormData();
    formData.append('institutionName', payload.institutionName);
    if (payload.shortName) {
      formData.append('nombreCorto', payload.shortName);
    }
    if (payload.ruc) {
      formData.append('ruc', payload.ruc);
    }
    if (payload.address) {
      formData.append('direccion', payload.address);
    }
    if (logo) {
      formData.append('logo', logo, logo.name);
    }

    return this.http
      .post<ApiResponse<LoginBrandingResponse>>(`${environment.apiBaseUrl}/admin/branding`, formData)
      .pipe(map((response) => {
        this.brandingSignal.set(response.data);
        this.cacheBranding(response.data);
        this.loaded = true;
        return response.data;
      }));
  }

  refresh(): void {
    this.loaded = false;
    this.brandingSignal.set(null);
    this.ensureLoaded();
  }

  private cacheBranding(branding: LoginBrandingResponse): void {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(branding));
    } catch {
      // Cache is best-effort only.
    }
  }

  private restoreCachedBranding(): LoginBrandingResponse | null {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      return raw ? JSON.parse(raw) as LoginBrandingResponse : null;
    } catch {
      return null;
    }
  }
}
