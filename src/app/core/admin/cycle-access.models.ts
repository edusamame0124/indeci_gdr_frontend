export interface CycleAccessResponse {
  id: number;
  code: string;
  name: string;
  status: string;
  estadoEtapa: string;
  estadoEtapaLabel: string;
  isActiveCycle: boolean;
  canAccess: boolean;
}

export interface CreateCycleRequest {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
}
