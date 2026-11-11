import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import { leerResultadoDeEscritura, type RepositorioDeTareas } from '../entities/escritura'
import { falloDeRpc } from './eventos'

// Escribe por RPC con la sesión de quien actúa. `p_conversacion` no se manda: lo hará el chat. `responsable_id` sólo viaja al crear.
export const repositorioDeTareas: RepositorioDeTareas = {
  async crear({ id, datos }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tarea_crear', { p_id: id, p_datos: datos })
    return error ? falloDeRpc(error) : leerResultadoDeEscritura(data)
  },
  async guardar({ id, actualizadoEnEsperado, datos }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tarea_guardar', {
      p_tarea: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_datos: datos,
    })
    return error ? falloDeRpc(error) : leerResultadoDeEscritura(data)
  },
  async eliminar({ id, actualizadoEnEsperado }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tarea_eliminar', {
      p_tarea: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? falloDeRpc(error) : leerResultadoDeEscritura(data)
  },
}
