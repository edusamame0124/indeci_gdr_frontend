import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { CicloNavService } from '../gdr/ciclo-nav.service';

/**
 * G-01 — Valida que el módulo (moduleSlug) sea accesible en la etapa actual del ciclo.
 * Se usa en combinación con featureAccessGuard, no como reemplazo.
 *
 * Agrega data: { moduleSlug: '<slug>' } a la ruta para activar la validación.
 * Si no hay moduleSlug en data, el guard pasa sin validar (comportamiento seguro).
 *
 * Slugs reconocidos (mismo mapa que GdrCicloModuloEtapaPolicy en backend):
 *   cronograma, participacion, asignaciones, indicadores, metas, seguimiento,
 *   evaluacion-final, retroalimentacion, confirmacion, cie, distinguido,
 *   informe-cierre, evidencias, oportunidades, documentos, auditoria
 */

type ModuleSlug = string;
type EstadoCiclo = string;

const ACCESSIBLE_STAGES: Record<ModuleSlug, EstadoCiclo[]> = {
  cronograma:         ['BORRADOR', 'EN_PLANIFICACION', 'EN_SEGUIMIENTO', 'EN_EVALUACION',
                       'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  participacion:      ['EN_PLANIFICACION', 'EN_SEGUIMIENTO', 'EN_EVALUACION',
                       'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  asignaciones:       ['EN_PLANIFICACION', 'EN_SEGUIMIENTO', 'EN_EVALUACION',
                       'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  indicadores:        ['EN_PLANIFICACION', 'EN_SEGUIMIENTO', 'EN_EVALUACION',
                       'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  metas:              ['EN_PLANIFICACION', 'EN_SEGUIMIENTO', 'EN_EVALUACION',
                       'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  seguimiento:        ['EN_SEGUIMIENTO', 'EN_EVALUACION', 'EN_CONFIRMACION',
                       'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  'evaluacion-final': ['EN_EVALUACION', 'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  retroalimentacion:  ['EN_EVALUACION', 'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  confirmacion:       ['EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  cie:                ['EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  distinguido:        ['EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  'informe-cierre':   ['EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  evidencias:         ['EN_PLANIFICACION', 'EN_SEGUIMIENTO', 'EN_EVALUACION',
                       'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  oportunidades:      ['EN_PLANIFICACION', 'EN_SEGUIMIENTO', 'EN_EVALUACION',
                       'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  documentos:         ['EN_PLANIFICACION', 'EN_SEGUIMIENTO', 'EN_EVALUACION',
                       'EN_CONFIRMACION', 'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
  auditoria:          ['EN_SEGUIMIENTO', 'EN_EVALUACION', 'EN_CONFIRMACION',
                       'EN_RENDIMIENTO_DISTINGUIDO', 'CERRADO'],
};

export const cycleModuleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const cicloNavService = inject(CicloNavService);
  const router = inject(Router);

  const moduleSlug = route.data['moduleSlug'] as ModuleSlug | undefined;
  if (!moduleSlug) return true;

  const estadoEtapa = cicloNavService.ciclo()?.estadoEtapa;
  if (!estadoEtapa) return true;

  const accessible = ACCESSIBLE_STAGES[moduleSlug];
  if (!accessible) return true;

  if (accessible.includes(estadoEtapa)) return true;

  // Módulo no disponible en la etapa actual — redirigir al tablero del ciclo
  const cicloId = cicloNavService.cicloId();
  if (cicloId) {
    router.navigate(['/dashboard/ciclo', cicloId], {
      queryParams: { aviso: `El módulo "${moduleSlug}" no está disponible en la etapa "${estadoEtapa}".` }
    });
  } else {
    router.navigate(['/dashboard']);
  }
  return false;
};
