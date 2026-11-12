import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { ajustesDeLeadsDesde, type LectorDeAjustesDeLeads } from '../../entities/ajustes-de-leads'

// Las plantillas de leads de la empresa: `ajustes_leads_leer()`, de toda cuenta activa (la tabla no se lee directo).
export const getAjustesDeLeads: LectorDeAjustesDeLeads = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('ajustes_leads_leer')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const ajustes = ajustesDeLeadsDesde(data)
  return ajustes ? ok(ajustes) : fallo('inesperado', 'No pudimos leer los ajustes de leads.')
}
