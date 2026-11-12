// Registrar, corregir y eliminar un gasto de una unidad, dicho como interfaz (6.11-1). La implementación (Supabase, por RPC) vive en `infra/dinero/gastos.ts` y se la
// entrega `areas/dinero/composicion.ts`. El archivo del comprobante ya está en el bucket: lo sube el navegador (`infra/dinero/comprobante.client.ts`).
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { DatosDeGasto } from './gasto'

// Lo que la base decidió: la versión nueva (para la siguiente corrección) y, si hubo otra moneda, la tasa y el equivalente en base.
export type GastoGuardado = {
  id: string
  actualizadoEn: string
  tipoCambioAplicado: number | null
  montoBase: number | null
}

export type RepositorioDeGastos = {
  // `gasto_registrar`: el id lo manda el cliente, así que un reintento no duplica.
  registrar: (
    pedido: { id: string; vehiculoId: string } & DatosDeGasto,
  ) => Promise<ResultadoDeAccion<GastoGuardado>>
  // `gasto_guardar`: con la versión que se tenía en pantalla; `cambios` es sólo lo que cambió (`cambiosDeGasto`).
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: Record<string, unknown>
  }) => Promise<ResultadoDeAccion<GastoGuardado>>
  // `gasto_eliminar`: borrado suave, con la versión esperada.
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeAccion<{ id: string }>>
}
