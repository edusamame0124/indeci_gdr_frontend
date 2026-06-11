import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CicloConCronogramaResponse, CronogramaEtapaResponse } from '../../../../core/admin/cycles.models';
import { GdrCronogramaApiService } from '../../../../core/admin/gdr-cronograma-api.service';
import { functionalActorLabel } from '../../../../shared/utils/functional-actor-label.util';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';
import { CronogramaAvanceChecklistCardComponent } from './components/cronograma-avance-checklist-card/cronograma-avance-checklist-card.component';
import { CronogramaAvanceChecklistResult } from './models/cronograma-avance-checklist.model';
import { CronogramaAvanceChecklistService } from './services/cronograma-avance-checklist.service';
import { ETAPAS_CRONOGRAMA_TOTAL } from './utils/cronograma-avance-checklist.util';

interface EtapaEditState {
  etapa: string;
  fechaInicio: string;
  fechaFin: string;
  saving: boolean;
}

/** Etapas normativas RPE 068-2020 — plantilla cuando el ciclo aún no tiene filas en BD. */
const ETAPAS_NORMATIVAS: ReadonlyArray<Pick<CronogramaEtapaResponse, 'etapa' | 'etapaLabel'>> = [
  { etapa: 'PLANIFICACION', etapaLabel: 'Planificación' },
  { etapa: 'SEGUIMIENTO', etapaLabel: 'Seguimiento' },
  { etapa: 'EVALUACION', etapaLabel: 'Evaluación' },
  { etapa: 'RETROALIMENTACION', etapaLabel: 'Retroalimentación' },
  { etapa: 'CONFIRMACION', etapaLabel: 'Confirmación de calificación' },
  { etapa: 'DISTINGUIDO', etapaLabel: 'Rendimiento distinguido' },
  { etapa: 'CIERRE', etapaLabel: 'Cierre del ciclo' },
];

const TRANSICION_LABEL: Record<string, string> = {
  EN_PLANIFICACION: 'planificación',
  EN_SEGUIMIENTO: 'seguimiento',
  EN_EVALUACION: 'evaluación',
  EN_CONFIRMACION: 'confirmación',
  EN_RENDIMIENTO_DISTINGUIDO: 'rendimiento distinguido',
  CERRADO: 'cierre',
};

const ESTADO_PLANIFICACION = 'EN_PLANIFICACION';

function mergeCronogramaConPlantilla(cronograma: CronogramaEtapaResponse[]): CronogramaEtapaResponse[] {
  const byEtapa = new Map(cronograma.map((item) => [item.etapa, item]));
  return ETAPAS_NORMATIVAS.map(({ etapa, etapaLabel }) => {
    const saved = byEtapa.get(etapa);
    if (saved) {
      return saved;
    }
    return {
      id: null,
      etapa,
      etapaLabel,
      fechaInicio: null,
      fechaFin: null,
      fechaFinNormativa: null,
      estado: 'PENDIENTE',
      vencida: false,
      diasRestantes: 0,
    };
  });
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message.trim();
  }
  return fallback;
}

@Component({
  selector: 'app-ciclo-cronograma',
  standalone: true,
  imports: [DatePipe, RouterLink, CronogramaAvanceChecklistCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ciclo-cronograma.component.html',
  styleUrl: './ciclo-cronograma.component.css'
})
export class CicloCronogramaComponent {
  private readonly cronogramaService = inject(GdrCronogramaApiService);
  private readonly authService = inject(AuthService);
  readonly cicloNavService = inject(CicloNavService);
  private readonly toastService = inject(UiToastService);
  private readonly avanceChecklistService = inject(CronogramaAvanceChecklistService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly ciclo = signal<CicloConCronogramaResponse | null>(null);
  readonly avanzando = signal(false);
  readonly editingEtapa = signal<string | null>(null);
  readonly editState = signal<EtapaEditState | null>(null);
  readonly editError = signal<string | null>(null);
  readonly previewOpen = signal(false);
  readonly avanceChecklist = signal<CronogramaAvanceChecklistResult | null>(null);
  readonly avanceChecklistLoading = signal(false);
  readonly avanceRechazoServidor = signal<string | null>(null);

  readonly canEdit = computed(() => this.authService.featureAccess()?.canEditCronograma ?? false);
  readonly etapasTotal = ETAPAS_CRONOGRAMA_TOTAL;

  readonly etapasParaMostrar = computed((): CronogramaEtapaResponse[] => {
    const ciclo = this.ciclo();
    if (!ciclo) {
      return [];
    }
    const cronograma = ciclo.cronograma ?? [];
    if (this.canEdit() || cronograma.length > 0) {
      return mergeCronogramaConPlantilla(cronograma);
    }
    return [];
  });

  readonly etapasConfiguradas = computed(() =>
    this.etapasParaMostrar().filter((e) => e.fechaInicio && e.fechaFin).length
  );

  readonly progresoPorcentaje = computed(() =>
    Math.round((this.etapasConfiguradas() / this.etapasTotal) * 100)
  );

  readonly puedeAvanzarEtapa = computed(() =>
    this.canEdit()
    && this.etapasConfiguradas() === this.etapasTotal
    && (this.ciclo()?.transicionesDisponibles.length ?? 0) > 0
    && (this.avanceChecklist()?.canAdvance ?? false)
    && !this.avanceChecklistLoading()
  );

  readonly mostrarChecklistAvance = computed(() => {
    const ciclo = this.ciclo();
    const checklist = this.avanceChecklist();
    if (!this.canEdit() || !ciclo || !checklist) {
      return false;
    }
    if (ciclo.estadoEtapa !== ESTADO_PLANIFICACION) {
      return false;
    }
    return !checklist.canAdvance || this.avanceRechazoServidor() !== null;
  });

  readonly actorResponsable = computed(() =>
    functionalActorLabel(this.authService.currentContext()?.functionalActor)
  );

  readonly showAlertaOperativa = computed(() =>
    this.canEdit() && this.progresoPorcentaje() < 100
  );

  readonly avanzarEtapaLabel = computed(() => {
    const transicion = this.ciclo()?.transicionesDisponibles[0];
    if (!transicion) return 'Avanzar etapa';
    const label = TRANSICION_LABEL[transicion] ?? transicion.toLowerCase().replace(/^en_/, '');
    return `Avanzar a ${label}`;
  });

  constructor() {
    this.load();
  }

  load(): void {
    const cicloId = this.cicloNavService.cicloId();
    if (!cicloId) {
      this.error.set('No se pudo identificar el ciclo. Regrese al selector y elija un ciclo.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.cronogramaService.getCronograma(cicloId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.ciclo.set(data);
          this.refreshAvanceChecklist(cicloId);
        },
        error: (err) => this.error.set(extractErrorMessage(err, 'Error al cargar el cronograma.'))
      });
  }

  private refreshAvanceChecklist(cycleId: number): void {
    const ciclo = this.ciclo();
    if (!ciclo || !this.canEdit() || ciclo.estadoEtapa !== ESTADO_PLANIFICACION) {
      this.avanceChecklist.set(null);
      return;
    }

    this.avanceChecklistLoading.set(true);
    this.avanceChecklistService
      .loadChecklist(cycleId, ciclo, this.etapasParaMostrar())
      .pipe(finalize(() => this.avanceChecklistLoading.set(false)))
      .subscribe({
        next: (checklist) => {
          this.avanceChecklist.set(checklist);
          if (checklist.canAdvance) {
            this.avanceRechazoServidor.set(null);
          }
        },
      });
  }

  togglePreview(): void {
    this.previewOpen.update((open) => !open);
  }

  avanzarEtapa(): void {
    if (!this.puedeAvanzarEtapa()) return;
    const id = this.ciclo()?.id;
    if (!id) return;
    this.avanzando.set(true);
    this.cronogramaService.avanzarEtapa(id)
      .pipe(finalize(() => this.avanzando.set(false)))
      .subscribe({
        next: (data) => {
          this.avanceRechazoServidor.set(null);
          this.ciclo.set(data);
          this.toastService.success('Etapa avanzada', `El ciclo avanzó a: ${data.estadoEtapaLabel}.`);
        },
        error: (err) => {
          const detail = extractErrorMessage(
            err,
            'Verifique los requisitos normativos e intente nuevamente.'
          );
          this.avanceRechazoServidor.set(detail);
          this.toastService.error('No se pudo avanzar la etapa', detail);
          this.refreshAvanceChecklist(id);
        }
      });
  }

  startEdit(etapa: CronogramaEtapaResponse): void {
    const ciclo = this.ciclo();
    this.editingEtapa.set(etapa.etapa);
    this.editState.set({
      etapa: etapa.etapa,
      fechaInicio: etapa.fechaInicio ?? ciclo?.startDate ?? '',
      fechaFin: etapa.fechaFin ?? ciclo?.endDate ?? '',
      saving: false
    });
    this.editError.set(null);
  }

  cancelEdit(): void {
    this.editingEtapa.set(null);
    this.editState.set(null);
    this.editError.set(null);
  }

  onEditField(field: 'fechaInicio' | 'fechaFin', value: string): void {
    const cur = this.editState();
    if (cur) this.editState.set({ ...cur, [field]: value });
  }

  saveEtapa(event: Event): void {
    event.preventDefault();
    const state = this.editState();
    const cycleId = this.ciclo()?.id;
    if (!state || !cycleId) return;
    if (!state.fechaInicio || !state.fechaFin) {
      this.editError.set('Las dos fechas son obligatorias.');
      return;
    }
    this.editState.set({ ...state, saving: true });
    this.editError.set(null);
    this.cronogramaService.upsertEtapa(cycleId, state.etapa, {
      fechaInicio: state.fechaInicio,
      fechaFin: state.fechaFin
    }).subscribe({
      next: () => {
        this.cancelEdit();
        this.load();
        this.toastService.success('Fechas guardadas', 'Las fechas de la etapa fueron actualizadas.');
      },
      error: (err) => {
        this.editState.set({ ...state, saving: false });
        this.editError.set(extractErrorMessage(err, 'Error al guardar la etapa.'));
      }
    });
  }

  etapaEstadoLabel(estado: string, etapa: CronogramaEtapaResponse): string {
    if (etapa.fechaInicio && etapa.fechaFin && estado === 'PENDIENTE') {
      return 'Completada';
    }
    const MAP: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      EN_CURSO: 'En curso',
      COMPLETADA: 'Completada',
    };
    return MAP[estado] ?? estado;
  }

  etapaEstadoVisual(estado: string, etapa: CronogramaEtapaResponse): string {
    if (etapa.fechaInicio && etapa.fechaFin && estado === 'PENDIENTE') {
      return 'COMPLETADA';
    }
    return estado;
  }

  etapaTieneFechas(etapa: CronogramaEtapaResponse): boolean {
    return !!(etapa.fechaInicio && etapa.fechaFin);
  }
}
