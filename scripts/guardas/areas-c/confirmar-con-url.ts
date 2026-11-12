// Los `<Confirmar>` del carril C fuera de la papelera (4.27-2): borrar un comentario de una cotización quitar uno de sus adjuntos (4.27-3) moderarla (4.27-4) y emitir un comprobante (4.26-2). Es un pedazo de `CONFIRMAR_CON_URL` (`confirmar-con-url.ts`,
// del A) que la guarda suma con `import.meta.glob('./areas-*/confirmar-con-url.ts')` (`registros-de-carriles.ts`).
import type { ConfirmarConUrl } from '../confirmar-con-url'

export const REGISTRO: Record<string, ConfirmarConUrl> = {
  // `?panel=borrar-comentario&comentario=<id>`.
  'src/modules/cotizaciones/features/comentarios/components/confirmar-borrado.tsx': {
    abre: 'src/modules/cotizaciones/features/comentarios/hooks/use-borrado-por-url.ts',
    senal: 'PANEL_BORRAR_COMENTARIO',
  },
  // `?panel=quitar-adjunto&adjunto=<id>` (4.27-3).
  'src/modules/cotizaciones/features/comentarios/components/confirmar-quitado.tsx': {
    abre: 'src/modules/cotizaciones/features/comentarios/hooks/use-quitado-por-url.ts',
    senal: 'PANEL_QUITAR_ADJUNTO',
  },
  // `?panel=moderar&accion=invalidar|descartar|reactivar` (4.27-4).
  'src/modules/cotizaciones/features/comentarios/components/confirmar-moderacion.tsx': {
    abre: 'src/modules/cotizaciones/features/comentarios/hooks/use-moderacion-por-url.ts',
    senal: 'PANEL_MODERAR',
  },
  // `?panel=emitir-comprobante` (4.26-2).
  'src/modules/cotizaciones/features/comprobantes/components/confirmar-emitir-comprobante.tsx': {
    abre: 'src/modules/cotizaciones/features/comprobantes/components/boton-emitir-comprobante.tsx',
    senal: 'PANEL_EMITIR_COMPROBANTE',
  },
  // `?panel=eliminar-tipo&tipo=<id>` (5.09).
  'src/modules/flujos/features/documentos/components/eliminar-tipo.tsx': {
    abre: 'src/modules/flujos/features/documentos/hooks/use-eliminar-tipo-por-url.ts',
    senal: 'PANEL_ELIMINAR_TIPO',
  },
  // `?eliminar=requisito&quitar=<id>` (5.08): el diálogo de un inspector que ya ocupa `?fase=`.
  'src/modules/flujos/features/requisitos/components/eliminar-requisito.tsx': {
    abre: 'src/modules/flujos/features/requisitos/hooks/use-eliminar-requisito-por-url.ts',
    senal: 'PANEL_ELIMINAR_REQUISITO',
  },
  // `?panel=eliminar-gasto&gasto=<id>` (6.11-1).
  'src/modules/logistica/features/dinero/components/confirmar-eliminar-gasto.tsx': {
    abre: 'src/modules/logistica/features/dinero/hooks/use-eliminar-gasto-por-url.ts',
    senal: 'PANEL_ELIMINAR_GASTO',
  },
  // `?panel=eliminar-pago&pago=<id>` (6.11-2).
  'src/modules/logistica/features/dinero/components/confirmar-eliminar-pago.tsx': {
    abre: 'src/modules/logistica/features/dinero/hooks/use-eliminar-pago-por-url.ts',
    senal: 'PANEL_ELIMINAR_PAGO',
  },
  // `?panel=confirmar-pago&pago=<id>` (6.11-2).
  'src/modules/logistica/features/dinero/components/confirmar-pago.tsx': {
    abre: 'src/modules/logistica/features/dinero/hooks/use-confirmar-pago-por-url.ts',
    senal: 'PANEL_CONFIRMAR_PAGO',
  },
  // `?panel=prorratear` (6.11-4).
  'src/modules/logistica/features/dinero/components/confirmar-prorrateo.tsx': {
    abre: 'src/modules/logistica/features/dinero/hooks/use-prorrateo.ts',
    senal: 'PANEL_PRORRATEAR',
  },
  // `?panel=eliminar-categoria&categoria=<id>` (6.11-4).
  'src/modules/logistica/features/dinero/components/eliminar-categoria.tsx': {
    abre: 'src/modules/logistica/features/dinero/hooks/use-eliminar-categoria-por-url.ts',
    senal: 'PANEL_ELIMINAR_CATEGORIA',
  },
  // `?panel=eliminar-valor&valor=<id>` (8.08-3).
  'src/modules/repuestos/features/catalogos/components/eliminar-valor.tsx': {
    abre: 'src/modules/repuestos/features/catalogos/hooks/use-eliminar-valor-por-url.ts',
    senal: 'PANEL_ELIMINAR_VALOR',
  },
  // `?panel=salir` sobre la conversación abierta (7.09-2); no toca `?c=`.
  'src/modules/chat/features/conversaciones/components/confirmar-salir.tsx': {
    abre: 'src/modules/chat/features/conversaciones/hooks/use-salir-por-url.ts',
    senal: 'PANEL_SALIR_DE_LA_CONVERSACION',
  },
  // `?panel=borrar-mensaje&mensaje=<id>` sobre la conversación abierta (7.09-4); no toca `?c=`.
  'src/modules/chat/features/mensajes/components/confirmar-borrado.tsx': {
    abre: 'src/modules/chat/features/mensajes/hooks/use-borrado-por-url.ts',
    senal: 'PANEL_BORRAR_MENSAJE',
  },
  // `?panel=canal` sobre el resumen de la declaración que ya ocupa `?declaracion=` (6.09-2).
  'src/modules/logistica/features/aduana/components/confirmar-asignar-canal.tsx': {
    abre: 'src/modules/logistica/features/aduana/hooks/use-canal-por-url.ts',
    senal: 'PANEL_CANAL',
  },
}
