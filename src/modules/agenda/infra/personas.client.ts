// Las personas que el formulario ofrece, leídas desde el navegador al tipear (7.07-2). Dos lecturas, las dos con la sesión de quien mira.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { patronContiene } from '@/shared/lib/supabase/consultas'
import {
  cortarPersonas,
  personasDeQuienesReciben,
  textoDeBusqueda,
  TOPE_DE_PERSONAS,
  type PersonasEncontradas,
} from '../entities/personas'

const SIN_PERSONAS: PersonasEncontradas = { personas: [], hayMas: false }

// A quién invitar a un evento: cualquier persona activa y sin bloqueo (`perfiles: leer` lo deja a toda persona activa; la base vuelve a exigirlo al
// guardar). Sólo `id` y `nombre`: nunca el correo. Desde 3 letras; pide una más que el tope para saber si hay otras
// (índice: `perfiles_pkey`/orden por nombre; es la tabla del equipo, decenas de filas).
export async function leerPersonasParaEvento(
  texto: string,
): Promise<Resultado<PersonasEncontradas>> {
  const buscado = textoDeBusqueda(texto)
  if (buscado === null) {
    return ok(SIN_PERSONAS)
  }
  const { data, error } = await createClient()
    .from('perfiles')
    .select('id, nombre')
    .eq('activo', true)
    .eq('bloqueado', false)
    .ilike('nombre', patronContiene(buscado))
    .order('nombre')
    .order('id')
    .limit(TOPE_DE_PERSONAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(cortarPersonas(data))
}

// A quién darle una tarea: sólo quien puede recibirla (`agenda_quienes_reciben`, que pide `agenda.tareas.asignar`; sin conversación).
export async function leerPersonasParaTarea(
  texto: string,
): Promise<Resultado<PersonasEncontradas>> {
  const buscado = textoDeBusqueda(texto)
  if (buscado === null) {
    return ok(SIN_PERSONAS)
  }
  const { data, error } = await createClient().rpc('agenda_quienes_reciben', { p_texto: buscado })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = personasDeQuienesReciben(data)
  return leidas.ok ? leidas : fallo('inesperado', leidas.error.mensaje)
}
