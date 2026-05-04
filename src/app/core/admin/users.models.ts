export interface RoleOptionResponse {
  code: string;
  name: string;
}

export interface UserListItemResponse {
  id: number;
  username: string;
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  personId: number | null;
  personDisplayName: string | null;
  orgUnitName: string | null;
  roles: RoleOptionResponse[];
  gdrParticipationStatus: string;
  gdrParticipationLabel: string;
  functionalActor: string;
  cycleContextAssigned: boolean;
  lastLoginAt: string | null;
}

export interface UserDetailResponse extends UserListItemResponse {
  failedAttempts: number | null;
  lockedUntil: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  displayName: string;
  initialPassword: string;
  documentNumber: string;
  orgUnitId: number;
  roleCodes: string[];
}

export interface UpdateUserRequest {
  email: string;
  displayName: string;
}

export interface HrOrgUnitOptionResponse {
  id: number;
  code: string;
  name: string;
}

export interface UpdateUserStatusRequest {
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateUserRolesRequest {
  roleCodes: string[];
}
