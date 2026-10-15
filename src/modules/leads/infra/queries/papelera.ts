import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { lotesDesde } from '../../entities/papelera'
import type { LectorDePapeleraDeLeads } from '../../entities/repositorios'

// Los lotes de la papelera de leads que quien mira puede ver (`leads_papelera_listar()`): los que
// envió o, con `leads.papelera.purgar`, todos. Trae el nombre y el número del lead, nunca su
// teléfono ni sus privados, y por qué no puede volver o no se purga.
export const getPapeleraDeLeads: LectorDePapeleraDeLeads = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('leads_papelera_listar')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lotes = lotesDesde(data)
  if (!lotes) {
    return fallo('inesperado', 'No pudimos leer la papelera de leads.')
  }
  return ok(lotes)
}
