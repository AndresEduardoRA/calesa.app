// Los `<Drawer>` del carril C que no llevan formulario: el panel de «fuera de regla» de los requisitos de fase (5.08). Es un pedazo de `DRAWERS`
// (`drawers-con-salida.ts`, del A) que la guarda suma con `import.meta.glob('./areas-*/drawers-con-salida.ts')` (`registros-de-carriles.ts`).
import type { RegistroDeDrawer } from '../drawers-con-salida'

export const REGISTRO: Record<string, RegistroDeDrawer> = {
  'src/modules/flujos/features/requisitos/components/panel-de-fuera-de-regla.tsx': {
    sinFormulario:
      'sólo lista las unidades que quedaron fuera de regla y enlaza al inventario: no guarda nada tipeado; arreglarlas es de la unidad (Fase 6)',
  },
}
