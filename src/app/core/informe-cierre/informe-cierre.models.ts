export interface InformeCierreConsolidado {
  informeId: number | null;
  cycleId: number;
  cycleName: string;
  estado: string;
  estadoLabel: string;
  totalEvaluados: number;
  totalBuenRendimiento: number;
  totalSujetoObservacion: number;
  totalDesaprobado: number;
  totalDistinguido: number;
  totalOportunidadesMejora: number;
  totalConfirmaciones: number;
  totalConfirmacionesResueltas: number;
  totalDocumentosFirmados: number;
  observacionesOrh: string | null;
  generadoPor: string | null;
  fechaGeneracion: string | null;
}

export interface InformeCierreAlerta {
  fechaLimite: string | null;
  diasRestantes: number | null;
  vencida: boolean;
  nivelSemaforo: 'OK' | 'ADVERTENCIA' | 'CRITICO' | 'INDEFINIDO';
  mensaje: string;
  referenciaNormativa: string;
}

export interface GenerarInformeCierreRequest {
  observacionesOrh?: string | null;
}
