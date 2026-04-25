import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReporteAvance, ReporteOportunidadMejora, ReporteResultado } from '../../../../core/reportes/reportes.models';
import { ReportesService } from '../../../../core/reportes/reportes.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page__header">
        <div>
          <p class="page__eyebrow">Lote 5</p>
          <h1>Reportes operativos</h1>
          <p class="page__subtitle">
            Consulta operativa del ciclo GDR sobre metas, evidencias, resultados, documentos firmados y oportunidades de mejora.
          </p>
        </div>
        <a routerLink="/dashboard" class="page__link">Volver al panel</a>
      </div>

      @if (errorMessage()) {
        <div class="page__state page__state--error">{{ errorMessage() }}</div>
      }

      <form [formGroup]="filtersForm" class="filters">
        <label class="field">
          <span>ID evaluado</span>
          <input type="number" formControlName="evaluatedId" placeholder="Opcional" />
        </label>

        <label class="field">
          <span>Estado oportunidad</span>
          <select formControlName="estadoCodigo">
            <option value="">Todos</option>
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </label>

        <div class="filters__actions">
          <button type="button" class="primary-button" (click)="loadAll()" [disabled]="loading()">
            {{ loading() ? 'Consultando...' : 'Aplicar filtros' }}
          </button>
        </div>
      </form>

      <div class="summary-strip">
        <div>
          <span>Avance</span>
          <strong>{{ avances().length }}</strong>
        </div>
        <div>
          <span>Resultados</span>
          <strong>{{ resultados().length }}</strong>
        </div>
        <div>
          <span>Oportunidades</span>
          <strong>{{ oportunidades().length }}</strong>
        </div>
      </div>

      <section class="panel">
        <header class="panel__header">
          <div>
            <h2>Reporte de avance</h2>
            <p>Lectura consolidada por asignación activa del ciclo.</p>
          </div>
          <button type="button" class="secondary-link" (click)="exportAvance()">Exportar CSV</button>
        </header>

        @if (avances().length) {
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Evaluado</th>
                  <th>Evaluador</th>
                  <th>Ciclo</th>
                  <th>Metas</th>
                  <th>Evidencias</th>
                  <th>Metas con evidencia</th>
                  <th>Resultado</th>
                  <th>Docs</th>
                  <th>OM abiertas</th>
                  <th>OM cerradas</th>
                </tr>
              </thead>
              <tbody>
                @for (item of avances(); track item.idAsignacion) {
                  <tr>
                    <td>{{ item.evaluado }}</td>
                    <td>{{ item.evaluador }}</td>
                    <td>{{ item.ciclo }}</td>
                    <td>{{ item.totalMetas }}</td>
                    <td>{{ item.totalEvidencias }}</td>
                    <td>{{ item.metasConEvidencia }}</td>
                    <td>{{ item.resultadoDisponible ? 'SI' : 'NO' }}</td>
                    <td>{{ item.totalDocumentosFirmados }}</td>
                    <td>{{ item.oportunidadesAbiertas }}</td>
                    <td>{{ item.oportunidadesCerradas }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="page__state">No hay datos de avance para los filtros seleccionados.</div>
        }
      </section>

      <section class="panel">
        <header class="panel__header">
          <div>
            <h2>Reporte de resultados</h2>
            <p>Resultados consolidados y su soporte operativo.</p>
          </div>
          <button type="button" class="secondary-link" (click)="exportResultados()">Exportar CSV</button>
        </header>

        @if (resultados().length) {
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Evaluado</th>
                  <th>Ciclo</th>
                  <th>Puntaje final</th>
                  <th>Puntaje resultado</th>
                  <th>Docs firmados</th>
                  <th>OM</th>
                  <th>Comentario</th>
                </tr>
              </thead>
              <tbody>
                @for (item of resultados(); track item.idResultado) {
                  <tr>
                    <td>{{ item.evaluado }}</td>
                    <td>{{ item.ciclo }}</td>
                    <td>{{ item.puntajeFinal }}</td>
                    <td>{{ item.puntajeResultado }}</td>
                    <td>{{ item.documentosFirmados }}</td>
                    <td>{{ item.oportunidadesMejora }}</td>
                    <td>{{ item.comentarioEvaluacion || 'Sin comentario' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="page__state">No hay resultados para los filtros seleccionados.</div>
        }
      </section>

      <section class="panel">
        <header class="panel__header">
          <div>
            <h2>Reporte de oportunidades de mejora</h2>
            <p>Seguimiento operativo de mejora continua registrado en el sistema.</p>
          </div>
          <button type="button" class="secondary-link" (click)="exportOportunidades()">Exportar CSV</button>
        </header>

        @if (oportunidades().length) {
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Evaluado</th>
                  <th>Estado</th>
                  <th>Responsable</th>
                  <th>Plazo</th>
                  <th>Seguimientos</th>
                  <th>Registro</th>
                  <th>Cierre</th>
                </tr>
              </thead>
              <tbody>
                @for (item of oportunidades(); track item.idOportunidadMejora) {
                  <tr>
                    <td>{{ item.evaluado }}</td>
                    <td>{{ item.estadoNombre }}</td>
                    <td>{{ item.responsable }}</td>
                    <td>{{ item.plazoCompromiso || 'Pendiente' }}</td>
                    <td>{{ item.totalSeguimientos }}</td>
                    <td>{{ item.fechaRegistro || 'Pendiente' }}</td>
                    <td>{{ item.fechaCierre || 'Sin cierre' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="page__state">No hay oportunidades de mejora para los filtros seleccionados.</div>
        }
      </section>
    </section>
  `,
  styles: [`
    .page { padding: 18px 22px 26px; max-width: 1240px; margin: 0 auto; display: grid; gap: 14px; }
    .page__header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
    .page__eyebrow { margin: 0 0 6px; font-size: .7rem; font-weight: 700; letter-spacing: .1em; color: #667085; text-transform: uppercase; }
    .page__header h1 { margin: 0; color: #1f2937; font-size: 1.45rem; }
    .page__subtitle { margin: 6px 0 0; color: #667085; max-width: 780px; font-size: .84rem; line-height: 1.55; }
    .page__link { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; padding: 0 14px; border-radius: 999px; text-decoration: none; background: rgba(127,23,20,.08); color: #7f1714; font-weight: 600; font-size: .82rem; }
    .page__state { border-radius: 12px; padding: 14px 16px; background: rgba(255,255,255,.92); border: 1px solid rgba(15,23,42,.08); color: #526274; font-size: .84rem; }
    .page__state--error { color: #a12622; }
    .filters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: end; }
    .field { display: grid; gap: 6px; color: #415065; font-size: .8rem; }
    input, select { width: 100%; border: 1px solid #d0d7e2; border-radius: 10px; padding: 10px 12px; font: inherit; background: #fff; color: #223042; box-sizing: border-box; }
    .filters__actions { display: flex; justify-content: flex-end; }
    .summary-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .summary-strip div, .panel { border-radius: 14px; background: rgba(255,255,255,.96); border: 1px solid rgba(15,23,42,.08); box-shadow: 0 10px 24px rgba(15,23,42,.06); }
    .summary-strip div { padding: 10px 12px; display: grid; gap: 3px; }
    .summary-strip span { font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; color: #667085; font-weight: 700; }
    .summary-strip strong { color: #1f2937; font-size: .82rem; }
    .panel { padding: 16px; display: grid; gap: 12px; }
    .panel__header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .panel__header h2 { margin: 0; font-size: .94rem; color: #1f2937; }
    .panel__header p { margin: 4px 0 0; color: #667085; font-size: .78rem; line-height: 1.5; }
    .primary-button, .secondary-link { display: inline-flex; align-items: center; justify-content: center; min-height: 36px; border-radius: 10px; padding: 0 14px; font-size: .8rem; font-weight: 600; text-decoration: none; font: inherit; }
    .primary-button { border: none; background: #7f1714; color: #fff; cursor: pointer; }
    .secondary-link { border: 1px solid rgba(127,23,20,.12); background: rgba(127,23,20,.05); color: #7f1714; cursor: pointer; }
    .table-wrapper { overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 920px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid rgba(15,23,42,.08); text-align: left; font-size: .78rem; color: #334155; vertical-align: top; }
    th { color: #64748b; text-transform: uppercase; letter-spacing: .05em; font-size: .68rem; }
    @media (max-width: 900px) { .filters, .summary-strip { grid-template-columns: 1fr; } }
  `]
})
export class ReportesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly reportesService = inject(ReportesService);
  private readonly toastService = inject(UiToastService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly avances = signal<ReporteAvance[]>([]);
  readonly resultados = signal<ReporteResultado[]>([]);
  readonly oportunidades = signal<ReporteOportunidadMejora[]>([]);

  readonly filtersForm = this.fb.group({
    evaluatedId: [null as number | null],
    estadoCodigo: ['']
  });

  constructor() {
    this.loadAll();
  }

  loadAll(): void {
    const { evaluatedId, estadoCodigo } = this.filtersForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');

    this.reportesService.getReporteAvance(evaluatedId).subscribe({
      next: (data) => this.avances.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.reportesService.getReporteResultados(evaluatedId).subscribe({
      next: (data) => this.resultados.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.reportesService.getReporteOportunidades(evaluatedId, estadoCodigo || null).subscribe({
      next: (data) => {
        this.oportunidades.set(data);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  exportAvance(): void {
    this.reportesService.exportarReporteAvance(this.filtersForm.getRawValue().evaluatedId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'reporte_avance_gdr.csv');
        this.toastService.success('Reporte exportado', 'Se descargo el CSV de avance.');
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  exportResultados(): void {
    this.reportesService.exportarReporteResultados(this.filtersForm.getRawValue().evaluatedId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'reporte_resultados_gdr.csv');
        this.toastService.success('Reporte exportado', 'Se descargo el CSV de resultados.');
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  exportOportunidades(): void {
    const { evaluatedId, estadoCodigo } = this.filtersForm.getRawValue();
    this.reportesService.exportarReporteOportunidades(evaluatedId, estadoCodigo || null).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'reporte_oportunidades_mejora_gdr.csv');
        this.toastService.success('Reporte exportado', 'Se descargo el CSV de oportunidades de mejora.');
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }
}
