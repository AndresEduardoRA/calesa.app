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
  // «Nuevo proyecto» de `/repuestos` (8.09-1): `?panel=nuevo-proyecto`. Dice que tiene algo escrito con `useCambiosSinGuardar` en el mismo archivo.
  'src/modules/repuestos/features/proyectos/components/drawer-de-nuevo-proyecto.tsx': {
    formulario: 'src/modules/repuestos/features/proyectos/components/drawer-de-nuevo-proyecto.tsx',
    mecanismo: 'contexto',
  },
  // Las imágenes de un ítem de repuestos (8.09-3): `?panel=imagenes&item=<id>`.
  'src/modules/repuestos/features/items/components/drawer-de-imagenes.tsx': {
    sinFormulario: 'sube y quita imágenes al instante: no guarda nada tipeado',
  },
  // El stock de un ítem de repuestos (8.10-2): `?panel=stock&item=<id>`. El formulario «Pasar a stock» dice que tiene algo escrito con `useCambiosSinGuardar`.
  'src/modules/repuestos/features/stock/components/drawer-de-stock.tsx': {
    formulario: 'src/modules/repuestos/features/stock/components/formulario-pasar-a-stock.tsx',
    mecanismo: 'contexto',
  },
  // Vista «Stock» de `/repuestos` (8.10-3): `?panel=vender-stock|devolver-stock&item=<id>`. Dice que tiene algo escrito con `useCambiosSinGuardar` en el mismo archivo.
  'src/modules/repuestos/features/stock/components/drawer-de-salida.tsx': {
    formulario: 'src/modules/repuestos/features/stock/components/drawer-de-salida.tsx',
    mecanismo: 'contexto',
  },
  // Registrar y editar una compra de un proyecto de repuestos (8.11-3): `?panel=compra&compra=<id|nueva>`. Dice que tiene algo escrito con `useCambiosSinGuardar` en el mismo archivo.
  'src/modules/repuestos/features/compras/components/drawer-de-compra.tsx': {
    formulario: 'src/modules/repuestos/features/compras/components/drawer-de-compra.tsx',
    mecanismo: 'contexto',
  },
  // Vista «Stock» de `/repuestos` (8.10-3): `?panel=reasignar-stock&item=<id>`. Dice que tiene algo escrito con `useCambiosSinGuardar` en el mismo archivo.
  'src/modules/repuestos/features/stock/components/drawer-de-reasignar.tsx': {
    formulario: 'src/modules/repuestos/features/stock/components/drawer-de-reasignar.tsx',
    mecanismo: 'contexto',
  },
  // El resumen de una declaración aduanera (6.09-1): `?declaracion=<id>`. Sólo muestra; el formulario de editar y alta es otro panel (`drawer-de-declaracion.tsx`).
  'src/modules/logistica/features/aduana/components/drawer-de-la-declaracion.tsx': {
    sinFormulario:
      'sólo muestra los datos y los vehículos de la declaración: no guarda nada tipeado; escribir es del formulario de la declaración',
  },
  // El formulario de una declaración (6.09-2): `?panel=nueva-declaracion` o `?panel=editar-declaracion&declaracion=<id>`.
  'src/modules/logistica/features/aduana/components/drawer-de-declaracion.tsx': {
    formulario: 'src/modules/logistica/features/aduana/components/drawer-de-declaracion.tsx',
    mecanismo: 'contexto',
  },
  // La mención abierta en el chat (7.10-1): `?mencion=<clase>:<id>`. Sólo muestra lo que el hilo ya leyó y enlaza a la pantalla del módulo.
  'src/modules/chat/features/menciones/components/drawer-de-mencion.tsx': {
    sinFormulario:
      'sólo muestra lo ya leído bajo la sesión de quien mira y enlaza al módulo: no guarda nada tipeado',
  },
  // «Nueva tarea» y «Nuevo evento» desde el chat (7.10-3): `?panel=tarea` y `?panel=evento`. Dicen que hay algo escrito con `<CambiosSinGuardar>` en el mismo archivo.
  'src/modules/chat/features/fichas/components/panel-de-tarea.tsx': {
    formulario: 'src/modules/chat/features/fichas/components/panel-de-tarea.tsx',
    mecanismo: 'contexto',
  },
  'src/modules/chat/features/fichas/components/panel-de-evento.tsx': {
    formulario: 'src/modules/chat/features/fichas/components/panel-de-evento.tsx',
    mecanismo: 'contexto',
  },
  // El diff de un cambio de la actividad (9.01-4): `?cambio=<id>`. Sólo muestra lo que devuelve `actividad_diff`.
  'src/modules/actividad/features/diff/components/drawer-de-cambio.tsx': {
    sinFormulario:
      'de sólo lectura: el diff de un cambio de la actividad (9.01-4); no hay nada que escribir',
  },
}
