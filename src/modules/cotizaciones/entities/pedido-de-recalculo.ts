import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { EntradasDelPedido } from './entradas'
import { recalculoDesde, type RespuestaDeRecalculo } from './recalculo'

// Un recálculo de la hoja es UNA llamada a `cotizacion_evaluar()` por origen: la versión de la fórmula y los tipos de cambio de la hoja que se abrió (`abierta`, que firmó la base
// con `cotizacion_hoja()`: 4-28, el total que se ve es el de la hoja que se dibujó) y, si hay, el vehículo. El modo de tipo
// de cambio va por su clave (`p_modo_tc`), nunca como objeto: sus buckets nombran tipos de cambio que un nivel puede esconder. En el 4.13-2 no hay modo.
export type PedidoDeRecalculo = {
  origenId: string
  vehiculoId: string | null
  abierta: string
  entradas: EntradasDelPedido
  modoTc: string | null
}

export function argumentosDeEvaluar(p: PedidoDeRecalculo) {
  return {
    p_entradas: p.entradas,
    p_origen: p.origenId,
    p_abierta: p.abierta,
    ...(p.vehiculoId === null ? {} : { p_vehiculo: p.vehiculoId }),
    ...(p.modoTc === null ? {} : { p_modo_tc: p.modoTc }),
  }
}

// El mensaje de la base nunca se muestra (puede nombrar un nodo que quien mira no ve): la pantalla decide su texto con el código.
export function resultadoDeEvaluar(respuesta: {
  data: unknown
  error: { code?: string | null; message: string } | null
}): Resultado<RespuestaDeRecalculo> {
  if (respuesta.error) {
    return { ok: false, error: errorDePostgrest(respuesta.error) }
  }
  const leida = recalculoDesde(respuesta.data)
  return leida ? ok(leida) : fallo('inesperado', 'No pudimos leer el cálculo de la hoja.')
}
