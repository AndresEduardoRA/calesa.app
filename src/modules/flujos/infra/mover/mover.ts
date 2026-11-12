import 'server-only'
import { errorDePostgrest, MENSAJE_INESPERADO, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { unidadParaMoverDesde } from '../../entities/mover/para-mover'
import type { FalloDeMover, RepositorioDeMover } from '../../entities/mover/repositorios'
import {
  filasDelLoteDesde,
  vistaPreviaDelLoteDesde,
  vistaPreviaDesde,
} from '../../entities/mover/vista-previa'
import { leerDestinosDeBase } from './destinos'

// Las cuatro RPC de mover (`…023125_fases_mover_candado.sql`, `…023126_fases_mover_lote.sql`) y `logistica_unidad` (`…023135_fases_unidad.sql`). Las RPC no declaran valores por omisión
// y sus tipos generados no admiten nulo; la base sí (un parámetro nulo es «no va»). Un rechazo de `cambiar_fase` trae su código en el `hint`.
const nulo = (valor: string | null): string => valor as string

type ErrorDeRpc = { code?: string | null; message: string; hint?: string | null }

function falloDeRpc(error: ErrorDeRpc): FalloDeMover {
  const fallido: FalloDeMover = { ok: false, error: errorDePostgrest(error) }
  return error.hint ? { ...fallido, codigo: error.hint } : fallido
}

function comoLectura<T>(
  salida: {
    data: unknown
    error: ErrorDeRpc | null
  },
  leer: (dato: unknown) => Resultado<T>,
): Resultado<T> {
  return salida.error ? { ok: false, error: errorDePostgrest(salida.error) } : leer(salida.data)
}

export const moverSupabase: RepositorioDeMover = {
  leerUnidad: async (vehiculoId) => {
    const supabase = await createClient()
    return comoLectura(
      await supabase.rpc('logistica_unidad', { p_vehiculo: vehiculoId }),
      unidadParaMoverDesde,
    )
  },
  leerDestinos: (pedido) => leerDestinosDeBase(pedido),
  previsualizar: async ({ vehiculoId, faseDestino }) => {
    const supabase = await createClient()
    return comoLectura(
      await supabase.rpc('previsualizar_cambio_fase', {
        p_vehiculo: vehiculoId,
        p_repuesto: nulo(null),
        p_fase_destino: faseDestino,
      }),
      vistaPreviaDesde,
    )
  },
  previsualizarLote: async ({ vehiculos, faseDestino }) => {
    const supabase = await createClient()
    return comoLectura(
      await supabase.rpc('previsualizar_cambio_fase_lote', {
        p_vehiculos: [...vehiculos],
        p_fase: faseDestino,
      }),
      vistaPreviaDelLoteDesde,
    )
  },
  cambiar: async ({ vehiculoId, faseDestino, faseEsperada, nota }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cambiar_fase', {
      p_vehiculo: vehiculoId,
      p_repuesto: nulo(null),
      p_fase_destino: faseDestino,
      p_nota: nulo(nota),
      p_fase_esperada: nulo(faseEsperada),
    })
    if (error) return falloDeRpc(error)
    if (typeof data !== 'number')
      return { ok: false, error: { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO } }
    return { ok: true, data: { historialId: data } }
  },
  cambiarLote: async ({ unidades, faseDestino, nota }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cambiar_fase_lote', {
      p_unidades: unidades.map((u) => ({ vehiculo: u.vehiculoId, fase_esperada: u.faseEsperada })),
      p_fase_destino: faseDestino,
      p_nota: nulo(nota),
    })
    if (error) return falloDeRpc(error)
    const filas = filasDelLoteDesde(data)
    return filas.ok ? filas : { ok: false, error: filas.error }
  },
}
