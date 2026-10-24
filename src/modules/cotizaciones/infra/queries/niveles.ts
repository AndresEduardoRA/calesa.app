import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { listaDeNivelesDesde } from '../../entities/nivel'
import type { LectorDeNiveles } from '../../entities/repositorios-de-niveles'

// Para la pantalla de configuración: los niveles con el tope (lo pone la base, un solo punto), lo que cada uno admite y por qué no se elimina si
// una versión de una fórmula lo nombra. Son a lo sumo 10 filas (`_niveles_tope()`), cada una con una sonda por `formulas_niveles_idx`: nunca un
// conteo. Los permisos de cada nivel los lee la matriz de Roles, no esta lectura.
export const getNivelesDeAcceso: LectorDeNiveles = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('niveles_con_uso')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = listaDeNivelesDesde(data)
  return lista
    ? ok(lista)
    : fallo('inesperado', 'No pudimos leer los niveles. Recarga para ver cómo quedaron.')
}
