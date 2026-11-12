import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerResultadoDeConversacion, type FalloDeEscritura } from '../entities/escritura'
import type { RepositorioDeFichas } from '../entities/repositorios'

// El `hint` de la base es la clave del campo (`responsable_id`, `destinatarios`, `inicia_en`…).
function falloDeRpc(error: {
  code?: string | null
  message: string
  hint?: string | null
}): FalloDeEscritura {
  return {
    ok: false,
    error: errorDePostgrest(error),
    ...(error.hint ? { campo: error.hint } : {}),
  }
}

// Escribe por RPC con la sesión de quien actúa: la base exige `chat.participar`, ser miembro, que el responsable lo sea y los permisos de agenda
// (`agenda.tareas.asignar`, `agenda.eventos.publicar`). Repetir el mismo `id` responde `repetido`.
export const repositorioDeFichas: RepositorioDeFichas = {
  async crearTarea({ id, conversacion, datos }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('mensaje_tarea_crear', {
      p_id: id,
      p_conversacion: conversacion,
      p_datos: datos,
    })
    return error ? falloDeRpc(error) : leerResultadoDeConversacion(data)
  },
  async crearEvento({ id, conversacion, datos, destinatarios }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('mensaje_evento_crear', {
      p_id: id,
      p_conversacion: conversacion,
      p_datos: datos,
      p_destinatarios: [...destinatarios],
    })
    return error ? falloDeRpc(error) : leerResultadoDeConversacion(data)
  },
}
