import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { PRIMEROS_DEL_LOTE, armarPagina } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { lotesDesde } from '../../entities/papelera/lotes'
import type { LectorDePapeleraDeCotizaciones } from '../../entities/papelera/repositorio'

// Una página de lotes de la papelera de cotizaciones que quien mira puede ver (`cotizaciones_papelera_listar()`): los que envió o, con
// `cotizaciones.papelera.purgar`, todos. Por keyset `(creado_en, id)` con `lotes_papelera_tipo_idx`; pide `tamano + 1` para saber si hay otra.
// De cada lote, las primeras `PRIMEROS_DEL_LOTE` y cuántas quedan. Trae número, título, clase, origen y fecha: nada que la RLS le esconda a quien tiene la
// clave y no ve la cotización.
export const getPapeleraDeCotizaciones: LectorDePapeleraDeCotizaciones = async ({
  cursor,
  tamano,
}) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cotizaciones_papelera_listar', {
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
    return fallo('inesperado', 'No pudimos leer la papelera de cotizaciones.')
  }
  return ok(armarPagina(lotes, tamano, cursor))
}
