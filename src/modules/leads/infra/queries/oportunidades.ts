import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  oportunidadesDelLeadDesde,
  TOPE_DE_OPORTUNIDADES_DEL_LEAD,
} from '../../entities/oportunidad'
import type { LectorDeOportunidadesDelLead } from '../../entities/repositorios-de-oportunidades'

// Las de quien mira sobre un lead: una RPC de invocador (la RLS da sólo las propias, y sólo mientras
// tenga el lead en su cartera). Por cursor y de a 20 por defecto; hasta el 4.17-2 la sección pide su tope (el máximo de la base) y sin cursor.
export const getOportunidadesDelLead: LectorDeOportunidadesDelLead = async (leadId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_oportunidades', {
    p_lead: leadId,
    p_tamano: TOPE_DE_OPORTUNIDADES_DEL_LEAD,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = oportunidadesDelLeadDesde(data)
  return leidas ? ok(leidas) : fallo('inesperado', 'No pudimos leer las oportunidades.')
}
