export interface AuditEvent {
  id: number;
  eventCode: string;
  principal: string | null;
  detail: string | null;
  clientIp: string | null;
  requestPath: string | null;
  occurredAt: string;
}

export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AuditSearchParams {
  eventCode?: string | null;
  principal?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  size?: number;
}
