// Las etiquetas de quien mira con a cuántos de los leads que ve están puestas, desde el navegador:
// las lee «Gestionar etiquetas» al abrirse, así el número que se confirma al eliminar es el de ese
// momento (otra pestaña pudo cambiarlo). `etiquetas_vista` es de invocador: la RLS decide.
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { etiquetasConUsoDesde, ordenarEtiquetas } from '../entities/etiqueta'
import type { LectorDeEtiquetasConUso } from '../entities/repositorios'

export const leerEtiquetasConUso: LectorDeEtiquetasConUso = async () => {
  const { data, error } = await createClient()
    .from('etiquetas_vista')
    .select('id,nombre,color,actualizado_en,leads')
    .limit(100)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(ordenarEtiquetas(etiquetasConUsoDesde(data)))
}
