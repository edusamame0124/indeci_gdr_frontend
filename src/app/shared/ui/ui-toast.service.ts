import { Injectable, signal } from '@angular/core';

export type UiToastTone = 'success' | 'error' | 'info';

export interface UiToastItem {
  id: number;
  title: string;
  message: string;
  tone: UiToastTone;
}

@Injectable({ providedIn: 'root' })
export class UiToastService {
  private nextId = 1;
  private readonly toastsSignal = signal<UiToastItem[]>([]);

  readonly toasts = this.toastsSignal.asReadonly();

  success(title: string, message: string): void {
    this.push(title, message, 'success');
  }

  error(title: string, message: string): void {
    this.push(title, message, 'error');
  }

  info(title: string, message: string): void {
    this.push(title, message, 'info');
  }

  dismiss(id: number): void {
    this.toastsSignal.update((items) => items.filter((item) => item.id !== id));
  }

  private push(title: string, message: string, tone: UiToastTone): void {
    const id = this.nextId++;
    this.toastsSignal.update((items) => [...items, { id, title, message, tone }]);
    setTimeout(() => this.dismiss(id), 3200);
  }
}
