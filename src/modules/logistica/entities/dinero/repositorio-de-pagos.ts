// Registrar, corregir, eliminar, confirmar y anular un pago de una unidad, dicho como interfaz (6.11-2). La implementación (Supabase, por RPC) vive en `infra/dinero/pagos.ts` y se la
// entrega `areas/dinero/composicion.ts`. El archivo del comprobante ya está en el bucket: lo sube el navegador (`infra/dinero/comprobante.client.ts`).
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { DatosDePago } from './pago'

// Lo que la base decidió: la versión nueva y, si hubo otra moneda, la tasa y el equivalente en base.
export type PagoGuardado = {
  id: string
  actualizadoEn: string
  tipoCambioAplicado: number | null
  montoBase: number | null
}

// El sello lo pone la base (el disparador): quién y cuándo.
export type PagoConfirmado = {
  id: string
  actualizadoEn: string
  confirmadoPor: string | null
  confirmadoEn: string | null
}

// De quién es un pago: de un vehículo o de un proyecto de repuestos (8.13-5), nunca de los dos.
export type DuenoDelPago =
  { vehiculoId: string; proyectoId?: undefined } | { proyectoId: string; vehiculoId?: undefined }

export type RepositorioDePagos = {
  // `pago_registrar` (vehículo) o `pago_registrar_proyecto` (8.13-5): el id lo manda el cliente, así que un reintento no duplica. Sin lead: no se
  // elige en esta parte (D3).
  registrar: (
    pedido: { id: string } & DuenoDelPago & DatosDePago,
  ) => Promise<ResultadoDeAccion<PagoGuardado>>
  // `pago_guardar`: con la versión que se tenía en pantalla; `cambios` es sólo lo que cambió (`cambiosDePago`).
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: Record<string, unknown>
  }) => Promise<ResultadoDeAccion<PagoGuardado>>
  // `pago_eliminar`: borrado suave, sólo de uno sin confirmar.
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeAccion<{ id: string }>>
  // `pago_confirmar`: pide `logistica.pagos.confirmar`; queda sellado.
  confirmar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeAccion<PagoConfirmado>>
  // `pago_anular`: sólo uno confirmado, con motivo de 1 a 500 letras.
  anular: (pedido: {
    id: string
    actualizadoEnEsperado: string
    motivo: string
  }) => Promise<ResultadoDeAccion<{ id: string }>>
}
