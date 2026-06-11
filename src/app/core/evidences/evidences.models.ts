export interface EvidenceSummary {
  id: number;
  goalId: number;
  title: string;
  detail: string | null;
  evidenceTypeCode: string;
  evidenceTypeName: string;
  expectedFormatCode: string;
  expectedFormatName: string;
  expectedDate: string | null;
  fileOriginalName: string | null;
  fileSizeBytes: number | null;
  fileAvailable: boolean;
  statusCode: string;
  statusName: string;
  latestReviewComment: string | null;
  latestReviewQualificationCode?: string | null;
  latestReviewQualificationName?: string | null;
  mandatory: boolean;
}

export interface EvidenceReview {
  id: number;
  statusCode: string;
  statusName: string;
  qualificationCode?: string | null;
  qualificationName?: string | null;
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
  evidenceTypeCode: string;
  evidenceTypeName: string;
  expectedFormatCode: string;
  expectedFormatName: string;
  expectedDate: string | null;
  fileOriginalName: string | null;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
  fileAvailable: boolean;
  statusCode: string;
  statusName: string;
  openCorrectiveActionDetail: string | null;
  openCorrectiveActionStatus: string | null;
  reviews: EvidenceReview[];
  mandatory: boolean;
}

export interface EvidenceUpsertRequest {
  title: string;
  detail: string | null;
  evidenceTypeCode: string;
  expectedFormatCode: string;
  expectedDate: string | null;
  mandatory: boolean | null;
}

export interface EvidenceReviewRequest {
  qualificationCode: string;
  comment: string | null;
  correctiveActionDetail: string | null;
}
