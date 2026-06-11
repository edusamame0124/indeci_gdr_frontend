import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentsService } from '../../../../core/documents/documents.service';
import { DocumentoFirmadoDetalle } from '../../../../core/documents/documents.models';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';

@Component({
  selector: 'app-signed-document-detail',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <div class="page__header">
        <div>
          <p class="page__eyebrow">Lote 4</p>
          <h1>Detalle de documento firmado</h1>
          <p class="page__subtitle">
            Consulta minima del documento almacenado de forma desacoplada y vinculado al resultado consolidado.
          </p>
        </div>
        <a
          [routerLink]="cicloNavService.moduleRoute('documentos')"
          [queryParams]="detail() ? { evaluatedId: detail()!.idEvaluado } : null"
          class="page__link"
        >
          Volver a documentos
        </a>
      </div>

      @if (errorMessage()) {
        <div class="page__state page__state--error">{{ errorMessage() }}</div>
      }

      @if (loading()) {
        <div class="page__state">Cargando documento firmado...</div>
      } @else if (detail()) {
        <div class="summary-strip">
          <div>
            <span>Resultado</span>
            <strong>#{{ detail()!.idResultado }}</strong>
          </div>
          <div>
            <span>Evaluado</span>
            <strong>{{ detail()!.evaluado }}</strong>
          </div>
          <div>
            <span>Tipo documental</span>
            <strong>{{ detail()!.tipoDocumento }}</strong>
          </div>
          <div>
            <span>Estado</span>
            <strong><span class="status-pill">{{ detail()!.estado }}</span></strong>
          </div>
        </div>

        <section class="layout-grid">
          <article class="panel">
            <header class="panel__header">
              <div>
                <h2>Metadata documental</h2>
                <p>Datos minimos persistidos en Oracle para la trazabilidad del lote actual.</p>
              </div>
            </header>

            <div class="detail-stack">
              <div class="detail-row">
                <span>Codigo tipo documental</span>
                <strong>{{ detail()!.codigoTipoDocumento }}</strong>
              </div>
              @if (detail()!.descripcionContingencia) {
                <div class="detail-row">
                  <span>DESCRIPCION</span>
                  <strong class="detail-row__multiline">{{ detail()!.descripcionContingencia }}</strong>
                </div>
              }
              <div class="detail-row">
                <span>Nombre original</span>
                <strong>{{ detail()!.nombreOriginal }}</strong>
              </div>
              <div class="detail-row">
                <span>Mime type</span>
                <strong>{{ detail()!.mimeType }}</strong>
              </div>
              <div class="detail-row">
                <span>Tamano</span>
                <strong>{{ formatSize(detail()!.tamanioBytes) }}</strong>
              </div>
              <div class="detail-row">
                <span>Version actual</span>
                <strong>{{ detail()!.versionActual }}</strong>
              </div>
              <div class="detail-row">
                <span>Usuario de carga</span>
                <strong>{{ detail()!.usuarioCarga }}</strong>
              </div>
              <div class="detail-row">
                <span>Fecha de carga</span>
                <strong>{{ detail()!.fechaCarga }}</strong>
              </div>
              <div class="detail-row">
                <span>Evaluador</span>
                <strong>{{ detail()!.evaluador }}</strong>
              </div>
              <div class="detail-row">
                <span>Ciclo</span>
                <strong>{{ detail()!.ciclo }}</strong>
              </div>
            </div>

            <div class="action-row">
              <button type="button" class="primary-link" (click)="downloadDocument()">Descargar documento</button>
              <button type="button" class="secondary-link" (click)="openPreviewWindow()">Abrir preview</button>
            </div>
          </article>

          <article class="panel">
            <header class="panel__header">
              <div>
                <h2>Preview seguro</h2>
                <p>Visualizacion a partir de la metadata persistida y la ruta interna generada por el sistema.</p>
              </div>
            </header>

            @if (previewUrl()) {
              <iframe class="preview-frame" [src]="previewUrl()" title="Preview del documento firmado"></iframe>
            } @else {
              <div class="page__state">No se pudo preparar la vista previa del documento.</div>
            }
          </article>
        </section>
      }
    </section>
  `,
  styles: [`
    .page { padding:18px 22px 26px; max-width:1180px; margin:0 auto; display:grid; gap:14px; }
    .page__header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; flex-wrap:wrap; }
    .page__eyebrow { margin:0 0 6px; font-size:0.7rem; font-weight:700; letter-spacing:0.1em; color:#667085; text-transform:uppercase; }
    .page__header h1 { margin:0; color:#1f2937; font-size:1.45rem; }
    .page__subtitle { margin:6px 0 0; color:#667085; max-width:760px; font-size:0.84rem; line-height:1.55; }
    .page__link { display:inline-flex; align-items:center; justify-content:center; min-height:36px; padding:0 14px; border-radius:999px; text-decoration:none; background:rgba(127,23,20,0.08); color:#7f1714; font-weight:600; font-size:0.82rem; }
    .page__state { border-radius:12px; padding:14px 16px; background:rgba(255,255,255,0.92); border:1px solid rgba(15,23,42,0.08); color:#526274; font-size:0.84rem; }
    .page__state--error { color:#a12622; }
    .summary-strip { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; }
    .summary-strip div { border-radius:12px; background:#fff; border:1px solid rgba(15,23,42,0.08); padding:10px 12px; display:grid; gap:3px; }
    .summary-strip span { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#667085; font-weight:700; }
    .summary-strip strong { color:#1f2937; font-size:0.82rem; line-height:1.45; }
    .layout-grid { display:grid; grid-template-columns:minmax(320px, 420px) minmax(0, 1fr); gap:14px; align-items:start; }
    .panel { border-radius:14px; background:rgba(255,255,255,0.96); border:1px solid rgba(15,23,42,0.08); box-shadow:0 10px 24px rgba(15,23,42,0.06); padding:16px; display:grid; gap:14px; }
    .panel__header h2 { margin:0; font-size:0.94rem; color:#1f2937; }
    .panel__header p { margin:4px 0 0; color:#667085; font-size:0.78rem; line-height:1.5; }
    .detail-stack { display:grid; gap:10px; }
    .detail-row { display:grid; gap:3px; }
    .detail-row span { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:#667085; font-weight:700; }
    .detail-row strong { color:#1f2937; font-size:0.82rem; line-height:1.45; overflow-wrap:anywhere; }
    .detail-row__multiline { white-space:pre-wrap; font-weight:600; }
    .status-pill { display:inline-flex; align-items:center; justify-content:center; min-height:26px; padding:0 10px; border-radius:999px; background:rgba(15,23,42,0.04); color:#475467; font-size:0.74rem; font-weight:600; width:fit-content; }
    .action-row { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; }
    .primary-link, .secondary-link {
      display:inline-flex; align-items:center; justify-content:center; min-height:36px; border-radius:10px; padding:0 14px;
      font-size:0.8rem; font-weight:600; text-decoration:none; transition:background-color 0.18s ease, transform 0.18s ease;
      cursor:pointer; font:inherit;
    }
    .primary-link { border:none; background:#7f1714; color:#fff; }
    .secondary-link { border:1px solid rgba(127,23,20,0.12); background:rgba(127,23,20,0.05); color:#7f1714; }
    .primary-link:hover, .secondary-link:hover { transform:translateY(-1px); }
    .preview-frame { width:100%; min-height:720px; border:1px solid rgba(15,23,42,0.08); border-radius:12px; background:#fff; }
    @media (max-width: 980px) {
      .summary-strip, .layout-grid, .action-row { grid-template-columns:1fr; }
      .preview-frame { min-height:560px; }
    }
    @media (max-width: 720px) {
      .page { padding:14px 14px 22px; }
      .page__link, .primary-link, .secondary-link { width:100%; }
    }
  `]
})
export class SignedDocumentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly documentsService = inject(DocumentsService);
  readonly cicloNavService = inject(CicloNavService);

  readonly detail = signal<DocumentoFirmadoDetalle | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  private documentId = 0;

  constructor() {
    this.documentId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.loadDetail();
  }

  formatSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  downloadDocument(): void {
    if (!this.detail()) {
      return;
    }
    this.documentsService.getSignedDocumentFile(this.documentId, true).subscribe({
      next: (blob) => this.downloadBlob(blob, this.detail()!.nombreOriginal),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  openPreviewWindow(): void {
    if (!this.previewBlobUrl) {
      return;
    }
    window.open(this.previewBlobUrl, '_blank', 'noopener');
  }

  private loadDetail(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.documentsService.getSignedDocument(this.documentId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.documentsService.getSignedDocumentFile(this.documentId).subscribe({
          next: (blob) => {
            if (this.previewBlobUrl) {
              URL.revokeObjectURL(this.previewBlobUrl);
            }
            this.previewBlobUrl = URL.createObjectURL(blob);
            this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.previewBlobUrl));
            this.loading.set(false);
          },
          error: (error: Error) => {
            this.errorMessage.set(error.message);
            this.loading.set(false);
          }
        });
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
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

  private previewBlobUrl: string | null = null;
}
