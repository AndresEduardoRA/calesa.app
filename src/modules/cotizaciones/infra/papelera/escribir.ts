import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { purgaDesde, restauracionDesde } from '../../entities/papelera/resultados'
import type { RepositorioDePapeleraDeCotizaciones } from '../../entities/papelera/repositorio'

// La papelera de cotizaciones se escribe sólo por RPC (`cotizaciones_papelera_*`, 4.24-1a y 4.24-1b). Restaurar y purgar llevan la versión del lote; lo que la base
// rechaza (versión vieja, sin permiso, el lote ya no está) vuelve como error con el mensaje ya escrito para la persona.

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

export const papeleraDeCotizacionesSupabase: RepositorioDePapeleraDeCotizaciones = {
  restaurar: async ({ loteId, actualizadoEnEsperado, cotizaciones }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizaciones_papelera_restaurar', {
      p_lote: loteId,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      // Sin la lista es el lote entero (el valor por defecto del parámetro es nulo).
      ...(cotizaciones ? { p_cotizaciones: [...cotizaciones] } : {}),
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const restauracion = restauracionDesde(data)
    return restauracion ? ok(restauracion) : fallo('inesperado', NO_SE_LEYO)
  },
  purgar: async ({ loteId, actualizadoEnEsperado, cotizaciones }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizaciones_papelera_purgar', {
      p_lote: loteId,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      ...(cotizaciones ? { p_cotizaciones: [...cotizaciones] } : {}),
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const purga = purgaDesde(data)
    return purga ? ok(purga) : fallo('inesperado', NO_SE_LEYO)
  },
}
