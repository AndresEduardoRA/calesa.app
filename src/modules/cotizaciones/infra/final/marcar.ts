import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeFinal } from '../../entities/final/repositorio'

// Marcar final se escribe sólo por RPC (`cotizacion_marcar_final`, 4.25-1): lo que la base rechaza vuelve como error con el mensaje ya escrito para la persona
// (el 23505 del índice, sin texto legible, queda con el genérico y lo traduce la pantalla).
export const finalSupabase: RepositorioDeFinal = {
  marcar: async (cotizacionId) => {
    const supabase = await createClient()
    const { error } = await supabase.rpc('cotizacion_marcar_final', { p_cotizacion: cotizacionId })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    return ok(null)
  },
}
