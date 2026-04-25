import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogItem } from '../../../../core/admin/catalogs.models';
import { CatalogsService } from '../../../../core/admin/catalogs.service';

@Component({
  selector: 'app-catalogs',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page">
      <div class="page__header">
        <div>
          <p class="page__eyebrow">Administracion GRD base</p>
          <h1>Catalogos minimos</h1>
          <p class="page__subtitle">
            Parametros base que alimentan indicadores y metas del lote actual.
            
          </p>
        </div>
        <a routerLink="/dashboard" class="page__link">Volver</a>
      </div>

      @if (errorMessage()) {
        <div class="page__state page__state--error">{{ errorMessage() }}</div>
      } @else if (loading()) {
        <div class="page__state">Cargando catalogos...</div>
      } @else {
        <div class="catalog-grid">
          <article class="catalog-card">
            <header>
              <h2>Tipos de valor</h2>
            </header>
            <ul>
              @for (item of valueTypes(); track item.id) {
                <li>
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.code }}</span>
                </li>
              }
            </ul>
          </article>

          <article class="catalog-card">
            <header>
              <h2>Formulas</h2>
            </header>
            <ul>
              @for (item of formulas(); track item.id) {
                <li>
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.code }}</span>
                </li>
              }
            </ul>
          </article>

          <article class="catalog-card">
            <header>
              <h2>Segmentos</h2>
            </header>
            <ul>
              @for (item of segments(); track item.id) {
                <li>
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.code }}</span>
                </li>
              }
            </ul>
          </article>
        </div>
      }
    </section>
  `,
  styles: [`
    .page {
      padding: 18px 22px 26px;
      max-width: 1180px;
      margin: 0 auto;
    }

    .page__header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .page__eyebrow {
      margin: 0 0 6px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #667085;
      text-transform: uppercase;
    }

    .page__header h1 {
      margin: 0;
      color: #1f2937;
      font-size: 1.5rem;
    }

    .page__subtitle {
      margin: 6px 0 0;
      color: #667085;
      max-width: 700px;
      font-size: 0.84rem;
      line-height: 1.55;
    }

    .page__link {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      text-decoration: none;
      background: rgba(127, 23, 20, 0.08);
      color: #7f1714;
      font-weight: 600;
      font-size: 0.82rem;
    }

    .catalog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }

    .catalog-card {
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
      padding: 16px;
    }

    .catalog-card h2 {
      margin: 0 0 12px;
      font-size: 0.94rem;
      color: #1f2937;
    }

    .catalog-card ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 8px;
    }

    .catalog-card li {
      border-radius: 10px;
      background: #f8fafc;
      padding: 10px 12px;
      display: grid;
      gap: 3px;
    }

    .catalog-card strong {
      color: #344054;
      font-size: 0.84rem;
    }

    .catalog-card span {
      color: #667085;
      font-size: 0.76rem;
    }

    .page__state {
      border-radius: 12px;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(15, 23, 42, 0.08);
      color: #526274;
      font-size: 0.84rem;
    }

    .page__state--error {
      color: #a12622;
    }

    @media (max-width: 900px) {
      .page {
        padding: 16px 18px 24px;
      }
    }

    @media (max-width: 640px) {
      .page {
        padding: 14px 14px 22px;
      }

      .page__link {
        width: 100%;
        justify-content: center;
      }

      .catalog-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CatalogsComponent {
  private readonly catalogsService = inject(CatalogsService);

  readonly valueTypes = signal<CatalogItem[]>([]);
  readonly formulas = signal<CatalogItem[]>([]);
  readonly segments = signal<CatalogItem[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.loadCatalogs();
  }

  private loadCatalogs(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.catalogsService.loadCatalogBundle().subscribe({
      next: (catalogs) => {
        this.valueTypes.set(catalogs.valueTypes);
        this.formulas.set(catalogs.formulas);
        this.segments.set(catalogs.segments);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No fue posible cargar los catalogos minimos.');
        this.loading.set(false);
      }
    });
  }
}
