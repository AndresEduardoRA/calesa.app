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

// Lo que devolvió `gastos_prorratear`: el lote, si ya estaba repartido y los ids de las filas creadas.
export type GastoProrrateado = { lote: string; yaExistia: boolean; ids: string[] }

export type PedidoDeProrrateo = {
  lote: string
  unidades: string[]
  categoriaId: string
  moneda: string
  monto: number
  tipoCambioId: string | null
  fecha: string
  proveedor: string | null
  notas: string | null
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
  // `gastos_prorratear`: un gasto por unidad, en partes iguales, todo o nada; el mismo lote con las mismas unidades devuelve lo ya repartido.
  prorratear: (pedido: PedidoDeProrrateo) => Promise<ResultadoDeAccion<GastoProrrateado>>
}
