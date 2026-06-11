import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../../core/auth/auth.service';
import { CieConformacionApiService } from '../../../../../core/cie-conformacion/cie-conformacion-api.service';
import { CicloNavService } from '../../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../../shared/ui/cycle-context-bar.component';
import {
  CieConformacion,
  IntegranteFormItem,
  RegistrarCieConformacionRequest,
  ROL_CIE_LABELS,
  ROLES_CIE
} from '../../../../../core/cie-conformacion/cie-conformacion.models';

const INTEGRANTE_VACIO: IntegranteFormItem = {
  rolCie: '',
  segmento: '',
  idPersona: null,
  nombreExterno: '',
  cargoDescripcion: '',
  fechaInicio: '',
  fechaFin: ''
};

/**
 * Conformación configurable del CIE.
 * POSIBLE_CAMBIO_RRHH_GDR_001 — Referencia: RPE 068-2020-SERVIR-PE Art. 42-48.
 */
@Component({
  selector: 'app-cie-conformacion',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, CycleContextBarComponent],
  templateUrl: './cie-conformacion.component.html',
  styleUrl: './cie-conformacion.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CieConformacionComponent {
  private readonly api = inject(CieConformacionApiService);
  protected readonly auth = inject(AuthService);
  readonly cicloNavService = inject(CicloNavService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly conformaciones = signal<CieConformacion[]>([]);
  readonly seleccionada = signal<CieConformacion | null>(null);
  readonly modoForm = signal(false);
  readonly guardando = signal(false);
  readonly confirmandoAnular = signal<number | null>(null);
  readonly anulando = signal(false);
  readonly exitoMensaje = signal<string | null>(null);

  readonly rolesLabels = ROL_CIE_LABELS;
  readonly rolesCie = ROLES_CIE;

  readonly resolucionNumero = signal('');
  readonly resolucionFecha = signal('');
  readonly vigenciaInicio = signal('');
  readonly vigenciaFin = signal('');
  readonly observaciones = signal('');
  readonly integrantes = signal<IntegranteFormItem[]>([{ ...INTEGRANTE_VACIO }]);

  readonly puedeRegistrar = computed(() =>
    this.auth.hasAnyRole(['ROLE_GDR_ORH', 'ROLE_GDR_TITULAR', 'ROLE_ADMIN_SISTEMA'])
  );

  readonly vigentesCount = computed(() =>
    this.conformaciones().filter(c => c.estado === 'VIGENTE').length
  );

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listar().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: data => this.conformaciones.set(data),
      error: () => this.error.set('No se pudo cargar la lista de conformaciones del CIE.')
    });
  }

  seleccionar(conf: CieConformacion): void {
    this.seleccionada.set(this.seleccionada()?.id === conf.id ? null : conf);
  }

  abrirForm(): void {
    this.modoForm.set(true);
    this.seleccionada.set(null);
    this.resetForm();
  }

  cancelarForm(): void {
    this.modoForm.set(false);
    this.resetForm();
  }

  agregarIntegrante(): void {
    this.integrantes.update(lista => [...lista, { ...INTEGRANTE_VACIO }]);
  }

  quitarIntegrante(index: number): void {
    this.integrantes.update(lista => lista.filter((_, i) => i !== index));
  }

  actualizarIntegrante(index: number, campo: keyof IntegranteFormItem, valor: string): void {
    this.integrantes.update(lista => {
      const copia = [...lista];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  }

  guardar(): void {
    const request = this.buildRequest();
    if (!request) return;

    this.guardando.set(true);
    this.api.registrar(request).pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: nueva => {
        this.conformaciones.update(lista => [nueva, ...lista]);
        this.modoForm.set(false);
        this.resetForm();
        this.mostrarExito('Conformación CIE registrada correctamente.');
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'No se pudo registrar la conformación.';
        this.error.set(msg);
      }
    });
  }

  iniciarAnular(id: number): void {
    this.confirmandoAnular.set(id);
  }

  cancelarAnular(): void {
    this.confirmandoAnular.set(null);
  }

  confirmarAnular(id: number): void {
    this.anulando.set(true);
    this.api.anular(id).pipe(finalize(() => this.anulando.set(false))).subscribe({
      next: actualizada => {
        this.conformaciones.update(lista =>
          lista.map(c => c.id === id ? actualizada : c)
        );
        this.confirmandoAnular.set(null);
        this.seleccionada.set(null);
        this.mostrarExito('Conformación anulada.');
      },
      error: () => this.error.set('No se pudo anular la conformación.')
    });
  }

  estadoBadge(estado: string): string {
    if (estado === 'VIGENTE') return 'badge badge--verde';
    if (estado === 'ANULADO') return 'badge badge--rojo';
    return 'badge badge--gris';
  }

  // ── private ──────────────────────────────────────────────────────────────

  private buildRequest(): RegistrarCieConformacionRequest | null {
    if (!this.vigenciaInicio()) {
      this.error.set('La fecha de inicio de vigencia es obligatoria.');
      return null;
    }
    const integrantesValidos = this.integrantes().filter(i => i.rolCie && (i.nombreExterno.trim() || i.idPersona));
    if (integrantesValidos.length === 0) {
      this.error.set('Agregue al menos un integrante con rol y nombre.');
      return null;
    }
    const tieneOrh = integrantesValidos.some(i => i.rolCie === 'TITULAR_ORH');
    if (!tieneOrh) {
      this.error.set('El CIE debe incluir un integrante con rol TITULAR_ORH (Jefe de ORH o representante).');
      return null;
    }
    this.error.set(null);
    return {
      cycleId: null,
      resolucionNumero: this.resolucionNumero().trim(),
      resolucionFecha: this.resolucionFecha() || null,
      vigenciaInicio: this.vigenciaInicio(),
      vigenciaFin: this.vigenciaFin() || null,
      observaciones: this.observaciones().trim(),
      integrantes: integrantesValidos.map(i => ({
        rolCie: i.rolCie,
        segmento: i.segmento.trim() || null,
        idPersona: i.idPersona,
        nombreExterno: i.nombreExterno.trim() || null,
        cargoDescripcion: i.cargoDescripcion.trim() || null,
        fechaInicio: i.fechaInicio,
        fechaFin: i.fechaFin || null
      }))
    };
  }

  private resetForm(): void {
    this.resolucionNumero.set('');
    this.resolucionFecha.set('');
    this.vigenciaInicio.set('');
    this.vigenciaFin.set('');
    this.observaciones.set('');
    this.integrantes.set([{ ...INTEGRANTE_VACIO }]);
  }

  private mostrarExito(msg: string): void {
    this.exitoMensaje.set(msg);
    setTimeout(() => this.exitoMensaje.set(null), 4000);
  }
}
