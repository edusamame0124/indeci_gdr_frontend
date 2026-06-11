export const INSTITUTIONAL_FUNCTIONAL_ACTORS = new Set([
  'ORH',
  'JUNTA_DIRECTIVOS',
  'CIE',
  'TITULAR',
  'AUDITOR',
  'CONSULTA',
]);

export function isInstitutionalFunctionalActor(actor: string | null | undefined): boolean {
  return !!actor && INSTITUTIONAL_FUNCTIONAL_ACTORS.has(actor);
}

export function functionalActorLabel(actor: string | null | undefined): string {  switch (actor) {
    case 'ORH':
      return 'Oficina de Recursos Humanos';
    case 'JUNTA_DIRECTIVOS':
      return 'Junta de Directivos';
    case 'EVALUADOR':
      return 'Evaluador';
    case 'EVALUADO':
      return 'Evaluado';
    case 'EVALUADOR_Y_EVALUADO':
      return 'Evaluador y evaluado';
    case 'CIE':
      return 'Comité Institucional de Evaluación';
    case 'TITULAR':
      return 'Titular / Alta Dirección';
    case 'AUDITOR':
      return 'Auditor / OCI';
    case 'CONSULTA':
      return 'Consulta';
    case 'SIN_ROL_FUNCIONAL_GDR':
      return 'Sin participación en ciclo';
    default:
      return actor?.trim() ? actor : 'Sin participación en ciclo';
  }
}
