// Los miembros de una conversación que se pueden invitar a un evento (7.10-3), buscados por nombre desde el navegador con la sesión de quien mira
// (`conversaciones_miembros: leer` sólo deja ver las filas de sus miembros). Menos yo, activos y sin bloqueo. Sólo `id` y `nombre`: nunca el correo.
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { patronContiene } from '@/shared/lib/supabase/consultas'
import {
  cortarPersonas,
  textoDeBusqueda,
  TOPE_DE_PERSONAS,
  type PersonasEncontradas,
} from '../entities/personas'

const SIN_PERSONAS: PersonasEncontradas = { personas: [], hayMas: false }

// Índice: la clave primaria `(conversacion_id, usuario_id)`; el nombre se filtra sobre las filas de esa conversación (en el canal global son las de todo
// el equipo, decenas) y se pide una de más que el tope para saber si hay otras.
export async function leerMiembrosParaInvitar(
  texto: string,
  conversacion: string,
  yo: string,
): Promise<Resultado<PersonasEncontradas>> {
  const buscado = textoDeBusqueda(texto)
  if (buscado === null) {
    return ok(SIN_PERSONAS)
  }
  const { data, error } = await createClient()
    .from('conversaciones_miembros')
    .select('perfiles!inner(id, nombre)')
    .eq('conversacion_id', conversacion)
    .neq('usuario_id', yo)
    .eq('perfiles.activo', true)
    .eq('perfiles.bloqueado', false)
    .ilike('perfiles.nombre', patronContiene(buscado))
    .order('nombre', { referencedTable: 'perfiles' })
    .limit(TOPE_DE_PERSONAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(
    cortarPersonas(data.map(({ perfiles }) => ({ id: perfiles.id, nombre: perfiles.nombre }))),
  )
}
