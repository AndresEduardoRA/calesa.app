import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DE_DESTINOS } from '../entities/opciones-de-importar'

export type PersonaDestino = { id: string; nombre: string }

// A quién se le pueden dar los leads de una importación total (9.06-4b, D44): las personas activas y sin bloqueo, por nombre, menos quien
// importa («Yo» va aparte). «perfiles: leer» deja leerlas a toda persona activa; sólo `id` y `nombre`, nunca el correo. No filtra por
// `leads.crear` (no hay lector sin migración): un destino que no puede recibir leads lo rechaza `importacion_crear`. Índice: `perfiles_pkey` y
// orden por nombre; es la tabla del equipo, de decenas de filas, y pide una más que el tope para saber si hay otras.
export async function leerPersonasParaDestino(
  yo: string,
): Promise<Resultado<{ personas: PersonaDestino[]; hayMas: boolean }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .eq('activo', true)
    .eq('bloqueado', false)
    .neq('id', yo)
    .order('nombre')
    .order('id')
    .limit(TOPE_DE_DESTINOS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const { filas, hayMas } = cortarAlTope(data, TOPE_DE_DESTINOS)
  return ok({ personas: filas, hayMas })
}
