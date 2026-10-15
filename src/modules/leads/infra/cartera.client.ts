// A quién se le puede dar el lead, desde el navegador: lo lee el panel al abrirse, así la lista es
// la de ese momento (otra persona pudo compartirlo). `lead_cartera_candidatos()` corre con la sesión
// de quien mira y devuelve sólo nombres de personas activas con `leads.ver` que no lo tienen.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { candidatosDesde } from '../entities/cartera'
import type { LectorDeCandidatosDeCartera } from '../entities/repositorios'

export const leerCandidatosDeCartera: LectorDeCandidatosDeCartera = async (leadId) => {
  const { data, error } = await createClient().rpc('lead_cartera_candidatos', { p_lead: leadId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const candidatos = candidatosDesde(data)
  if (!candidatos) {
    return fallo('inesperado', 'No pudimos leer a quién se le puede dar.')
  }
  return ok(candidatos)
}
