import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuditApiService } from '../../../../../core/audit/audit-api.service';
import { AuditEvent } from '../../../../../core/audit/audit.models';
import { downloadBlob } from '../../../../../shared/utils/download-blob.util';
import { CycleContextBarComponent } from '../../../../../shared/ui/cycle-context-bar.component';
import { CicloNavService } from '../../../../../core/gdr/ciclo-nav.service';

@Component({
  selector: 'app-auditoria-gdr',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auditoria-gdr.component.html',
  styleUrl: './auditoria-gdr.component.css'
})
export class AuditoriaGdrComponent {
  private readonly api = inject(AuditApiService);
  private readonly fb = inject(FormBuilder);
  readonly cicloNavService = inject(CicloNavService);

  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly downloadError = signal<string | null>(null);
  readonly eventos = signal<AuditEvent[]>([]);
  readonly totalElements = signal(0);
  readonly page = signal(0);

  readonly filtersForm = this.fb.group({
    eventCode: [''],
    principal: [''],
    from: [''],
    to: ['']
  });

  constructor() {
    this.buscar(0);
  }

  buscar(page: number): void {
    const raw = this.filtersForm.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.page.set(page);
    this.api.buscarEventos({
      eventCode: raw.eventCode || null,
      principal: raw.principal || null,
      from: raw.from ? `${raw.from}T00:00:00` : null,
      to: raw.to ? `${raw.to}T23:59:59` : null,
      page,
      size: 25
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (pageData) => {
          this.eventos.set(pageData.content);
          this.totalElements.set(pageData.totalElements);
        },
        error: (err) => this.error.set(err?.error?.message ?? 'No se pudo consultar la auditoría.')
      });
  }

  paginaAnterior(): void {
    const current = this.page();
    if (current > 0) {
      this.buscar(current - 1);
    }
  }

  paginaSiguiente(): void {
    this.buscar(this.page() + 1);
  }

  exportarCsv(): void {
    const raw = this.filtersForm.getRawValue();
    this.exporting.set(true);
    this.downloadError.set(null);
    this.api.exportarCsv({
      eventCode: raw.eventCode || null,
      principal: raw.principal || null,
      from: raw.from ? `${raw.from}T00:00:00` : null,
      to: raw.to ? `${raw.to}T23:59:59` : null,
      page: this.page(),
      size: 100
    })
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, 'auditoria_gdr.csv'),
        error: (err) => this.downloadError.set(err?.error?.message ?? 'No se pudo exportar la auditoría.')
      });
  }
}
