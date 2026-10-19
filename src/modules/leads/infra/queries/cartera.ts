import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { carteraDesde } from '../../entities/cartera'
import type { LectorDeCarteraCorta } from '../../entities/fuente-del-listado'
import type { LectorDeCartera } from '../../entities/repositorios'

// Quién tiene el lead: nombres y tipo de acceso, sin correo ni teléfono (`lead_cartera()`). Para
// quien ve el lead, también la supervisión sin cartera. Nulo es «no se ve»: la ficha ya lo trata.
export const getCartera: LectorDeCartera = async (leadId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_cartera', { p_lead: leadId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok([])
  }
  const cartera = carteraDesde(data)
  if (!cartera) {
    return fallo('inesperado', 'No pudimos leer quién tiene este lead.')
  }
  return ok(cartera)
}

// ¿Tiene quien mira como mucho `_leads_cartera_corta_tope()` leads en su cartera? (`leads_cartera_corta()`: cuenta hasta tope + 1 por
// `leads_asesores_usuario_vigente_idx` y dice sólo sí o no, nunca un número.) Si no se pudo saber, no: se lee por la vista de siempre.
export const getCarteraCorta: LectorDeCarteraCorta = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('leads_cartera_corta')
  return !error && data === true
}
