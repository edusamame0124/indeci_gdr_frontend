import { computed, Injectable, signal } from '@angular/core';
import { CycleAccessResponse } from '../admin/cycle-access.models';
import { buildCicloBoardRoute, buildCicloModuleRoute } from './ciclo-route.util';

@Injectable({ providedIn: 'root' })
export class CicloNavService {
  private readonly _ciclo = signal<CycleAccessResponse | null>(null);
  private readonly _loading = signal(false);

  readonly ciclo = this._ciclo.asReadonly();
  readonly cicloId = computed(() => this._ciclo()?.id ?? null);
  readonly isActiveCycle = computed(() => this._ciclo()?.isActiveCycle ?? false);
  readonly loading = this._loading.asReadonly();

  readonly boardLabel = computed(() => this._ciclo()?.name ?? 'Ciclo');

  boardRoute(): string[] {
    const id = this.cicloId();
    return id && id > 0 ? buildCicloBoardRoute(id) : ['/dashboard'];
  }

  moduleRoute(...segments: Array<string | number>): string[] {
    const id = this.cicloId();
    return id && id > 0 ? buildCicloModuleRoute(id, ...segments) : ['/dashboard'];
  }

  setCiclo(response: CycleAccessResponse): void {
    this._ciclo.set(response);
  }

  setLoading(value: boolean): void {
    this._loading.set(value);
  }

  clear(): void {
    this._ciclo.set(null);
    this._loading.set(false);
  }
}
