import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { BrandingService } from '../../../../core/branding/branding.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="login-page">
      <div class="login-card">
        <div class="login-card__logo-box">
          @if (branding()?.mainLogoAvailable && branding()?.mainLogoUrl) {
            <img
              class="login-card__logo"
              [src]="branding()!.mainLogoUrl!"
              [alt]="branding()?.institutionName || 'Logo institucional'"
            />
          } @else {
            <div class="login-card__main-placeholder">
              {{ initials() || 'AC' }}
            </div>
          }
        </div>

        <div class="login-card__header">
          <h3>Sistema de Gestión de Rendimiento</h3>
          <p>Ingrese sus credenciales institucionales para continuar.</p>
        </div>

        <form class="login-card__form" [formGroup]="form" (ngSubmit)="submit()">
          <label class="form-field">
            <span>DNI o correo electrónico</span>
            <input
              type="text"
              formControlName="loginId"
              placeholder="Ingrese su DNI o correo"
              autocomplete="username"
            />
          </label>

          <label class="form-field">
            <span>Contraseña</span>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              placeholder="Ingrese su contraseña"
              autocomplete="current-password"
            />
          </label>

          <label class="remember">
            <input type="checkbox" formControlName="rememberDevice" />
            <span>Recordar en este dispositivo</span>
          </label>

          @if (errorMessage()) {
            <div class="login-card_message login-card_message--error">
              {{ errorMessage() }}
            </div>
          }

          @if (infoMessage()) {
            <div class="login-card_message login-card_message--info">
              {{ infoMessage() }}
            </div>
          }

          <div class="login-card__actions">
            <button
              type="button"
              class="toggle-password"
              (click)="showPassword.set(!showPassword())"
            >
              {{ showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña' }}
            </button>

            <button type="submit" class="submit-button" [disabled]="loading()">
              {{ loading() ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </div>
        </form>

        <a href="#" class="reset-link" (click)="showResetInfo($event)">
          Olvidé mi contraseña
        </a>
      </div>

      <footer class="login-page__footer">
        <span>2026 · Oficina de Informática</span>
        <span>{{ branding()?.institutionName || 'Portal institucional' }}</span>
      </footer>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;

      background-image:
        linear-gradient(
          135deg,
          rgba(8, 25, 55, 0.15),
          rgba(255, 255, 255, 0.10)
        ),
        url('/assets/images/fondo_gestion.png');

      background-size: cover;
      background-position: center center;
      background-repeat: no-repeat;
      background-attachment: fixed;
    }

    .login-page {
      width: 100%;
      min-height: 100vh;
      position: relative;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      padding: 24px;
      overflow: auto;
    }

    .login-card {
      width: min(100%, 410px);
      padding: 28px 28px 22px;

      border-radius: 20px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.75);

      box-shadow:
        0 24px 60px rgba(15, 23, 42, 0.22),
        0 8px 20px rgba(15, 23, 42, 0.10);

      backdrop-filter: blur(8px);
    }

    .login-card__logo-box {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }

    .login-card__logo {
      max-width: 92px;
      max-height: 92px;
      object-fit: contain;
      display: block;
    }

    .login-card__main-placeholder {
      width: 76px;
      height: 76px;
      border-radius: 20px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #7f1714, #0f2b55);
      color: #ffffff;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 0.08em;
    }

    .login-card__header {
      text-align: center;
      margin-bottom: 22px;
    }

    .login-card__header h3 {
      margin: 0;
      font-size: 1.28rem;
      font-weight: 800;
      color: #0f2b55;
      line-height: 1.25;
      text-transform: uppercase;
    }

    .login-card__header p {
      margin: 8px 0 0;
      font-size: 0.84rem;
      color: #667085;
      line-height: 1.5;
    }

    .login-card__form {
      display: grid;
      gap: 14px;
    }

    .form-field {
      display: grid;
      gap: 7px;
      font-weight: 700;
      color: #344054;
    }

    .form-field span {
      font-size: 0.8rem;
    }

    .form-field input[type='text'],
    .form-field input[type='password'] {
      width: 100%;
      height: 42px;
      border-radius: 12px;
      border: 1px solid #d0d7e2;
      background: #ffffff;
      padding: 9px 13px;
      outline: none;
      font-size: 0.86rem;
      box-sizing: border-box;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .form-field input:focus {
      border-color: rgba(15, 43, 85, 0.45);
      box-shadow: 0 0 0 4px rgba(15, 43, 85, 0.10);
    }

    .remember {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: #667085;
      margin-top: 2px;
    }

    .remember input {
      accent-color: #7f1714;
    }

    .login-card__actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
    }

    .toggle-password {
      border: none;
      background: transparent;
      padding: 0;
      color: #667085;
      font-weight: 700;
      text-align: center;
      cursor: pointer;
      font-size: 0.78rem;
    }

    .toggle-password:hover {
      color: #0f2b55;
    }

    .submit-button {
      width: 100%;
      height: 44px;

      border: none;
      border-radius: 12px;

      background: linear-gradient(135deg, #7f1714, #a5231f);
      color: #ffffff;

      font-weight: 800;
      font-size: 0.9rem;
      letter-spacing: 0.01em;

      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

      box-shadow: 0 12px 22px rgba(127, 23, 20, 0.22);
    }

    .submit-button:hover:enabled {
      transform: translateY(-1px);
      background: linear-gradient(135deg, #6d1412, #951f1b);
      box-shadow: 0 16px 28px rgba(127, 23, 20, 0.28);
    }

    .submit-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      box-shadow: none;
    }

    .login-card__message {
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .login-card__message--error {
      background: rgba(180, 35, 24, 0.08);
      border: 1px solid rgba(180, 35, 24, 0.14);
      color: #a12622;
    }

    .login-card__message--info {
      background: rgba(15, 23, 42, 0.05);
      border: 1px solid rgba(15, 23, 42, 0.10);
      color: #475467;
    }

    .reset-link {
      display: inline-flex;
      margin-top: 16px;
      justify-content: center;
      width: 100%;
      text-decoration: none;
      color: #7f1714;
      font-weight: 700;
      font-size: 0.82rem;
    }

    .reset-link:hover {
      text-decoration: underline;
    }

    .login-page__footer {
      position: fixed;
      left: 24px;
      right: 24px;
      bottom: 14px;

      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;

      color: rgba(255, 255, 255, 0.88);
      font-size: 0.76rem;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    }

    @media (max-width: 820px) {
      :host {
        background-position: center center;
        background-attachment: scroll;
      }

      .login-page__footer {
        justify-content: center;
        text-align: center;
      }

      .login-page__footer span:last-child {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .login-page {
        padding: 16px;
      }

      .login-card {
        width: min(100%, 370px);
        padding: 22px 18px 18px;
        border-radius: 18px;
      }

      .login-card__logo {
        max-width: 74px;
        max-height: 74px;
      }

      .login-card__header h3 {
        font-size: 1.05rem;
      }

      .login-card__header p {
        font-size: 0.8rem;
      }

      .login-page__footer {
        left: 12px;
        right: 12px;
        bottom: 10px;
        font-size: 0.7rem;
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
      this.errorMessage.set('Complete el DNI/correo electrónico y la contraseña.');
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
    this.infoMessage.set('El restablecimiento de contraseña no forma parte de este alcance.');

    this.toastService.info(
      'Alcance actual',
      'El restablecimiento de contraseña no forma parte de esta etapa.'
    );
  }
}