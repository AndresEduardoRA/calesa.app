// Cada `<Confirmar>` de la app, con lo que lo abre por la URL (`.claude/rules/ui.md`: un diálogo tiene su `?panel=`). La
// guarda `confirmar-con-url.test.ts` falla si aparece un `<Confirmar>` que no figura acá, o si lo que lo abre dejó de
// escribir la URL. Para sumar uno: su `?panel=` (`usePanelPorUrl()` de `shared/ui`) y una fila acá.
import { CONFIRMAR_CON_URL_DE_LA_FORMULA } from './confirmar-con-url-formula'
import { CONFIRMAR_CON_URL_DE_LA_PAPELERA } from './confirmar-con-url-papelera'
import { sumarObjetos } from './registros-de-carriles'

export type ConfirmarConUrl = {
  // Qué archivo escribe y lee la URL que lo abre (puede ser el mismo).
  abre: string
  // Lo que ese archivo tiene que nombrar: la constante del panel o la clave de la URL.
  senal: string
}

// Los del núcleo. Los de un área van en su archivo (`confirmar-con-url-formula.ts`, `confirmar-con-url-papelera.ts`, `areas-*/confirmar-con-url.ts`) y se suman abajo.
export const CONFIRMAR_CON_URL_DEL_NUCLEO: Record<string, ConfirmarConUrl> = {
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
  'src/modules/leads/features/plantillas/components/plantilla-del-embudo.tsx': {
    abre: 'src/modules/leads/features/plantillas/hooks/use-restablecer-plantilla-del-embudo.ts',
    senal: 'PANEL_RESTABLECER_EMBUDO',
  },
  'src/modules/leads/features/plantillas/components/mensaje-del-portal.tsx': {
    abre: 'src/modules/leads/features/plantillas/hooks/use-restablecer-mensaje-del-portal.ts',
    senal: 'PANEL_RESTABLECER_PORTAL',
  },
  'src/modules/cotizaciones/features/plantilla/components/descartar-la-plantilla.tsx': {
    abre: 'src/modules/cotizaciones/features/plantilla/hooks/use-panel-de-la-tarjeta.ts',
    senal: 'PANEL_DESCARTAR_PLANTILLA',
  },
  'src/modules/cotizaciones/features/niveles/components/eliminar-nivel.tsx': {
    abre: 'src/modules/cotizaciones/features/niveles/hooks/use-eliminar-nivel-por-url.ts',
    senal: 'PANEL_ELIMINAR_NIVEL',
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

export const CONFIRMAR_CON_URL: Record<string, ConfirmarConUrl> = {
  ...CONFIRMAR_CON_URL_DEL_NUCLEO,
  ...CONFIRMAR_CON_URL_DE_LA_FORMULA,
  ...CONFIRMAR_CON_URL_DE_LA_PAPELERA,
  ...sumarObjetos<ConfirmarConUrl>(
    import.meta.glob('./areas-*/confirmar-con-url.ts', { eager: true }),
  ),
}
