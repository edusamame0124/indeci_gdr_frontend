import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  CreateUserRequest,
  HrOrgUnitOptionResponse,
  RoleOptionResponse,
  UpdateUserRequest,
  UpdateUserRolesRequest,
  UpdateUserStatusRequest,
  UserDetailResponse,
  UserListItemResponse
} from './users.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  listUsers(): Observable<UserListItemResponse[]> {
    return this.http
      .get<ApiResponse<UserListItemResponse[]>>(`${environment.apiBaseUrl}/admin/users`)
      .pipe(map((response) => response.data));
  }

  getUser(id: number): Observable<UserDetailResponse> {
    return this.http
      .get<ApiResponse<UserDetailResponse>>(`${environment.apiBaseUrl}/admin/users/${id}`)
      .pipe(map((response) => response.data));
  }

  createUser(payload: CreateUserRequest): Observable<UserDetailResponse> {
    return this.http
      .post<ApiResponse<UserDetailResponse>>(`${environment.apiBaseUrl}/admin/users`, payload)
      .pipe(map((response) => response.data));
  }

  updateUser(id: number, payload: UpdateUserRequest): Observable<UserDetailResponse> {
    return this.http
      .put<ApiResponse<UserDetailResponse>>(`${environment.apiBaseUrl}/admin/users/${id}`, payload)
      .pipe(map((response) => response.data));
  }

  updateUserStatus(id: number, payload: UpdateUserStatusRequest): Observable<UserDetailResponse> {
    return this.http
      .patch<ApiResponse<UserDetailResponse>>(`${environment.apiBaseUrl}/admin/users/${id}/status`, payload)
      .pipe(map((response) => response.data));
  }

  updateUserRoles(id: number, payload: UpdateUserRolesRequest): Observable<UserDetailResponse> {
    return this.http
      .put<ApiResponse<UserDetailResponse>>(`${environment.apiBaseUrl}/admin/users/${id}/roles`, payload)
      .pipe(map((response) => response.data));
  }

  listRoles(): Observable<RoleOptionResponse[]> {
    return this.http
      .get<ApiResponse<RoleOptionResponse[]>>(`${environment.apiBaseUrl}/admin/roles`)
      .pipe(map((response) => response.data));
  }

  listOrgUnits(): Observable<HrOrgUnitOptionResponse[]> {
    return this.http
      .get<ApiResponse<HrOrgUnitOptionResponse[]>>(`${environment.apiBaseUrl}/admin/hr-org-units`)
      .pipe(map((response) => response.data));
  }
}
