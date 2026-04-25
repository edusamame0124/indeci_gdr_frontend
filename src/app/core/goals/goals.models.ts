export interface GoalSummary {
  id: number;
  title: string;
  expectedValue: number;
  weight: number;
  status: string;
  assignmentId: number;
  evaluatedName: string;
  indicatorId: number;
  indicatorName: string;
}

export interface GoalDetail {
  id: number;
  assignmentId: number;
  cycleName: string;
  evaluatorName: string;
  evaluatedName: string;
  indicatorId: number;
  indicatorCode: string;
  indicatorName: string;
  title: string;
  description: string | null;
  expectedValue: number;
  weight: number;
  status: string;
}

export interface GoalUpsertRequest {
  assignmentId: number;
  indicatorId: number;
  title: string;
  description: string | null;
  expectedValue: number;
  weight: number;
}
