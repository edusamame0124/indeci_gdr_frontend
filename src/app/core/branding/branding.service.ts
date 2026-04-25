import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { LoginBrandingResponse } from './branding.models';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly brandingSignal = signal<LoginBrandingResponse | null>(null);
  private readonly loadingSignal = signal(false);
  private loaded = false;

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
          this.loadingSignal.set(false);
          this.loaded = true;
        },
        error: () => {
          this.brandingSignal.set(null);
          this.loadingSignal.set(false);
          this.loaded = true;
        }
      });
  }
}
