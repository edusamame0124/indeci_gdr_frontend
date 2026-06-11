import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { FinalEvaluationSummary } from '../../../../core/final-evaluation/final-evaluation.models';
import { FinalEvaluationService } from '../../../../core/final-evaluation/final-evaluation.service';
import {
  DocumentoFirmadoResumen,
  FormatoGdrPdfDownload,
  HrOrgUnitOrganigrama,
  InicioFirma,
  PageResponse,
  PlantillaDocumento,
  RegistrarRetornoFirmaPayload,
  SolicitudFirmaDetalle,
  TipoDocumento
} from '../../../../core/documents/documents.models';
import { DocumentsService } from '../../../../core/documents/documents.service';
import { UiToastService } from '../../../../shared/ui/ui-toast.service';
import { CicloNavService } from '../../../../core/gdr/ciclo-nav.service';
import { CycleContextBarComponent } from '../../../../shared/ui/cycle-context-bar.component';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, DatePipe, CycleContextBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'
})
export class DocumentsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly finalEvaluationService = inject(FinalEvaluationService);
  private readonly documentsService = inject(DocumentsService);
  private readonly toastService = inject(UiToastService);
  readonly cicloNavService = inject(CicloNavService);

  readonly evaluatedId = signal<number | null>(null);
  readonly availableEvaluations = signal<FinalEvaluationSummary[]>([]);
  readonly documentTypes = signal<TipoDocumento[]>([]);
  readonly templates = signal<PlantillaDocumento[]>([]);
  readonly signedDocumentsPage = signal<PageResponse<DocumentoFirmadoResumen> | null>(null);
  readonly signedDocumentsPageIndex = signal(0);
  private readonly signedDocumentsPageSize = 10;
  readonly signedDocuments = computed(() => this.signedDocumentsPage()?.content ?? []);
  readonly signedDocumentsTotal = computed(() => this.signedDocumentsPage()?.totalElements ?? 0);
  readonly currentRequest = signal<SolicitudFirmaDetalle | null>(null);
  readonly lastStartInfo = signal<InicioFirma | null>(null);
  readonly loadingStatic = signal(true);
  readonly loadingEvaluations = signal(false);
  readonly loadingDocuments = signal(false);
  readonly uploading = signal(false);
  readonly preparing = signal(false);
  readonly starting = signal(false);
  readonly refreshingRequest = signal(false);
  readonly returning = signal(false);
  readonly returnModalOpen = signal(false);
  readonly downloadingFormatoGdr = signal(false);
  readonly errorMessage = signal('');
  /** Fila cuyo menú hamburguesa de acciones está abierto (null = ninguno). */
  readonly openActionsMenuId = signal<number | null>(null);
  /** Posición del popover en viewport (`position: fixed`) para evitar recorte por ancestors con overflow. */
  readonly actionsMenuViewportPosition = signal<{ top: number; right: number } | null>(null);
  readonly selectedFileName = signal('');
  readonly returnFileName = signal('');
  readonly firmarModalOpen = signal(false);
  readonly firmarTargetDocument = signal<DocumentoFirmadoResumen | null>(null);
  readonly firmarOfficeOptions = signal<HrOrgUnitOrganigrama[]>([]);
  readonly loadingFirmarCatalog = signal(false);
  readonly firmarOrgCatalogError = signal<string | null>(null);
  readonly selectedOrgUnitId = signal<number | null>(null);
  readonly firmarMotivo = signal('SOY_AUTOR');
  readonly firmarApariencia = signal('SELLO_DESC_HORIZ');

  readonly firmarMotivoOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'SOY_AUTOR', label: 'Soy el autor del documento' },
    { value: 'APRUEBO_CONTENIDO', label: 'Apruebo el contenido del documento' },
    { value: 'CERTIFICO_COPIA', label: 'Certifico que es copia fiel del original' }
  ];

  readonly firmarAparienciaOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'SELLO_DESC_HORIZ', label: 'Sello + Descripción Horizontal' },
    { value: 'SELLO_DESC_VERT', label: 'Sello + Descripción Vertical' },
    { value: 'SOLO_SELLO', label: 'Solo sello' }
  ];

  readonly firmarOfficeSelectValue = computed(() =>
    this.selectedOrgUnitId() == null ? '' : String(this.selectedOrgUnitId())
  );

  readonly canPrepareDocuments = computed(
    () => this.authService.featureAccess()?.canPrepareDocuments ?? false
  );
  readonly canStartSignatureFlow = computed(
    () => this.authService.featureAccess()?.canStartSignatureFlow ?? false
  );
  readonly canRegisterSignatureReturn = computed(
    () => this.authService.featureAccess()?.canRegisterSignatureReturn ?? false
  );
  readonly canRegisterSignedDocuments = computed(
    () => this.authService.featureAccess()?.canRegisterSignedDocuments ?? false
  );

  readonly catalogDisplayedTemplates = computed(() =>
    this.templates().filter((t) => t.codigoTipoDocumento === 'ACTA_RETROALIMENTACION')
  );

  readonly selectionForm = this.fb.group({
    evaluatedId: [null as number | null, [Validators.required]]
  });

  readonly signatureForm = this.fb.group({
    tipoDocumentoId: [null as number | null, [Validators.required]],
    plantillaId: [null as number | null, [Validators.required]]
  });

  readonly uploadForm = this.fb.group({
    descripcion: [
      '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(400)]
    ]
  });

  readonly returnForm = this.fb.group({
    codigoEstadoFlujo: ['FIRMADO' as 'FIRMADO' | 'ERROR_FIRMA' | 'FIRMA_CANCELADA', [Validators.required]],
    codigoResultadoFirma: ['OK'],
    mensajeResultadoFirma: ['Documento firmado registrado desde el flujo del sistema.']
  });

  private selectedFileValue: File | null = null;
  private returnFileValue: File | null = null;

  constructor() {
    const evaluatedId = Number(this.route.snapshot.queryParamMap.get('evaluatedId') || 0);
    this.evaluatedId.set(evaluatedId > 0 ? evaluatedId : null);
    this.selectionForm.patchValue({ evaluatedId: this.evaluatedId() });
    this.loadAvailableEvaluations();
    this.loadStaticData();
    const requestId = Number(this.route.snapshot.queryParamMap.get('solicitudFirmaId') || 0);
    if (requestId > 0) {
      this.loadSignatureRequest(requestId);
    }
    if (this.evaluatedId()) {
      this.loadDocuments();
    }
  }

  selectedEvaluationLabel(): string {
    if (!this.evaluatedId()) {
      return 'No seleccionado';
    }
    const selectedEvaluation = this.availableEvaluations().find(
      (evaluation) => evaluation.evaluatedId === this.evaluatedId()
    );
    return selectedEvaluation ? selectedEvaluation.evaluatedName : `#${this.evaluatedId()}`;
  }

  selectedFile(): File | null {
    return this.selectedFileValue;
  }

  isInProgressState(state: string): boolean {
    return state === 'EN_FIRMA' || state === 'FIRMA_SOLICITADA';
  }

  isSuccessState(state: string): boolean {
    return state === 'REGISTRADO' || state === 'VIGENTE';
  }

  availableTemplatesByType(): PlantillaDocumento[] {
    const tipoDocumentoId = this.signatureForm.getRawValue().tipoDocumentoId;
    if (!tipoDocumentoId) {
      return this.templates();
    }
    return this.templates().filter((template) => template.idTipoDocumento === tipoDocumentoId);
  }

  applyEvaluatedSelection(): void {
    const selectedEvaluatedId = this.selectionForm.getRawValue().evaluatedId;
    if (!selectedEvaluatedId) {
      this.errorMessage.set('Seleccione un evaluado para continuar.');
      return;
    }

    this.errorMessage.set('');
    this.evaluatedId.set(selectedEvaluatedId);
    this.signedDocumentsPageIndex.set(0);
    this.signedDocumentsPage.set(null);
    this.currentRequest.set(null);
    this.lastStartInfo.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { evaluatedId: selectedEvaluatedId, solicitudFirmaId: null },
      queryParamsHandling: 'merge'
    });
    this.loadDocuments();
  }

  onDocumentTypeChange(): void {
    this.signatureForm.patchValue({ plantillaId: null });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    if (!file) {
      this.selectedFileValue = null;
      this.selectedFileName.set('');
      return;
    }
    const name = file.name.toLowerCase();
    const mime = file.type.toLowerCase();
    if (!name.endsWith('.pdf') || (mime !== '' && mime !== 'application/pdf')) {
      this.errorMessage.set('Solo se permiten archivos PDF.');
      this.selectedFileValue = null;
      this.selectedFileName.set('');
      if (input) {
        input.value = '';
      }
      return;
    }
    this.errorMessage.set('');
    this.selectedFileValue = file;
    this.selectedFileName.set(file.name);
  }

  onReturnFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    this.returnFileValue = file;
    this.returnFileName.set(file?.name ?? '');
  }

  onReturnStateChange(): void {
    const state = this.returnForm.getRawValue().codigoEstadoFlujo;
    if (state === 'FIRMADO') {
      this.returnForm.patchValue({
        codigoResultadoFirma: 'OK',
        mensajeResultadoFirma: 'Documento firmado registrado desde el flujo del sistema.'
      });
      return;
    }
    if (state === 'ERROR_FIRMA') {
      this.returnForm.patchValue({
        codigoResultadoFirma: 'ERROR',
        mensajeResultadoFirma: 'La firma no pudo completarse.'
      });
      return;
    }
    this.returnForm.patchValue({
      codigoResultadoFirma: 'CANCELADO',
      mensajeResultadoFirma: 'La firma fue cancelada.'
    });
  }

  submitPreparation(): void {
    if (!this.canPrepareDocuments()) {
      this.errorMessage.set('Su perfil no tiene permiso para preparar documentos para firma.');
      return;
    }
    if (!this.evaluatedId()) {
      this.errorMessage.set('Seleccione un evaluado antes de preparar el documento.');
      return;
    }
    if (this.signatureForm.invalid) {
      this.signatureForm.markAllAsTouched();
      this.errorMessage.set('Seleccione un tipo documental y una plantilla valida.');
      return;
    }

    this.preparing.set(true);
    this.errorMessage.set('');
    this.lastStartInfo.set(null);
    this.documentsService
      .prepareSignatureDocument(this.evaluatedId()!, this.signatureForm.getRawValue().plantillaId as number)
      .subscribe({
        next: (request) => {
          this.preparing.set(false);
          this.currentRequest.set(request);
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { evaluatedId: this.evaluatedId(), solicitudFirmaId: request.idSolicitudFirma },
            queryParamsHandling: 'merge'
          });
          this.toastService.success('Documento preparado', 'La solicitud quedo lista para iniciar firma.');
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.preparing.set(false);
        }
      });
  }

  startSignature(): void {
    if (!this.canStartSignatureFlow()) {
      this.errorMessage.set('Su perfil no tiene permiso para iniciar solicitudes de firma.');
      return;
    }
    const request = this.currentRequest();
    if (!request) {
      this.errorMessage.set('Primero prepare un documento para continuar.');
      return;
    }

    this.starting.set(true);
    this.errorMessage.set('');
    const startFlow$ = request.estadoFlujo === 'LISTO_PARA_FIRMA'
      ? this.documentsService.createSignatureRequest(request.idSolicitudFirma).pipe(
          switchMap((createdRequest) => {
            this.currentRequest.set(createdRequest);
            return this.documentsService.startSignatureRequest(createdRequest.idSolicitudFirma);
          })
        )
      : this.documentsService.startSignatureRequest(request.idSolicitudFirma);

    startFlow$.subscribe({
      next: (startInfo) => {
        this.starting.set(false);
        this.lastStartInfo.set(startInfo);
        this.toastService.success('Firma iniciada', startInfo.mensajeIntegracion);
        this.loadSignatureRequest(startInfo.idSolicitudFirma);
        this.openFirmaPeru();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.starting.set(false);
      }
    });
  }

  refreshSignatureRequest(): void {
    if (!this.currentRequest()) {
      return;
    }
    this.refreshingRequest.set(true);
    this.documentsService.getSignatureRequest(this.currentRequest()!.idSolicitudFirma).subscribe({
      next: (request) => {
        this.currentRequest.set(request);
        this.refreshingRequest.set(false);
        if (request.idDocumentoFirmado) {
          this.loadDocuments();
        }
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.refreshingRequest.set(false);
      }
    });
  }

  openFirmaPeru(): void {
    const url = this.currentRequest()?.urlFirma || this.lastStartInfo()?.urlFirma;
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  openPreparedDocument(): void {
    if (!this.currentRequest()) {
      return;
    }
    this.documentsService.getPreparedDocumentFile(this.currentRequest()!.idSolicitudFirma).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  openReturnModal(): void {
    if (!this.canRegisterSignatureReturn()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar el retorno de firma.');
      return;
    }
    this.returnForm.reset({
      codigoEstadoFlujo: 'FIRMADO',
      codigoResultadoFirma: 'OK',
      mensajeResultadoFirma: 'Documento firmado registrado desde el flujo del sistema.'
    });
    this.returnFileValue = null;
    this.returnFileName.set('');
    this.returnModalOpen.set(true);
  }

  closeReturnModal(): void {
    this.returnModalOpen.set(false);
    this.returning.set(false);
  }

  submitReturn(): void {
    if (!this.canRegisterSignatureReturn()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar el retorno de firma.');
      return;
    }
    if (!this.currentRequest()) {
      return;
    }

    const raw = this.returnForm.getRawValue();
    const payload: RegistrarRetornoFirmaPayload = {
      codigoEstadoFlujo: raw.codigoEstadoFlujo as 'FIRMADO' | 'ERROR_FIRMA' | 'FIRMA_CANCELADA',
      codigoResultadoFirma: (raw.codigoResultadoFirma ?? '').trim() || null,
      mensajeResultadoFirma: (raw.mensajeResultadoFirma ?? '').trim() || null,
      archivoFirmado: this.returnFileValue
    };

    if (payload.codigoEstadoFlujo === 'FIRMADO' && !payload.archivoFirmado) {
      this.errorMessage.set('Adjunte el PDF firmado para registrar un retorno exitoso.');
      return;
    }

    this.returning.set(true);
    this.errorMessage.set('');
    this.documentsService.registerSignatureReturn(this.currentRequest()!.idSolicitudFirma, payload).subscribe({
      next: (request) => {
        this.returning.set(false);
        this.returnModalOpen.set(false);
        this.currentRequest.set(request);
        if (request.idDocumentoFirmado) {
          this.loadDocuments();
        }
        this.toastService.success('Retorno registrado', 'El resultado de firma quedo trazado en el sistema.');
      },
      error: (error: Error) => {
        this.returning.set(false);
        this.errorMessage.set(error.message);
      }
    });
  }

  submitUpload(): void {
    if (!this.canRegisterSignedDocuments()) {
      this.errorMessage.set('Su perfil no tiene permiso para registrar documentos firmados por contingencia.');
      return;
    }
    if (!this.evaluatedId()) {
      this.errorMessage.set('Seleccione un evaluado desde evaluacion final antes de cargar el documento.');
      return;
    }
    if (this.uploadForm.invalid || !this.selectedFile()) {
      this.uploadForm.markAllAsTouched();
      this.errorMessage.set('Ingrese la descripcion y un archivo PDF valido.');
      return;
    }

    const descripcionRaw = (this.uploadForm.getRawValue().descripcion ?? '').trim();
    if (!descripcionRaw) {
      this.uploadForm.markAllAsTouched();
      this.errorMessage.set('Ingrese la descripcion y un archivo PDF valido.');
      return;
    }

    this.uploading.set(true);
    this.errorMessage.set('');
    this.documentsService
      .registerSignedDocument(this.evaluatedId()!, descripcionRaw, this.selectedFile()!)
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.uploadForm.reset({ descripcion: '' });
          this.selectedFileValue = null;
          this.selectedFileName.set('');
          this.loadDocuments();
          this.toastService.success('Documento registrado', 'El documento firmado fue almacenado correctamente.');
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.uploading.set(false);
        }
      });
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

  /** Etiqueta de tipo en listado: contingencia (OTROS) segun lineamiento de pantalla. */
  signedDocumentListTypeLabel(doc: DocumentoFirmadoResumen): string {
    if (doc.codigoTipoDocumento === 'OTROS') {
      return 'Formato GDR (firmado)';
    }
    return doc.tipoDocumento;
  }

  downloadSignedDocument(doc: DocumentoFirmadoResumen): void {
    this.errorMessage.set('');
    this.documentsService.getSignedDocumentFile(doc.idDocumentoFirmado, true).subscribe({
      next: (blob) => this.downloadBlob(blob, doc.nombreOriginal),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  @HostListener('document:click')
  onDocumentClickCloseActionsMenu(): void {
    this.openActionsMenuId.set(null);
    this.actionsMenuViewportPosition.set(null);
  }

  toggleRowActionsMenu(event: Event, documentId: number): void {
    event.stopPropagation();
    const current = this.openActionsMenuId();
    if (current === documentId) {
      this.openActionsMenuId.set(null);
      this.actionsMenuViewportPosition.set(null);
      return;
    }
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.actionsMenuViewportPosition.set({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right
    });
    this.openActionsMenuId.set(documentId);
  }

  onFirmarMenuClick(event: Event, document: DocumentoFirmadoResumen): void {
    event.stopPropagation();
    this.openActionsMenuId.set(null);
    this.actionsMenuViewportPosition.set(null);
    this.firmarTargetDocument.set(document);
    this.selectedOrgUnitId.set(null);
    this.firmarMotivo.set('SOY_AUTOR');
    this.firmarApariencia.set('SELLO_DESC_HORIZ');
    this.firmarOfficeOptions.set([]);
    this.firmarOrgCatalogError.set(null);
    this.firmarModalOpen.set(true);
    this.loadFirmarOffices();
  }

  closeFirmarModal(): void {
    this.firmarModalOpen.set(false);
    this.firmarTargetDocument.set(null);
    this.firmarOfficeOptions.set([]);
    this.firmarOrgCatalogError.set(null);
    this.selectedOrgUnitId.set(null);
  }

  onFirmarOfficeSelect(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    if (raw === '') {
      this.selectedOrgUnitId.set(null);
      return;
    }
    const id = Number(raw);
    this.selectedOrgUnitId.set(Number.isNaN(id) ? null : id);
  }

  private loadFirmarOffices(): void {
    this.loadingFirmarCatalog.set(true);
    this.firmarOrgCatalogError.set(null);
    this.documentsService.listOrganizationalUnitsForSigning().subscribe({
      next: (list) => {
        this.firmarOfficeOptions.set(Array.isArray(list) ? list : []);
        const selected = this.selectedOrgUnitId();
        const rows = this.firmarOfficeOptions();
        if (selected != null && !rows.some((r) => r.id === selected)) {
          this.selectedOrgUnitId.set(null);
        }
        this.loadingFirmarCatalog.set(false);
      },
      error: (err: Error) => {
        this.firmarOrgCatalogError.set(
          err.message || 'No se pudo cargar el catalogo de oficinas. Compruebe la sesion o intente de nuevo.'
        );
        this.firmarOfficeOptions.set([]);
        this.loadingFirmarCatalog.set(false);
      }
    });
  }

  retryFirmarOfficeCatalog(): void {
    this.loadFirmarOffices();
  }

  onFirmarMotivoSelect(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.firmarMotivo.set(v);
  }

  onFirmarAparienciaSelect(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.firmarApariencia.set(v);
  }

  submitFirmarArchivo(): void {
    if (this.selectedOrgUnitId() == null) {
      this.toastService.error(
        'Oficina requerida',
        'Seleccione una oficina en el listado antes de enviar.'
      );
      return;
    }
    this.toastService.success(
      'Solicitud registrada',
      'La integracion con el proveedor externo de firma digital esta pendiente segun la linea institucional. Puede continuar el tramite cuando este habilitado.'
    );
    this.closeFirmarModal();
  }

  deleteSignedDocumentRow(event: Event, doc: DocumentoFirmadoResumen): void {
    event.stopPropagation();
    this.openActionsMenuId.set(null);
    this.actionsMenuViewportPosition.set(null);
    if (
      !globalThis.confirm(
        '¿Desactivar este documento firmado? Dejara de mostrarse en el listado de activos.'
      )
    ) {
      return;
    }
    this.errorMessage.set('');
    this.documentsService.deleteSignedDocument(doc.idDocumentoFirmado).subscribe({
      next: () => {
        this.loadDocuments();
        this.toastService.success('Documento eliminado', 'El registro fue desactivado en el sistema.');
      },
      error: (err: Error) => this.errorMessage.set(err.message)
    });
  }

  downloadFormatoGdrPdfFile(): void {
    const evaluatedIdValue = this.evaluatedId();
    if (!evaluatedIdValue || !this.canPrepareDocuments()) {
      return;
    }
    this.downloadingFormatoGdr.set(true);
    this.documentsService.downloadFormatoGdrPdf(evaluatedIdValue, this.cicloNavService.cicloId()!).subscribe({
      next: (result: FormatoGdrPdfDownload) => {
        this.downloadBlob(result.blob, result.fileName);
        this.downloadingFormatoGdr.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message || 'No se pudo generar el Formato GDR.');
        this.downloadingFormatoGdr.set(false);
      }
    });
  }

  /** Descarga PDF desde plantilla catalogada en DOC_PLANTILLA (distinto del Formato GDR Excel generado). */
  downloadTemplatePdf(template: PlantillaDocumento): void {
    this.documentsService.downloadTemplate(template.idPlantilla).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, template.nombreOriginal);
      },
      error: (error: Error) => this.errorMessage.set(error.message)
    });
  }

  private loadStaticData(): void {
    this.loadingStatic.set(true);
    this.documentsService.listTypes().subscribe({
      next: (documentTypes) => this.documentTypes.set(documentTypes),
      error: (error: Error) => this.errorMessage.set(error.message)
    });
    this.documentsService.listTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loadingStatic.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loadingStatic.set(false);
      }
    });
  }

  private loadAvailableEvaluations(): void {
    this.loadingEvaluations.set(true);
    this.finalEvaluationService.listFinalEvaluations(this.cicloNavService.cicloId()!).subscribe({
      next: (evaluations) => {
        this.availableEvaluations.set(evaluations);
        if (!this.evaluatedId() && evaluations.length === 1) {
          this.selectionForm.patchValue({ evaluatedId: evaluations[0].evaluatedId });
        }
        this.loadingEvaluations.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loadingEvaluations.set(false);
      }
    });
  }

  private loadSignatureRequest(requestId: number): void {
    this.refreshingRequest.set(true);
    this.documentsService.getSignatureRequest(requestId).subscribe({
      next: (request) => {
        this.currentRequest.set(request);
        this.signatureForm.patchValue({
          tipoDocumentoId: request.idTipoDocumento,
          plantillaId: request.idPlantilla
        });
        if (!this.evaluatedId()) {
          this.evaluatedId.set(request.idEvaluado);
          this.selectionForm.patchValue({ evaluatedId: request.idEvaluado });
          this.loadDocuments();
        }
        this.refreshingRequest.set(false);
      },
      error: () => {
        this.refreshingRequest.set(false);
      }
    });
  }

  goToSignedDocumentsPage(page: number): void {
    if (page < 0) {
      return;
    }
    this.loadDocuments(page);
  }

  private loadDocuments(page?: number): void {
    if (!this.evaluatedId()) {
      this.signedDocumentsPage.set(null);
      return;
    }
    const pageIndex = page ?? this.signedDocumentsPageIndex();
    this.signedDocumentsPageIndex.set(pageIndex);
    this.loadingDocuments.set(true);
    this.documentsService
      .listSignedDocuments(this.evaluatedId()!, this.cicloNavService.cicloId()!, pageIndex, this.signedDocumentsPageSize)
      .subscribe({
        next: (resp) => {
          if (resp.content.length === 0 && resp.totalElements > 0 && pageIndex > 0) {
            this.loadDocuments(pageIndex - 1);
            return;
          }
          this.signedDocumentsPage.set(resp);
          this.loadingDocuments.set(false);
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.loadingDocuments.set(false);
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
}
