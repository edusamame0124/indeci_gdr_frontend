import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';
import { CasoCie, SolicitudConfirmacion } from '../../../../core/confirmacion/confirmacion.models';
import {
  ReporteAvance,
  ReporteDistribucionCalificacion,
  ReporteOportunidadMejora,
  ReporteResultado
} from '../../../../core/reportes/reportes.models';
import { ReportesService } from '../../../../core/reportes/reportes.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly reportesService = inject(ReportesService);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly avances = signal<ReporteAvance[]>([]);
  readonly resultados = signal<ReporteResultado[]>([]);
  readonly oportunidades = signal<ReporteOportunidadMejora[]>([]);
  readonly confirmaciones = signal<SolicitudConfirmacion[]>([]);
  readonly casosCie = signal<CasoCie[]>([]);
  readonly distribucion = signal<ReporteDistribucionCalificacion[]>([]);

  readonly filtersForm = this.fb.group({
    evaluatedId: [null as number | null],
    estadoCodigo: ['']
  });

  constructor() {
    this.loadAll();
  }

  loadAll(): void {
    const { evaluatedId, estadoCodigo } = this.filtersForm.getRawValue();
    const cycleId = this.cicloNavService.cicloId()!;
    this.loading.set(true);
    this.errorMessage.set('');

    this.reportesService.getReporteAvance(cycleId, evaluatedId).subscribe({
      next: (data) => this.avances.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.reportesService.getReporteResultados(cycleId, evaluatedId).subscribe({
      next: (data) => this.resultados.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.reportesService.getReporteOportunidades(cycleId, evaluatedId, estadoCodigo || null).subscribe({
      next: (data) => this.oportunidades.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.reportesService.getReporteConfirmaciones().subscribe({
      next: (data) => this.confirmaciones.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.reportesService.getReporteCie().subscribe({
      next: (data) => this.casosCie.set(data),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.reportesService.getReporteDistribucion(cycleId).subscribe({
      next: (data) => {
        this.distribucion.set(data);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  exportAvance(): void {
    const cycleId = this.cicloNavService.cicloId()!;
    this.reportesService.exportarReporteAvance(cycleId, this.filtersForm.getRawValue().evaluatedId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'reporte_avance_gdr.csv');
        this.toastService.success('Reporte exportado', 'Se descargo el CSV de avance.');
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  exportResultados(): void {
    const cycleId = this.cicloNavService.cicloId()!;
    this.reportesService.exportarReporteResultados(cycleId, this.filtersForm.getRawValue().evaluatedId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'reporte_resultados_gdr.csv');
        this.toastService.success('Reporte exportado', 'Se descargo el CSV de resultados.');
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  exportConfirmaciones(): void {
    this.reportesService.exportarReporteConfirmaciones().subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'reporte_confirmaciones_gdr.csv');
        this.toastService.success('Reporte exportado', 'Se descargó el CSV de confirmaciones.');
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  exportCie(): void {
    this.reportesService.exportarReporteCie().subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'reporte_cie_gdr.csv');
        this.toastService.success('Reporte exportado', 'Se descargó el CSV de casos CIE.');
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  exportDistribucion(): void {
    this.reportesService.exportarReporteDistribucion(this.cicloNavService.cicloId()!).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'reporte_distribucion_calificaciones_gdr.csv');
        this.toastService.success('Reporte exportado', 'Se descargó el CSV de distribución.');
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  exportOportunidades(): void {
    const { evaluatedId, estadoCodigo } = this.filtersForm.getRawValue();
    this.reportesService.exportarReporteOportunidades(this.cicloNavService.cicloId()!, evaluatedId, estadoCodigo || null).subscribe({
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
