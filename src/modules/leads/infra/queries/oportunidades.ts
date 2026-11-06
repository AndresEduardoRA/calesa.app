import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  OPORTUNIDADES_VISIBLES_DEL_LEAD,
  oportunidadesDelLeadDesde,
} from '../../entities/oportunidad'
import type { LectorDeOportunidadesDelLead } from '../../entities/repositorios-de-oportunidades'

// Las de quien mira sobre un lead: una RPC de invocador (la RLS da sólo las propias, y sólo mientras
// tenga el lead en su cartera). Por cursor; la sección pide en el servidor la primera página, de las que se ven, y «Ver más» sigue desde el
// navegador (`infra/oportunidades.client.ts`). Las dos caben en el máximo de 100 de la base.
export const getOportunidadesDelLead: LectorDeOportunidadesDelLead = async (leadId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_oportunidades', {
    p_lead: leadId,
    p_tamano: OPORTUNIDADES_VISIBLES_DEL_LEAD,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = oportunidadesDelLeadDesde(data)
  return leidas ? ok(leidas) : fallo('inesperado', 'No pudimos leer las oportunidades.')
}
