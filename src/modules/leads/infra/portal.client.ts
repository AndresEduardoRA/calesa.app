// El estado del acceso del cliente, desde el navegador: lo lee el panel de transferir al abrirse (sólo
// para quien gestiona el acceso de ese lead) para avisar que el cliente verá a otra persona como su
// asesor. `portal_estado()` corre con la sesión de quien mira.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { accesoDesde } from '../entities/portal'
import type { LectorDeAccesoDelCliente } from '../entities/repositorios-de-portal'

export const leerAccesoDelCliente: LectorDeAccesoDelCliente = async (leadId) => {
  const { data, error } = await createClient().rpc('portal_estado', { p_lead: leadId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const acceso = accesoDesde(data)
  return acceso ? ok(acceso) : fallo('inesperado', 'No pudimos leer el acceso al portal.')
}
