/**
 * Descarga un Blob en el navegador con liberación del object URL.
 * Util compartida para exportaciones PDF/CSV del módulo GDR.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.rel = 'noopener';
  link.click();
  URL.revokeObjectURL(objectUrl);
}
