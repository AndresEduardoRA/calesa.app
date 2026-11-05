import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { PRIMEROS_DEL_LOTE, armarPagina } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { lotesDesde } from '../../entities/papelera'
import type { LectorDePapeleraDeLeads } from '../../entities/repositorios'

// Una página de lotes de la papelera de leads que quien mira puede ver (`leads_papelera_listar()`): los
// que envió o, con `leads.papelera.purgar`, todos. Por keyset `(creado_en, id)` con `lotes_papelera_tipo_idx`;
// pide `tamano + 1` para saber si hay otra. De cada lote, los primeros `PRIMEROS_DEL_LOTE` y cuántos quedan (cierre 1). Trae el nombre y el número del lead, nunca su teléfono ni sus
// privados, y por qué no puede volver o no se purga.
export const getPapeleraDeLeads: LectorDePapeleraDeLeads = async ({ cursor, tamano }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('leads_papelera_listar', {
    ...(cursor ? { p_antes_en: cursor.instante, p_antes_id: cursor.id } : {}),
    p_hacia_atras: cursor?.sentido === 'anterior',
    p_tope: tamano + 1,
    p_primeros: PRIMEROS_DEL_LOTE,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lotes = lotesDesde(data)
  if (!lotes) {
    return fallo('inesperado', 'No pudimos leer la papelera de leads.')
  }
  return ok(armarPagina(lotes, tamano, cursor))
}
