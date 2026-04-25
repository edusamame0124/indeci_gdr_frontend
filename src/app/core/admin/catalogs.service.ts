import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { CatalogItem } from './catalogs.models';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private readonly http = inject(HttpClient);

  listValueTypes(): Observable<CatalogItem[]> {
    return this.http
      .get<ApiResponse<CatalogItem[]>>(`${environment.apiBaseUrl}/admin/catalogs/value-types`)
      .pipe(map((response) => response.data));
  }

  listFormulas(): Observable<CatalogItem[]> {
    return this.http
      .get<ApiResponse<CatalogItem[]>>(`${environment.apiBaseUrl}/admin/catalogs/formulas`)
      .pipe(map((response) => response.data));
  }

  listSegments(): Observable<CatalogItem[]> {
    return this.http
      .get<ApiResponse<CatalogItem[]>>(`${environment.apiBaseUrl}/admin/catalogs/segments`)
      .pipe(map((response) => response.data));
  }

  loadCatalogBundle(): Observable<{
    valueTypes: CatalogItem[];
    formulas: CatalogItem[];
    segments: CatalogItem[];
  }> {
    return forkJoin({
      valueTypes: this.listValueTypes(),
      formulas: this.listFormulas(),
      segments: this.listSegments()
    });
  }
}
