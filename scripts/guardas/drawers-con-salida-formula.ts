// Los `<Drawer>` del área de la fórmula, del carril B (4.20-3b). Es un pedazo de `DRAWERS` (`drawers-con-salida.ts`, del A) en su propio
// archivo para que el B registre su panel sin tocar un archivo del A.
import type { RegistroDeDrawer } from './drawers-con-salida'

export const DRAWERS_DE_LA_FORMULA: Record<string, RegistroDeDrawer> = {
  // El ⚙ de una constante en la hoja (4.20-3b): lo tipeado no tiene borrador, así que el cuerpo (una sola llamada para todo el panel) pide `preguntaAlCerrar`.
  'src/modules/cotizaciones/features/formula/components/hoja/panel-del-ajuste.tsx': {
    formulario: 'src/modules/cotizaciones/features/formula/components/hoja/cuerpo-del-ajuste.tsx',
    mecanismo: 'contexto',
  },
}
