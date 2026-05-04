export interface HrAssignmentSummary {
  assignmentId: number;
  cycleId: number;
  cycleCode: string;
  cycleName: string;
  evaluatorPersonId: number;
  evaluatorName: string;
  evaluatedPersonId: number;
  evaluatedName: string;
  orgUnitId: number;
  orgUnitCode: string;
  orgUnitName: string;
  segmentId: number | null;
  segmentCode: string | null;
  segmentName: string | null;
  status: string;
}
