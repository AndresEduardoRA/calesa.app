import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DE_CATEGORIAS } from '../../entities/contenido/categorias'
import type { LectorDeCategorias } from '../../entities/contenido/repositorios'

// Lo que se lee de `web_guias` para saber qué categorías tienen guías: más allá de esto no se mira (decenas de guías, cientos a lo sumo).
const TOPE_DE_LECTURA_DE_USO = 1000

// Las categorías por orden y nombre, `tope + 1` filas (`web_categorias_guias` es de configuración: decenas de filas, sin índice propio), y
// en **una** consulta más cuáles tienen guías (`web_guias_categoria_id_idx`, sin consulta por fila). Si la lectura de uso llega a su tope,
// las categorías que no aparecen quedan «sin verificar» (`null`): no se sabe, y la action vuelve a revisar al eliminar.
export const getCategorias: LectorDeCategorias = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('web_categorias_guias')
    .select('id, slug, nombre, orden, activa')
    .order('orden')
    .order('nombre')
    .limit(TOPE_DE_CATEGORIAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const delTope = cortarAlTope(data, TOPE_DE_CATEGORIAS)
  const ids = delTope.filas.map((fila) => fila.id)
  const usadas = new Set<string>()
  let completa = true
  if (ids.length > 0) {
    const uso = await supabase
      .from('web_guias')
      .select('categoria_id')
      .in('categoria_id', ids)
      .limit(TOPE_DE_LECTURA_DE_USO)
    if (uso.error) {
      return { ok: false, error: errorDePostgrest(uso.error) }
    }
    completa = uso.data.length < TOPE_DE_LECTURA_DE_USO
    for (const fila of uso.data) {
      if (fila.categoria_id !== null) {
        usadas.add(fila.categoria_id)
      }
    }
  }
  return ok({
    filas: delTope.filas.map((fila) => ({
      ...fila,
      conGuias: usadas.has(fila.id) ? true : completa ? false : null,
    })),
    hayMas: delTope.hayMas,
  })
}
