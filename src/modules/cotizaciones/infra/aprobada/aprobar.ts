import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { resultadoDeAprobar } from '../../entities/aprobada/lectura'
import type { RepositorioDeAprobada } from '../../entities/aprobada/repositorio'

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

// Aprobar se escribe sólo por RPC (`cotizacion_aprobar`): lo que la base rechaza (sin acceso, sin permiso, sin vehículo, inválida, la versión) vuelve como error con el
// mensaje ya escrito para la persona.
export const aprobadaSupabase: RepositorioDeAprobada = {
  aprobar: async (cotizacionId, actualizadoEn) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_aprobar', {
      p_cotizacion: cotizacionId,
      p_actualizado_en_esperado: actualizadoEn,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const leido = resultadoDeAprobar(data)
    return leido ? ok(leido) : fallo('inesperado', NO_SE_LEYO)
  },
}
