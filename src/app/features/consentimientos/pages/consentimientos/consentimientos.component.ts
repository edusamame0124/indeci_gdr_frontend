import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ConsentimientoHistorial,
  ConsentimientoResumen
} from '../../../../core/consentimientos/consentimientos.models';
import { ConsentimientosService } from '../../../../core/consentimientos/consentimientos.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

@Component({
  selector: 'app-consentimientos',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './consentimientos.component.html',
  styleUrl: './consentimientos.component.css'
})
export class ConsentimientosComponent {
  private readonly fb = inject(FormBuilder);
  private readonly consentimientosService = inject(ConsentimientosService);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

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
