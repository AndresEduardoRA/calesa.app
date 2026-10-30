// Cada archivo de `src/` que abre un panel sumando al historial (`history: 'push'`) deja que «atrás», tras recargar, devuelva el foco a quien lo abrió
// (`src/shared/ui/vuelta-del-foco.ts`, 4-49): importa `abrirConVuelta`. La guarda `paneles-con-vuelta.test.ts` falla si aparece uno que no lo hace y no
// figura acá. Esta lista sólo se achica: un pendiente que ya importa `abrirConVuelta` o que no existe también la hace fallar.
export const PENDIENTES: Record<string, string> = {
  'src/modules/leads/features/origenes/hooks/use-panel-de-origen.ts': '4.14-2a6',
  'src/modules/leads/features/tipos-de-seguimiento/hooks/use-panel-de-tipo-de-seguimiento.ts':
    '4.14-2a6',
  'src/modules/leads/features/tipos/hooks/use-panel-de-tipo.ts': '4.14-2a6',
}
