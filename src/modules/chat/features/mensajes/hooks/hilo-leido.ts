import { MENSAJE_INESPERADO, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { leerPaginaDeMensajes } from '../../../composicion.client'
import type { Mensaje, PaginaDeMensajes } from '../../../entities/mensajes'

export type Hilo = { mensajes: Mensaje[]; hayAnteriores: boolean }
export type LecturaDelHilo = 'cargando' | 'listo' | 'error'

const ERROR_INESPERADO: ErrorApp = { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO }

export type RespuestaDelHilo = Resultado<PaginaDeMensajes>

export const esEnviado = (m: Mensaje) => m.estado === 'enviado'

// Una lectura que no llegó (sin red) se dice como error, no como excepción.
export async function leerElHilo(
  pedido: Parameters<typeof leerPaginaDeMensajes>[0],
): Promise<RespuestaDelHilo> {
  try {
    return await leerPaginaDeMensajes(pedido)
  } catch {
    return { ok: false, error: ERROR_INESPERADO }
  }
}
