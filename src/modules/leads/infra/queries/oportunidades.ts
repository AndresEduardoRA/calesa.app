import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { oportunidadesDelLeadDesde } from '../../entities/oportunidad'
import type { LectorDeOportunidadesDelLead } from '../../entities/repositorios-de-oportunidades'

// Las de quien mira sobre un lead: una RPC de invocador (la RLS da sólo las propias, y sólo mientras
// tenga el lead en su cartera).
export const getOportunidadesDelLead: LectorDeOportunidadesDelLead = async (leadId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_oportunidades', { p_lead: leadId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = oportunidadesDelLeadDesde(data)
  return leidas ? ok(leidas) : fallo('inesperado', 'No pudimos leer las oportunidades.')
}
