import { Component, computed, inject } from '@angular/core';
import { UiToastService } from './ui-toast.service';

@Component({
  selector: 'app-ui-toast',
  standalone: true,
  template: `
    @if (hasToasts()) {
      <section class="toast-stack" aria-live="polite" aria-label="Notificaciones del sistema">
        @for (toast of toasts(); track toast.id) {
          <article class="toast" [class.toast--success]="toast.tone === 'success'" [class.toast--error]="toast.tone === 'error'">
            <div class="toast__body">
              <strong>{{ toast.title }}</strong>
              <p>{{ toast.message }}</p>
            </div>
            <button type="button" class="toast__close" (click)="dismiss(toast.id)" aria-label="Cerrar aviso">
              ×
            </button>
          </article>
        }
      </section>
    }
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 76px;
      right: 18px;
      z-index: 120;
      display: grid;
      gap: 10px;
      width: min(320px, calc(100vw - 24px));
    }

    .toast {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.97);
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
      padding: 12px 12px 12px 14px;
    }

    .toast--success {
      border-left: 4px solid #1f7a4d;
    }

    .toast--error {
      border-left: 4px solid #b42318;
    }

    .toast__body {
      min-width: 0;
      display: grid;
      gap: 4px;
    }

    .toast__body strong {
      font-size: 0.84rem;
      color: #1f2937;
    }

    .toast__body p {
      margin: 0;
      font-size: 0.78rem;
      line-height: 1.45;
      color: #5b6779;
    }

    .toast__close {
      border: none;
      background: transparent;
      color: #6b7280;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      padding: 2px;
    }

    @media (max-width: 720px) {
      .toast-stack {
        top: 68px;
        right: 12px;
        left: 12px;
        width: auto;
      }
    }
  `]
})
export class UiToastComponent {
  private readonly toastService = inject(UiToastService);

  readonly toasts = this.toastService.toasts;
  readonly hasToasts = computed(() => this.toasts().length > 0);

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
