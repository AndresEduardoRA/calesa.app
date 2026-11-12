// Las personas que se pueden buscar para escribirles, leídas desde el navegador al tipear (7.09-2), con la sesión de quien mira.
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { patronContiene } from '@/shared/lib/supabase/consultas'
import {
  cortarPersonas,
  textoDeBusqueda,
  TOPE_DE_PERSONAS,
  type PersonasEncontradas,
} from '../entities/personas'
import type { LectorDePersonas } from '../entities/repositorios'

const SIN_PERSONAS: PersonasEncontradas = { personas: [], hayMas: false }

// Cualquier persona activa y sin bloqueo menos yo (`perfiles: leer` la deja ver a toda persona activa; la base vuelve a exigir quién puede
// conversar al abrir). Sólo `id` y `nombre`: nunca el correo. Desde 3 letras; pide una más que el tope para saber si hay otras
// (índice: `perfiles_pkey`/orden por nombre; es la tabla del equipo, decenas de filas).
export const leerPersonas: LectorDePersonas = async (texto, yo) => {
  const buscado = textoDeBusqueda(texto)
  if (buscado === null) {
    return ok(SIN_PERSONAS)
  }
  const { data, error } = await createClient()
    .from('perfiles')
    .select('id, nombre')
    .eq('activo', true)
    .eq('bloqueado', false)
    .neq('id', yo)
    .ilike('nombre', patronContiene(buscado))
    .order('nombre')
    .order('id')
    .limit(TOPE_DE_PERSONAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(cortarPersonas(data))
}
