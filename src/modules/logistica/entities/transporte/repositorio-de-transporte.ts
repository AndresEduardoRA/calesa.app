// Guardar el transporte de una unidad, dicho como interfaz (6.08-2). La implementación (Supabase, por `transporte_guardar`, con la versión) vive en `infra/transporte/guardar.ts` y se la
// entrega `areas/transporte/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { CambiosDeTransporte } from './transporte'

export type PedidoDeTransporte = {
  // El vehículo (el repuesto llega con 8.13).
  vehiculoId: string
  // La versión leída; nula = crear (si ya existía, la base dice `PT409`).
  actualizadoEnEsperado: string | null
  cambios: CambiosDeTransporte
}

export type TransporteGuardado = { id: string; actualizadoEn: string; sinCambios: boolean }

export type RepositorioDeTransporte = {
  guardar: (pedido: PedidoDeTransporte) => Promise<ResultadoDeAccion<TransporteGuardado>>
}
