export type CronogramaChecklistStatus = 'passed' | 'failed' | 'pending';

export interface CronogramaChecklistItem {
  code: string;
  title: string;
  description: string;
  status: CronogramaChecklistStatus;
  detail: string | null;
  normativaRef: string | null;
  actionLabel: string | null;
  actionRoute: string[] | null;
}

export interface CronogramaAvanceChecklistResult {
  items: CronogramaChecklistItem[];
  canAdvance: boolean;
  pendingCount: number;
  failedCount: number;
}
