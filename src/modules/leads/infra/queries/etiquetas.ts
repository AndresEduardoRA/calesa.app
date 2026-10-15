import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { etiquetasDesde, ordenarEtiquetas } from '../../entities/etiqueta'
import type { LectorDeEtiquetas } from '../../entities/repositorios'

// Las etiquetas de quien mira: la RLS de `etiquetas` da sólo las propias. Son a lo sumo 50.
export const getEtiquetas: LectorDeEtiquetas = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('etiquetas')
    .select('id,nombre,color,actualizado_en')
    .limit(100)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(ordenarEtiquetas(etiquetasDesde(data)))
}
