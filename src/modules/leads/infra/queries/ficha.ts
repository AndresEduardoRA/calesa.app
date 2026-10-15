import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { fichaDesde } from '../../entities/ficha'
import type { LectorDeFicha } from '../../entities/repositorios'

// La ficha de un lead en un solo viaje: la fila de `leads_vista` (teléfono y atributos recortados
// según la cartera), quién lo tiene y sus teléfonos extra. Corre con la sesión de quien mira: lo
// que no ve, no existe (nulo), sea por inexistente, papelera, limbo o sin acceso.
export const getFicha: LectorDeFicha = async (id) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_ficha', { p_lead: id })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const ficha = fichaDesde(data)
  if (!ficha) {
    return fallo('inesperado', 'No pudimos leer la ficha del lead.')
  }
  return ok(ficha)
}
