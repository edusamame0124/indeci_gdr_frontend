export interface EvidenceSummary {
  id: number;
  goalId: number;
  title: string;
  detail: string | null;
  expectedDate: string | null;
  statusCode: string;
  statusName: string;
  latestReviewComment: string | null;
}

export interface EvidenceReview {
  id: number;
  statusCode: string;
  statusName: string;
  comment: string | null;
  correctiveActionDetail: string | null;
  correctiveActionStatus: string | null;
  reviewedAt: string;
}

export interface EvidenceDetail {
  id: number;
  goalId: number;
  goalTitle: string;
  evaluatedName: string;
  indicatorName: string;
  title: string;
  detail: string | null;
  expectedDate: string | null;
  statusCode: string;
  statusName: string;
  openCorrectiveActionDetail: string | null;
  openCorrectiveActionStatus: string | null;
  reviews: EvidenceReview[];
}

export interface EvidenceUpsertRequest {
  title: string;
  detail: string | null;
  expectedDate: string | null;
}

export interface EvidenceReviewRequest {
  decisionCode: string;
  comment: string | null;
  correctiveActionDetail: string | null;
}
