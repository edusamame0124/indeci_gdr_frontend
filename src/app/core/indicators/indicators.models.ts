export interface Indicator {
  id: number;
  code: string;
  name: string;
  description: string | null;
  valueTypeId: number;
  valueTypeName: string;
  formulaId: number;
  formulaName: string;
  segmentId: number;
  segmentName: string;
  status: string;
}

export interface IndicatorUpsertRequest {
  code: string;
  name: string;
  description: string | null;
  valueTypeId: number;
  formulaId: number;
  segmentId: number;
}
