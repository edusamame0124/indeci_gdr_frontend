import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { BrandingService } from '../../../../core/branding/branding.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  host: { class: 'login-host' },
  template: `
    <section class="login-page">
      <div class="login-page__hero">
        @if (branding()?.mainLogoAvailable && branding()?.mainLogoUrl) {
          <img
            class="login-page__logo"
            [src]="branding()!.mainLogoUrl!"
            [alt]="branding()?.institutionName || 'Logo institucional'"
          />
        } @else {
          <div class="login-page__main-placeholder">{{ initials() || 'TU' }}</div>
        }

        <h2 class="login-page__institution">{{ branding()?.institutionName || 'Nombre institucional' }}</h2>
      </div>

      <div class="login-card">
        <div class="login-card__header">
          <h3>Iniciar sesion</h3>
          <p>Ingrese sus credenciales institucionales para continuar.</p>
        </div>

        <form class="login-card__form" [formGroup]="form" (ngSubmit)="submit()">
          <label class="form-field">
            <span>DNI o correo electronico</span>
            <input
              type="text"
              formControlName="loginId"
              placeholder="Ingrese su DNI o correo"
              autocomplete="username"
            />
          </label>

          <label class="form-field">
            <span>Contrasena</span>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              placeholder="Ingrese su contrasena"
              autocomplete="current-password"
            />
          </label>

          <label class="remember">
            <input type="checkbox" formControlName="rememberDevice" />
            <span>Recordar en este dispositivo</span>
          </label>

          @if (errorMessage()) {
            <div class="login-card__message login-card__message--error">{{ errorMessage() }}</div>
          }

          @if (infoMessage()) {
            <div class="login-card__message login-card__message--info">{{ infoMessage() }}</div>
          }

          <div class="login-card__actions">
            <button
              type="button"
              class="toggle-password"
              (click)="showPassword.set(!showPassword())"
            >
              {{ showPassword() ? 'Ocultar contrasena' : 'Mostrar contrasena' }}
            </button>

            <button type="submit" class="submit-button" [disabled]="loading()">
              {{ loading() ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </div>
        </form>

        <a href="#" class="reset-link" (click)="showResetInfo($event)">
          Olvide mi contrasena
        </a>
      </div>

      <footer class="login-page__footer">
        <span>2026 · Oficina de Informatica</span>
        <span>{{ branding()?.institutionName || 'Portal institucional' }}</span>
      </footer>
    </section>
  `,
  styles: [`
    .login-host {
      display: flex;
      flex: 1;
      width: 100%;
      min-width: 0;
      justify-content: center;
    }

    .login-page {
      flex: 1;
      width: 100%;
      max-width: 1180px;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      padding: 16px;
      overflow: auto;
      margin: 0 auto;
    }

    .login-page__hero {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
    }

    .login-page__logo {
      max-width: min(136px, 36vw);
      max-height: 70px;
      object-fit: contain;
      display: block;
    }

    .login-page__main-placeholder {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, rgba(127, 23, 20, 0.06), rgba(71, 85, 105, 0.08));
      border: 1px solid rgba(127, 23, 20, 0.08);
      color: #7f1714;
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: 0.08em;
    }

    .login-page__institution {
      margin: 0;
      font-size: clamp(0.92rem, 1.5vw, 1.08rem);
      font-weight: 700;
      letter-spacing: 0.01em;
      text-align: center;
      max-width: min(360px, 90vw);
      line-height: 1.3;
      color: #1f2937;
    }

    .login-card {
      width: min(100%, 388px);
      padding: 24px 24px 18px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
      flex: 0 0 auto;
    }

    .login-card__header {
      margin-bottom: 18px;
      text-align: left;
    }

    .login-card__header h3 {
      margin: 0;
      font-size: 0.98rem;
      font-weight: 700;
      color: #1f2937;
    }

    .login-card__header p {
      margin: 6px 0 0;
      font-size: 0.8rem;
      color: #667085;
      line-height: 1.5;
    }

    .login-card__form {
      display: grid;
      gap: 12px;
    }

    .form-field {
      display: grid;
      gap: 6px;
      font-weight: 600;
      color: #344054;
    }

    .form-field span {
      font-size: 0.78rem;
    }

    .form-field input[type='text'],
    .form-field input[type='password'] {
      width: 100%;
      height: 38px;
      border-radius: 10px;
      border: 1px solid #d0d7e2;
      background: #ffffff;
      padding: 8px 12px;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      font-size: 0.84rem;
      box-sizing: border-box;
    }

    .form-field input:focus {
      border-color: rgba(127, 23, 20, 0.35);
      box-shadow: 0 0 0 3px rgba(127, 23, 20, 0.08);
    }

    .remember {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: #667085;
      margin-top: 2px;
    }

    .login-card__actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }

    .toggle-password {
      border: none;
      background: transparent;
      padding: 0;
      color: #667085;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      font-size: 0.76rem;
    }

    .submit-button {
      border: none;
      border-radius: 10px;
      min-width: 168px;
      height: 38px;
      padding: 0 18px;
      background: #7f1714;
      color: #fff;
      font-weight: 600;
      font-size: 0.84rem;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 10px 18px rgba(127, 23, 20, 0.14);
    }

    .submit-button:hover:enabled {
      background: #6d1412;
    }

    .submit-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      box-shadow: none;
    }

    .login-card__message {
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .login-card__message--error {
      background: rgba(180, 35, 24, 0.08);
      border: 1px solid rgba(180, 35, 24, 0.12);
      color: #a12622;
    }

    .login-card__message--info {
      background: rgba(15, 23, 42, 0.04);
      border: 1px solid rgba(15, 23, 42, 0.08);
      color: #475467;
    }

    .reset-link {
      display: inline-flex;
      margin-top: 14px;
      justify-content: center;
      width: 100%;
      text-decoration: none;
      color: #7f1714;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .login-page__footer {
      width: min(100%, 1240px);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-top: auto;
      color: #98a2b3;
      font-size: 0.76rem;
      flex: 0 0 auto;
    }

    @media (max-width: 820px) {
      .login-page__footer {
        width: 100%;
        justify-content: center;
        text-align: center;
      }

      .login-page__footer span:last-child {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .login-page {
        gap: 10px;
        padding: 12px;
      }

      .login-card {
        width: min(100%, 360px);
        padding: 18px 16px 14px;
      }

      .login-page__logo {
        max-width: min(118px, 34vw);
        max-height: 58px;
      }

      .login-page__institution {
        font-size: 0.88rem;
      }

      .login-page__main-placeholder {
        width: 60px;
        height: 60px;
        border-radius: 18px;
        font-size: 0.92rem;
      }

      .login-page__footer {
        font-size: 0.72rem;
      }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly brandingService = inject(BrandingService);
  private readonly toastService = inject(UiToastService);

  readonly branding = this.brandingService.branding;
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly infoMessage = signal('');
  readonly showPassword = signal(false);
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

  readonly form = this.fb.nonNullable.group({
    loginId: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberDevice: [false]
  });

  constructor() {
    this.brandingService.ensureLoaded();
  }

  submit(): void {
    this.errorMessage.set('');
    this.infoMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Complete el loginId y la contrasena.');
      return;
    }

    const { loginId, password, rememberDevice } = this.form.getRawValue();
    this.loading.set(true);
    this.authService.login(loginId.trim(), password, rememberDevice).subscribe({
      next: () => {
        this.loading.set(false);
        this.authService.redirectAfterLogin();
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message);
      }
    });
  }

  showResetInfo(event: Event): void {
    event.preventDefault();
    this.errorMessage.set('');
    this.infoMessage.set('El restablecimiento de contrasena no forma parte de este alcance.');
    this.toastService.info('Alcance actual', 'El restablecimiento de contraseña no forma parte de esta etapa.');
  }
}
