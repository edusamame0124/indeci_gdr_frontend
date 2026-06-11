/**
 * Rutas cycle-aware del tablero GDR.
 * Sustento: rutas bajo /dashboard/ciclo/:cicloId/* (P1).
 */
export function buildCicloBoardRoute(cicloId: number): string[] {
  return ['/dashboard', 'ciclo', String(cicloId)];
}

export function buildCicloModuleRoute(cicloId: number, ...segments: Array<string | number>): string[] {
  return ['/dashboard', 'ciclo', String(cicloId), ...segments.map((segment) => String(segment))];
}
