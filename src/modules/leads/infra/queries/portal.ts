import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { accesoDesde } from '../../entities/portal'
import type { LectorDeAccesoDelCliente } from '../../entities/repositorios-de-portal'

// El estado del acceso del cliente: `portal_estado()` (la tabla no la lee la app). Con el código,
// nunca la clave ni su hash.
export const getAccesoDelCliente: LectorDeAccesoDelCliente = async (leadId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('portal_estado', { p_lead: leadId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const acceso = accesoDesde(data)
  return acceso ? ok(acceso) : fallo('inesperado', 'No pudimos leer el acceso al portal.')
}
