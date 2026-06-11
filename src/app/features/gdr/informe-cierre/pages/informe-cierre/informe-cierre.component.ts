import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../../core/auth/auth.service';
import { InformeCierreApiService } from '../../../../../core/informe-cierre/informe-cierre-api.service';
import {
  InformeCierreAlerta,
  InformeCierreConsolidado
} from '../../../../../core/informe-cierre/informe-cierre.models';
import { downloadBlob } from '../../../../../shared/utils/download-blob.util';
import { CicloNavService } from '../../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../../shared/ui/cycle-context-bar.component';
import { UiToastService } from '../../../../../shared/ui/ui-toast.service';

const OBSERVACIONES_MAX = 4000;

@Component({
  selector: 'app-informe-cierre',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './informe-cierre.component.html',
  styleUrl: './informe-cierre.component.css'
})
export class InformeCierreComponent {
  private readonly api = inject(InformeCierreApiService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

  readonly observacionesMax = OBSERVACIONES_MAX;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly vistaPrevia = signal<InformeCierreConsolidado | null>(null);
  readonly alerta = signal<InformeCierreAlerta | null>(null);
  readonly historial = signal<InformeCierreConsolidado[]>([]);
  readonly observacionesOrh = signal('');
  readonly formError = signal<string | null>(null);
  readonly generando = signal(false);
  readonly descargandoPdf = signal(false);
  readonly exportandoCsv = signal(false);
  readonly informeSeleccionado = signal<number | null>(null);

  readonly canGenerar = computed(() =>
    this.authService.featureAccess()?.canGenerarInformeCierre ?? false
  );

  readonly alertaClase = computed(() => {
    const nivel = this.alerta()?.nivelSemaforo ?? 'OK';
    if (nivel === 'CRITICO' || nivel === 'INDEFINIDO') {
      return 'alerta--critico';
    }
    if (nivel === 'ADVERTENCIA') {
      return 'alerta--advertencia';
    }
    return 'alerta--ok';
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.obtenerVistaPrevia()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (preview) => this.vistaPrevia.set(preview),
        error: (err) => this.error.set(err?.error?.message ?? 'No se pudo cargar la vista previa del informe.')
      });
    this.api.obtenerAlertaVal06().subscribe({
      next: (alerta) => this.alerta.set(alerta),
      error: () => undefined
    });
    this.api.listarHistorial().subscribe({
      next: (items) => this.historial.set(items),
      error: () => undefined
    });
  }

  onObservacionesChange(value: string): void {
    this.observacionesOrh.set(value);
    if (this.formError()) {
      this.formError.set(null);
    }
  }

  generarInforme(): void {
    const texto = this.observacionesOrh().trim();
    if (texto.length > OBSERVACIONES_MAX) {
      this.formError.set(`Las observaciones no pueden superar ${OBSERVACIONES_MAX} caracteres.`);
      return;
    }
    this.formError.set(null);
    this.generando.set(true);
    this.api.generar({ observacionesOrh: texto || null })
      .pipe(finalize(() => this.generando.set(false)))
      .subscribe({
        next: (informe) => {
          this.historial.update((items) => [informe, ...items]);
          this.informeSeleccionado.set(informe.informeId);
          this.observacionesOrh.set('');
          this.toastService.success('Informe generado', 'El informe de cierre fue registrado correctamente.');
        },
        error: (err) => this.toastService.error(
          'No se pudo generar el informe',
          err?.error?.message ?? 'Verifique los requisitos e intente nuevamente.'
        )
      });
  }

  seleccionarInforme(informeId: number | null): void {
    this.informeSeleccionado.set(informeId);
  }

  descargarPdf(informeId: number): void {
    this.descargandoPdf.set(true);
    this.api.descargarPdf(informeId)
      .pipe(finalize(() => this.descargandoPdf.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `informe_cierre_${informeId}.pdf`),
        error: (err) => this.toastService.error('Error al descargar', err?.error?.message ?? 'No se pudo descargar el PDF.')
      });
  }

  exportarCsv(informeId: number): void {
    this.exportandoCsv.set(true);
    this.api.exportarCsv(informeId)
      .pipe(finalize(() => this.exportandoCsv.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `informe_cierre_${informeId}.csv`),
        error: (err) => this.toastService.error('Error al exportar', err?.error?.message ?? 'No se pudo exportar el CSV.')
      });
  }
}
