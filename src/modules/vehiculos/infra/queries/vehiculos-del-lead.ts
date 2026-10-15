import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeVehiculosDelLead } from '../../entities/repositorios'
import { vehiculosDelLeadDesde } from '../../entities/vehiculos-del-lead'

// Los vehículos de un lead para su ficha. `lead_vehiculos()` corre con la RLS de quien llama: lo que
// no ve no llega ni se cuenta, y este módulo no lee `leads`.
export const getVehiculosDelLead: LectorDeVehiculosDelLead = async (leadId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_vehiculos', { p_lead: leadId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidos = vehiculosDelLeadDesde(data)
  return leidos ? ok(leidos) : fallo('inesperado', 'No pudimos leer los vehículos de este lead.')
}
