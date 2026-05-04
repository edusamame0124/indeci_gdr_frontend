/**
 * Qualification codes and canonical labels shared by evidence list (Calificar modal)
 * and evidence detail (history). Keep in sync with backend stable codes.
 */
export interface QualificationOption {
  readonly code: string;
  readonly label: string;
}

export const QUALIFICATION_OPTIONS_AVANCE: readonly QualificationOption[] = [
  { code: 'LOGRADO', label: 'Logrado' },
  { code: 'EN_PROCESO_LOGRO', label: 'En proceso de logro' },
  { code: 'NO_PRESENTA_EVIDENCIA', label: 'No presenta evidencia' },
  { code: 'OBSERVADO', label: 'Observado' }
];

export const QUALIFICATION_OPTIONS_FINAL: readonly QualificationOption[] = [
  { code: 'PRESENTA_EVIDENCIA_FINAL', label: 'Sí presenta evidencia final' },
  { code: 'NO_PRESENTA_EVIDENCIA_LOGRO_FINAL', label: 'No presenta evidencia de logro final' },
  { code: 'OBSERVADO', label: 'Observado' }
];

const ALL_QUALIFICATION_OPTIONS: readonly QualificationOption[] = [
  ...QUALIFICATION_OPTIONS_AVANCE,
  ...QUALIFICATION_OPTIONS_FINAL
];

const labelByCode: Record<string, string> = {};
for (const opt of ALL_QUALIFICATION_OPTIONS) {
  labelByCode[opt.code] = opt.label;
}

export const QUALIFICATION_LABEL_BY_CODE: Readonly<Record<string, string>> = labelByCode;

export function qualificationOptionsForEvidenceType(
  evidenceTypeCode: string
): QualificationOption[] {
  switch (evidenceTypeCode) {
    case 'AVANCE':
      return [...QUALIFICATION_OPTIONS_AVANCE];
    case 'FINAL':
      return [...QUALIFICATION_OPTIONS_FINAL];
    default:
      return [];
  }
}

/**
 * History display: prefer API label; fallback to canonical label by stable code.
 * Unknown code with no name: null (no invented text).
 */
export function resolveQualificationHistoryLabel(params: {
  qualificationName?: string | null;
  qualificationCode?: string | null;
}): string | null {
  const name = params.qualificationName?.trim();
  if (name) {
    return name;
  }
  const code = params.qualificationCode?.trim();
  if (!code) {
    return null;
  }
  const mapped = QUALIFICATION_LABEL_BY_CODE[code];
  return mapped ?? null;
}
