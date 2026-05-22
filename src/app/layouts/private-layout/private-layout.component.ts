import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { BrandingService } from '../../core/branding/branding.service';
import { UiToastComponent } from '../../shared/ui/ui-toast.component';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, UiToastComponent],
  host: { class: 'private-layout-host' },
  template: `
    <div class="private-shell">
      <header class="private-header">
        <div class="private-header__brand">
          @if (branding()?.headerLogoAvailable && branding()?.headerLogoUrl && !headerLogoFailed()) {
            <img
              class="private-header__logo"
              [src]="branding()!.headerLogoUrl!"
              [alt]="branding()?.institutionName || 'Logo institucional'"
              (error)="headerLogoFailed.set(true)"
            />
          } @else {
            @if (!brandingLoading()) {
              <div class="private-header__logo-fallback">{{ brandingInitials() || 'TU LOGO' }}</div>
            } @else {
              <div class="private-header__logo-loading" aria-hidden="true"></div>
            }
          }
          @if (branding()?.institutionName || !brandingLoading()) {
            <strong class="private-header__institution">{{ branding()?.institutionName || 'Nombre institucional' }}</strong>
          }
        </div>

        <div class="private-header__user">
          <div class="private-header__identity">
            <div class="private-header__avatar">{{ userInitials() }}</div>
            <div class="private-header__text">
              <strong>{{ displayName() || 'Usuario autenticado' }}</strong>
              <span>{{ userIdentifier() || 'Sesion activa' }}</span>
              @if (activeCycleName()) {
                <div class="private-header__cycle">{{ activeCycleName() }}</div>
              }
              @if (actorLabel()) {
                <div class="private-header__cycle">
                  {{ actorLabel() }}
                  @if (unitLabel()) {
                    <span> · {{ unitLabel() }}</span>
                  }
                </div>
              }
            </div>
          </div>

          <button type="button" class="private-header__logout" (click)="logout()">
            Cerrar sesion
          </button>
        </div>
      </header>

      <main class="private-shell__content">
        <router-outlet></router-outlet>
      </main>

      <app-ui-toast></app-ui-toast>
    </div>
  `,
  styles: [`
    .private-layout-host {
      display: block;
      width: 100%;
      min-height: 100dvh;
    }

    .private-shell {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      background: linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%);
    }

    .private-header {
      position: sticky;
      top: 0;
      z-index: 20;
      min-height: 60px;
      background: #7f1714;
      border-bottom: 1px solid rgba(89, 9, 9, 0.16);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 8px 18px;
      color: #fff;
      flex: 0 0 auto;
      flex-wrap: wrap;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
    }

    .private-header__brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 88px;
      max-width: 420px;
      min-height: 32px;
      flex: 0 1 auto;
    }

    .private-header__logo {
      width: 42px;
      height: 42px;
      object-fit: contain;
      display: block;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.96);
      padding: 3px;
      flex: 0 0 auto;
    }

    .private-header__logo-fallback {
      min-width: 92px;
      min-height: 32px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      padding: 0 12px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.16);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      white-space: nowrap;
      flex: 0 0 auto;
    }

    .private-header__logo-loading {
      width: 42px;
      height: 42px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.10);
      border: 1px solid rgba(255, 255, 255, 0.14);
      flex: 0 0 auto;
    }

    .private-header__institution {
      display: block;
      min-width: 0;
      max-width: 330px;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 800;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .private-header__user {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 14px;
      min-width: 0;
      margin-left: auto;
      flex: 1 1 auto;
      flex-wrap: wrap;
    }

    .private-header__identity {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      max-width: 100%;
    }

    .private-header__avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.16);
      display: grid;
      place-items: center;
      font-size: 0.76rem;
      font-weight: 800;
      flex: 0 0 auto;
    }

    .private-header__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.1;
    }

    .private-header__text strong,
    .private-header__text span,
    .private-header__cycle {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
    }

    .private-header__text strong {
      font-size: 0.88rem;
      font-weight: 700;
    }

    .private-header__text span {
      font-size: 0.72rem;
      opacity: 0.86;
    }

    .private-header__cycle {
      font-size: 0.68rem;
      opacity: 0.8;
      margin-top: 2px;
    }

    .private-header__logout {
      border: none;
      border-radius: 999px;
      min-height: 36px;
      padding: 0 16px;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-weight: 600;
      font-size: 0.84rem;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s ease;
      flex: 0 0 auto;
    }

    .private-header__logout:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    .private-shell__content {
      flex: 1;
    }

    @media (max-width: 760px) {
      .private-header {
        padding: 8px 14px 10px;
      }

      .private-header__brand {
        max-width: 320px;
      }

      .private-header__institution {
        max-width: 260px;
      }

      .private-header__user {
        width: 100%;
        justify-content: space-between;
      }

      .private-header__text strong,
      .private-header__text span,
      .private-header__cycle {
        max-width: 180px;
      }
    }

    @media (max-width: 560px) {
      .private-header {
        align-items: stretch;
      }

      .private-header__brand {
        max-width: 100%;
      }

      .private-header__institution {
        max-width: calc(100vw - 90px);
      }

      .private-header__user {
        width: 100%;
        align-items: center;
      }

      .private-header__text strong,
      .private-header__text span,
      .private-header__cycle {
        max-width: 120px;
      }
    }

    @media (max-width: 420px) {
      .private-header__user {
        flex-direction: column;
        align-items: stretch;
      }

      .private-header__identity {
        width: 100%;
      }

      .private-header__text strong,
      .private-header__text span,
      .private-header__cycle {
        max-width: none;
      }

      .private-header__logout {
        width: 100%;
      }
    }
  `]
})
export class PrivateLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly brandingService = inject(BrandingService);

  readonly branding = this.brandingService.branding;
  readonly brandingLoading = this.brandingService.loading;
  readonly headerLogoFailed = signal(false);
  readonly currentUser = this.authService.currentUser;
  readonly displayName = computed(() => this.currentUser()?.displayName ?? '');
  readonly userIdentifier = computed(() => {
    const username = this.currentUser()?.username ?? '';
    const contextName = this.currentUser()?.context?.contextName ?? '';
    if (!username) {
      return contextName || 'Sesion activa';
    }
    return contextName ? `${username} - ${contextName}` : username;
  });
  readonly activeCycleName = computed(() => this.currentUser()?.context?.cycleName ?? '');
  readonly actorLabel = computed(() => this.currentUser()?.context?.functionalActor ?? '');
  readonly unitLabel = computed(() => this.currentUser()?.context?.orgUnitName ?? '');
  readonly userInitials = computed(() => {
    const name = this.displayName().trim();
    if (!name) {
      return 'U';
    }

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  readonly brandingInitials = computed(() => {
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

  logout(): void {
    this.authService.logout();
  }
}
