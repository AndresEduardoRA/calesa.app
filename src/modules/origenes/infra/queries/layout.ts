import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { camposDesde } from '../../entities/campo'
import { categoriasDesde } from '../../entities/categoria'
import type { LectorDeLayout } from '../../entities/repositorios'

// El layout de un origen: todos sus campos (también los desactivados) y sus categorías. Cualquier
// cuenta lo lee (las fichas lo necesitan); contar vehículos por categoría pide
// `origenes.gestionar`, y sin él la lista no inventa ceros.
export const getLayout: LectorDeLayout = async (origenId, { conUso }) => {
  const supabase = await createClient()
  const [campos, categorias, usos] = await Promise.all([
    supabase.from('origenes_campos').select('*').eq('origen_id', origenId),
    supabase.from('categorias').select('*').eq('origen_id', origenId),
    conUso ? supabase.rpc('categorias_con_uso', { p_origen: origenId }) : Promise.resolve(null),
  ])
  if (campos.error) {
    return { ok: false, error: errorDePostgrest(campos.error) }
  }
  if (categorias.error) {
    return { ok: false, error: errorDePostgrest(categorias.error) }
  }
  if (usos?.error) {
    return { ok: false, error: errorDePostgrest(usos.error) }
  }
  return ok({
    campos: camposDesde(campos.data),
    categorias: categoriasDesde(categorias.data, usos?.data ?? null),
  })
}
