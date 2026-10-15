import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { otorgadoDesde } from '../entities/portal'
import type { FalloDelPortal, RepositorioDelPortal } from '../entities/repositorios-de-portal'

// El acceso del cliente se escribe sólo por estas RPC (`…20261016000300_portal_cliente.sql`). La clave
// viaja como parámetro (nunca en el texto de la consulta) y, si la genera la base, vuelve una sola vez:
// nada de esto la escribe en un registro.

type ErrorDeRpc = { code?: string | null; message: string; hint?: string | null }

function fallo(error: ErrorDeRpc): FalloDelPortal {
  return { ok: false, error: errorDePostgrest(error), ...(error.hint ? { campo: error.hint } : {}) }
}

export const portalSupabase: RepositorioDelPortal = {
  otorgar: async ({ leadId, clave, otorgadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('otorgar_portal', {
      p_lead: leadId,
      // La firma acepta nulo (la base genera la clave); los tipos generados no lo saben.
      p_clave: clave as string,
      p_otorgado_en_esperado: otorgadoEnEsperado as string,
    })
    if (error) {
      return fallo(error)
    }
    const otorgado = otorgadoDesde(data)
    return otorgado
      ? { ok: true, data: otorgado }
      : falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
  },
  revocar: async (leadId) => {
    const supabase = await createClient()
    const { error } = await supabase.rpc('revocar_portal', { p_lead: leadId })
    return error ? fallo(error) : { ok: true, data: null }
  },
  desbloquear: async (leadId) => {
    const supabase = await createClient()
    const { error } = await supabase.rpc('portal_desbloquear', { p_lead: leadId })
    return error ? fallo(error) : { ok: true, data: null }
  },
}
