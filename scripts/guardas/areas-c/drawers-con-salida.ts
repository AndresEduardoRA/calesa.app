// Los `<Drawer>` del carril C que no llevan formulario: el panel de «fuera de regla» de los requisitos de fase (5.08). Es un pedazo de `DRAWERS`
// (`drawers-con-salida.ts`, del A) que la guarda suma con `import.meta.glob('./areas-*/drawers-con-salida.ts')` (`registros-de-carriles.ts`).
import type { RegistroDeDrawer } from '../drawers-con-salida'

export const REGISTRO: Record<string, RegistroDeDrawer> = {
  'src/modules/flujos/features/requisitos/components/panel-de-fuera-de-regla.tsx': {
    sinFormulario:
      'sólo lista las unidades que quedaron fuera de regla y enlaza al inventario: no guarda nada tipeado; arreglarlas es de la unidad (Fase 6)',
  },
  // El formulario de un gasto de la unidad (6.11-1): `?panel=gasto&gasto=<id|nuevo>`. Dice que tiene algo escrito con `useCambiosSinGuardar` en el mismo archivo.
  'src/modules/logistica/features/dinero/components/drawer-de-gasto.tsx': {
    formulario: 'src/modules/logistica/features/dinero/components/drawer-de-gasto.tsx',
    mecanismo: 'contexto',
  },
  // El formulario de un pago de la unidad (6.11-2): `?panel=pago&pago=<id|nuevo>`.
  'src/modules/logistica/features/dinero/components/drawer-de-pago.tsx': {
    formulario: 'src/modules/logistica/features/dinero/components/drawer-de-pago.tsx',
    mecanismo: 'contexto',
  },
  // Anular un pago confirmado, con su motivo (6.11-2): `?panel=anular-pago&pago=<id>`.
  'src/modules/logistica/features/dinero/components/drawer-de-anulacion.tsx': {
    formulario: 'src/modules/logistica/features/dinero/components/drawer-de-anulacion.tsx',
    mecanismo: 'contexto',
  },
}
