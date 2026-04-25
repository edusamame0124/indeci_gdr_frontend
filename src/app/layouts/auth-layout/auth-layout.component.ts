import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrandingService } from '../../core/branding/branding.service';
import { UiToastComponent } from '../../shared/ui/ui-toast.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, UiToastComponent],
  host: { class: 'auth-layout-host' },
  template: `
    <div class="auth-shell">
      <header class="top-bar">
        <div class="top-bar__brand">
          @if (branding()?.headerLogoAvailable && branding()?.headerLogoUrl) {
            <img
              class="top-bar__logo"
              [src]="branding()!.headerLogoUrl!"
              [alt]="branding()?.institutionName || 'Logo institucional'"
            />
          } @else {
            <div class="top-bar__placeholder">{{ initials() || 'TU LOGO' }}</div>
          }
        </div>

        <div class="top-bar__title">Acceso institucional</div>
      </header>

      <main class="auth-shell__content">
        <router-outlet></router-outlet>
      </main>

      <app-ui-toast></app-ui-toast>
    </div>
  `,
  styles: [`
    .auth-layout-host {
      display: block;
      width: 100%;
      min-height: 100dvh;
    }

    .auth-shell {
      width: 100%;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%);
    }

    .top-bar {
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: #7f1714;
      color: #fff;
      border-bottom: 1px solid rgba(87, 10, 10, 0.16);
      flex: 0 0 auto;
    }

    .top-bar__brand {
      display: flex;
      align-items: center;
      min-width: 76px;
      min-height: 28px;
      max-width: 220px;
    }

    .top-bar__logo {
      max-height: 28px;
      max-width: 220px;
      object-fit: contain;
      display: block;
    }

    .top-bar__placeholder {
      min-width: 78px;
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.18);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }

    .top-bar__title {
      font-size: 0.76rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      opacity: 0.92;
    }

    .auth-shell__content {
      flex: 1;
      min-height: 0;
      display: flex;
      justify-content: center;
      overflow: auto;
    }

    @media (max-width: 640px) {
      .top-bar {
        height: 42px;
        padding: 0 12px;
      }

      .top-bar__title {
        font-size: 0.7rem;
      }

      .top-bar__logo {
        max-width: 132px;
        max-height: 24px;
      }

      .top-bar__placeholder {
        min-width: 62px;
        height: 24px;
        font-size: 0.64rem;
      }
    }
  `]
})
export class AuthLayoutComponent {
  private readonly brandingService = inject(BrandingService);

  readonly branding = this.brandingService.branding;
  readonly initials = computed(() => {
    const name = this.branding()?.institutionName?.trim();
    if (!name) {
      return '';
    }
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  constructor() {
    this.brandingService.ensureLoaded();
  }
}
