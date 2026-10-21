// Cada `<Confirmar>` de la app, con lo que lo abre por la URL (`.claude/rules/ui.md`: un diálogo tiene su `?panel=`). La
// guarda `confirmar-con-url.test.ts` falla si aparece un `<Confirmar>` que no figura acá, o si lo que lo abre dejó de
// escribir la URL. Para sumar uno: su `?panel=` (`usePanelPorUrl()` de `shared/ui`) y una fila acá.
export type ConfirmarConUrl = {
  // Qué archivo escribe y lee la URL que lo abre (puede ser el mismo).
  abre: string
  // Lo que ese archivo tiene que nombrar: la constante del panel o la clave de la URL.
  senal: string
}

export const CONFIRMAR_CON_URL: Record<string, ConfirmarConUrl> = {
  'src/modules/leads/features/cartera/components/dialogo-de-salir.tsx': {
    abre: 'src/modules/leads/features/ficha/hooks/use-panel-de-lead.ts',
    senal: 'PANEL_SALIR',
  },
  'src/modules/leads/features/papelera/components/confirmar-purga.tsx': {
    abre: 'src/modules/leads/features/papelera/hooks/use-purga-por-url.ts',
    senal: 'PANEL_PURGAR',
  },
  'src/modules/leads/features/importar/components/deshacer-importacion.tsx': {
    abre: 'src/modules/leads/features/importar/hooks/use-panel-de-deshacer.ts',
    senal: 'PANEL_DESHACER_IMPORTACION',
  },
  'src/modules/leads/features/embudo/components/eliminar-embudo.tsx': {
    abre: 'src/modules/leads/features/embudo/components/eliminar-embudo.tsx',
    senal: 'VALOR_ELIMINAR_EMBUDO',
  },
  'src/modules/leads/features/origenes/components/eliminar-origen.tsx': {
    abre: 'src/modules/leads/features/origenes/hooks/use-eliminar-origen-por-url.ts',
    senal: 'PANEL_ELIMINAR_ORIGEN',
  },
  'src/modules/leads/features/tipos/components/eliminar-tipo.tsx': {
    abre: 'src/modules/leads/features/tipos/hooks/use-eliminar-tipo-por-url.ts',
    senal: 'PANEL_ELIMINAR_TIPO',
  },
  'src/modules/leads/features/tipos-de-seguimiento/components/eliminar-tipo-de-seguimiento.tsx': {
    abre: 'src/modules/leads/features/tipos-de-seguimiento/hooks/use-eliminar-tipo-de-seguimiento-por-url.ts',
    senal: 'PANEL_ELIMINAR_TIPO_DE_SEGUIMIENTO',
  },
  'src/modules/leads/features/portal/components/dialogo-de-revocar.tsx': {
    abre: 'src/modules/leads/features/portal/hooks/use-panel-de-portal.ts',
    senal: 'PANEL_REVOCAR_PORTAL',
  },
  'src/modules/vehiculos/features/vinculo/components/confirmar-desvincular.tsx': {
    abre: 'src/modules/vehiculos/features/vinculo/hooks/use-desvincular-por-url.ts',
    senal: 'PANEL_DESVINCULAR',
  },
  'src/modules/vehiculos/features/papelera/components/confirmar-purga.tsx': {
    abre: 'src/modules/vehiculos/features/papelera/hooks/use-purga-por-url.ts',
    senal: 'PANEL_PURGAR',
  },
  'src/modules/origenes/features/origenes/components/estado-del-origen.tsx': {
    abre: 'src/modules/origenes/features/origenes/components/estado-del-origen.tsx',
    senal: 'PANEL_ELIMINAR_ORIGEN',
  },
  // Con su URL desde antes de este cierre: `?baja=<persona>` y `?eliminar=<rol>`.
  'src/modules/equipo/features/equipo/components/confirmar-baja.tsx': {
    abre: 'src/modules/equipo/features/equipo/components/lista-equipo.tsx',
    senal: 'baja: parseAsString',
  },
  'src/modules/equipo/features/roles/components/eliminar-rol.tsx': {
    abre: 'src/modules/equipo/features/roles/components/matriz-de-roles.tsx',
    senal: 'eliminar: parseAsString',
  },
}
