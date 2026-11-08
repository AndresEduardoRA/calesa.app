import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { MarcasDeLaCotizacion } from '../../entities/comentarios/moderacion'
import {
  esquemaDeLaFavorita,
  esquemaDeLaModeracion,
  esquemaDelReporte,
  esquemaDelRetiro,
  marcasDesde,
} from '../../entities/comentarios/moderacion-lectura'
import type { RepositorioDeMarcas } from '../../entities/comentarios/repositorio-de-marcas'

// Favorita, reportar y moderar una cotización (4.27-4): se leen en el servidor, con el cliente de quien mira, y se escriben sólo por RPC (4.27-1). Lo que la base
// rechaza (sin acceso, sin permiso, el motivo, la versión) vuelve con su mensaje, ya escrito.

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'
const NO_SE_LEYERON = 'No se pudieron leer las marcas de esta cotización.'

// Las marcas de una guardada: su estado y su contador, y la favorita y el reporte de quien mira. Tres lecturas por clave primaria en paralelo; la usan dos huecos
// (la insignia y los botones) en el mismo render, por eso `cache`.
export const leerMarcasDeLaCotizacion = cache(
  async (cotizacionId: string): Promise<Resultado<MarcasDeLaCotizacion>> => {
    const supabase = await createClient()
    const { data: sesion } = await supabase.auth.getClaims()
    const yo = sesion?.claims.sub
    if (!yo) {
      return fallo('no_autenticado', NO_SE_LEYERON)
    }
    const [cotizacion, favoritos, reportes] = await Promise.all([
      // Por `cotizaciones_pkey`.
      supabase
        .from('cotizaciones')
        .select('estado, reportes_count')
        .eq('id', cotizacionId)
        .limit(1),
      // Por `cotizaciones_favoritos_pkey (cotizacion_id, usuario_id)`: la RLS deja ver sólo las propias.
      supabase
        .from('cotizaciones_favoritos')
        .select('cotizacion_id')
        .eq('cotizacion_id', cotizacionId)
        .limit(1),
      // Por `cotizaciones_reportes_pkey (cotizacion_id, usuario_id)`. Quien modera lee todos: el filtro por quien mira es obligatorio.
      supabase
        .from('cotizaciones_reportes')
        .select('motivo')
        .eq('cotizacion_id', cotizacionId)
        .eq('usuario_id', yo)
        .limit(1),
    ])
    const error = cotizacion.error ?? favoritos.error ?? reportes.error
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const marcas = marcasDesde({
      cotizacion: cotizacion.data,
      favoritos: favoritos.data,
      reportes: reportes.data,
    })
    return marcas ? ok(marcas) : fallo('inesperado', NO_SE_LEYERON)
  },
)

export const marcasSupabase: RepositorioDeMarcas = {
  ponerFavorita: async ({ cotizacionId, valor }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_favorito_poner', {
      p_cotizacion: cotizacionId,
      p_valor: valor,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const leido = esquemaDeLaFavorita.safeParse(data)
    return leido.success ? ok({ valor: leido.data.valor }) : fallo('inesperado', NO_SE_LEYO)
  },
  reportar: async ({ cotizacionId, motivo }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_reportar', {
      p_cotizacion: cotizacionId,
      p_motivo: motivo,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const leido = esquemaDelReporte.safeParse(data)
    return leido.success ? ok(leido.data) : fallo('inesperado', NO_SE_LEYO)
  },
  retirarReporte: async ({ cotizacionId }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_reporte_retirar', {
      p_cotizacion: cotizacionId,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const leido = esquemaDelRetiro.safeParse(data)
    return leido.success ? ok(leido.data) : fallo('inesperado', NO_SE_LEYO)
  },
  moderar: async ({ cotizacionId, actualizadoEn, estado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_moderar', {
      p_cotizacion: cotizacionId,
      p_actualizado_en_esperado: actualizadoEn,
      p_estado: estado,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const leido = esquemaDeLaModeracion.safeParse(data)
    return leido.success
      ? ok({ resultado: leido.data.resultado, estado: leido.data.estado })
      : fallo('inesperado', NO_SE_LEYO)
  },
}
