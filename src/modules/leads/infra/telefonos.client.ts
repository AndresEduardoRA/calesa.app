// Los teléfonos de un lead, leídos en el navegador con la sesión de quien mira: `lead_telefonos_leer()` (invocadora) da el principal y los
// extra tal como los ve esa persona (completos en su cartera, enmascarados fuera) y el máximo de la empresa. El resumen del listado no
// tiene la ficha entera: pide esto al abrir.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { LectorDeTelefonosDelLead } from '../entities/repositorios'
import { telefonosDelLeadDesde } from '../entities/telefonos'

export const leerTelefonosDelLead: LectorDeTelefonosDelLead = async (id) => {
  const { data, error } = await createClient().rpc('lead_telefonos_leer', { p_lead: id })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const telefonos = telefonosDelLeadDesde(data)
  return telefonos ? ok(telefonos) : fallo('inesperado', 'No pudimos leer los teléfonos del lead.')
}
