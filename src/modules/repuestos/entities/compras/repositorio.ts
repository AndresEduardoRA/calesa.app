// Guardar, eliminar y restaurar una compra, dicho como interfaz (8.11-3, C4). La implementación (Supabase, por RPC) vive en `infra/compras/escribir.ts` y la entrega
// `areas/compras/composicion.ts`. El archivo del comprobante ya está en el bucket: lo sube el navegador (`infra/compras/comprobante.client.ts`).
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { ClavesDeCompra } from './formulario'

// Lo que decidió la base: la versión nueva y, si la moneda no es la base, la tasa y el equivalente.
export type CompraGuardada = {
  id: string
  actualizadoEn: string
  tipoCambioAplicado: number | null
  montoBase: number | null
}

export type CompraVersionada = { id: string; actualizadoEn: string }

export type RepositorioDeCompras = {
  // `repuesto_compra_guardar`: con la esperada nula crea (el id lo manda el cliente: un reintento no duplica); con la esperada puesta, edita sólo las claves que llegan.
  guardar: (pedido: {
    id: string
    proyectoId: string
    actualizadoEnEsperado: string | null
    datos: ClavesDeCompra
  }) => Promise<ResultadoDeAccion<CompraGuardada>>
  // `repuesto_compra_eliminar`: borrado suave, con la versión esperada.
  eliminar: (
    pedido: CompraVersionada & { actualizadoEnEsperado: string },
  ) => Promise<ResultadoDeAccion<CompraVersionada>>
  // `repuesto_compra_restaurar`: el «Deshacer», con la versión que devolvió eliminar.
  restaurar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeAccion<CompraVersionada>>
}
