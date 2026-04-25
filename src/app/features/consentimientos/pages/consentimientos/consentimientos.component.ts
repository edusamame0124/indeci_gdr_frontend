import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ConsentimientoHistorial,
  ConsentimientoResumen
} from '../../../../core/consentimientos/consentimientos.models';
import { ConsentimientosService } from '../../../../core/consentimientos/consentimientos.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-consentimientos',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page__header">
        <div>
          <p class="page__eyebrow">Lote 5</p>
          <h1>Consentimientos</h1>
          <p class="page__subtitle">
            Registro self-service de aceptaciones sobre textos y versiones vigentes del sistema GDR Access.
          </p>
        </div>
        <a routerLink="/dashboard" class="page__link">Volver al panel</a>
      </div>

      @if (errorMessage()) {
        <div class="page__state page__state--error">{{ errorMessage() }}</div>
      }

      <div class="summary-strip">
        <div>
          <span>Tipos vigentes</span>
          <strong>{{ consentimientos().length }}</strong>
        </div>
        <div>
          <span>Aceptados</span>
          <strong>{{ acceptedCount() }}</strong>
        </div>
        <div>
          <span>Historial</span>
          <strong>{{ historial().length }}</strong>
        </div>
      </div>

      <section class="panel">
        <header class="panel__header">
          <div>
            <h2>Consentimientos vigentes</h2>
            <p>El usuario autenticado acepta solo sobre su propia sesión.</p>
          </div>
          <button type="button" class="secondary-link" (click)="loadData()">Actualizar</button>
        </header>

        @if (consentimientos().length) {
          <div class="record-list">
            @for (item of consentimientos(); track item.idTipoConsentimiento) {
              <article class="record-card">
                <div class="record-card__head">
                  <div>
                    <span class="record-card__eyebrow">{{ item.codigoConsentimiento }} v{{ item.versionConsentimiento }}</span>
                    <strong>{{ item.nombreConsentimiento }}</strong>
                  </div>
                  <span class="status-pill" [class.status-pill--success]="item.aceptado">
                    {{ item.aceptado ? 'ACEPTADO' : 'PENDIENTE' }}
                  </span>
                </div>
                <p>{{ item.textoConsentimiento }}</p>
                <div class="record-card__meta">
                  <span>Requerido: {{ item.requerido ? 'SI' : 'NO' }}</span>
                  <span>Fecha aceptacion: {{ item.fechaAceptacion || 'Sin registro' }}</span>
                </div>
                @if (!item.aceptado) {
                  <form [formGroup]="acceptForm" class="accept-form" (ngSubmit)="accept(item.idTipoConsentimiento)">
                    <label class="field">
                      <span>Detalle de aceptacion</span>
                      <input type="text" formControlName="detalleAceptacion" placeholder="Opcional" />
                    </label>
                    <button type="submit" class="primary-button">Aceptar consentimiento</button>
                  </form>
                }
              </article>
            }
          </div>
        } @else {
          <div class="page__state">No hay consentimientos vigentes para mostrar.</div>
        }
      </section>

      <section class="panel">
        <header class="panel__header">
          <div>
            <h2>Historial personal</h2>
            <p>Trazabilidad de aceptaciones registradas por el propio usuario autenticado.</p>
          </div>
        </header>

        @if (historial().length) {
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Version</th>
                  <th>Fecha aceptacion</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                @for (item of historial(); track item.idRegistroConsentimiento) {
                  <tr>
                    <td>{{ item.codigoConsentimiento }}</td>
                    <td>{{ item.nombreConsentimiento }}</td>
                    <td>{{ item.versionConsentimiento }}</td>
                    <td>{{ item.fechaAceptacion }}</td>
                    <td>{{ item.detalleAceptacion || 'Sin detalle' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="page__state">No hay historial personal de consentimientos.</div>
        }
      </section>
    </section>
  `,
  styles: [`
    .page { padding: 18px 22px 26px; max-width: 1180px; margin: 0 auto; display: grid; gap: 14px; }
    .page__header, .panel__header, .record-card__head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .page__eyebrow, .record-card__eyebrow { margin: 0 0 6px; font-size: .7rem; font-weight: 700; letter-spacing: .1em; color: #667085; text-transform: uppercase; }
    .page__header h1, .panel__header h2 { margin: 0; color: #1f2937; }
    .page__subtitle, .panel__header p, .record-card p { margin: 6px 0 0; color: #667085; font-size: .82rem; line-height: 1.5; }
    .page__link, .primary-button, .secondary-link { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 14px; border-radius: 10px; text-decoration: none; font-size: .8rem; font-weight: 600; font: inherit; }
    .page__link, .secondary-link { background: rgba(127,23,20,.05); color: #7f1714; border: 1px solid rgba(127,23,20,.12); }
    .primary-button { border: none; background: #7f1714; color: #fff; cursor: pointer; }
    .page__state { border-radius: 12px; padding: 14px 16px; background: rgba(255,255,255,.92); border: 1px solid rgba(15,23,42,.08); color: #526274; font-size: .84rem; }
    .page__state--error { color: #a12622; }
    .summary-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .summary-strip div, .panel { border-radius: 14px; background: rgba(255,255,255,.96); border: 1px solid rgba(15,23,42,.08); box-shadow: 0 10px 24px rgba(15,23,42,.06); }
    .summary-strip div { padding: 10px 12px; display: grid; gap: 3px; }
    .summary-strip span { font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; color: #667085; font-weight: 700; }
    .summary-strip strong, .record-card strong { color: #1f2937; }
    .panel { padding: 16px; display: grid; gap: 12px; }
    .record-list { display: grid; gap: 10px; }
    .record-card { border: 1px solid rgba(15,23,42,.08); border-radius: 12px; background: #fff; padding: 14px; display: grid; gap: 10px; }
    .record-card__meta { display: grid; gap: 4px; color: #667085; font-size: .76rem; }
    .status-pill { display: inline-flex; align-items: center; justify-content: center; min-height: 26px; padding: 0 10px; border-radius: 999px; background: rgba(15,23,42,.04); color: #475467; font-size: .74rem; font-weight: 600; }
    .status-pill--success { background: #f0fdf4; color: #15803d; }
    .accept-form { display: grid; gap: 10px; }
    .field { display: grid; gap: 6px; color: #415065; font-size: .8rem; }
    input { width: 100%; border: 1px solid #d0d7e2; border-radius: 10px; padding: 10px 12px; font: inherit; background: #fff; color: #223042; box-sizing: border-box; }
    .table-wrapper { overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid rgba(15,23,42,.08); text-align: left; font-size: .78rem; color: #334155; }
    th { color: #64748b; text-transform: uppercase; letter-spacing: .05em; font-size: .68rem; }
    @media (max-width: 920px) { .summary-strip { grid-template-columns: 1fr; } }
  `]
})
export class ConsentimientosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly consentimientosService = inject(ConsentimientosService);
  private readonly toastService = inject(UiToastService);

  readonly consentimientos = signal<ConsentimientoResumen[]>([]);
  readonly historial = signal<ConsentimientoHistorial[]>([]);
  readonly errorMessage = signal('');

  readonly acceptForm = this.fb.group({
    detalleAceptacion: ['']
  });

  constructor() {
    this.loadData();
  }

  acceptedCount(): number {
    return this.consentimientos().filter((item) => item.aceptado).length;
  }

  loadData(): void {
    this.errorMessage.set('');
    this.consentimientosService.listPropios().subscribe({
      next: (data) => this.consentimientos.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.consentimientosService.listHistorial().subscribe({
      next: (data) => this.historial.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  accept(consentTypeId: number): void {
    this.consentimientosService.aceptar({
      idTipoConsentimiento: consentTypeId,
      detalleAceptacion: this.acceptForm.getRawValue().detalleAceptacion || null
    }).subscribe({
      next: () => {
        this.acceptForm.reset({ detalleAceptacion: '' });
        this.loadData();
        this.toastService.success('Consentimiento aceptado', 'La aceptacion quedo registrada correctamente.');
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }
}
