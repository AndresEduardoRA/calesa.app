import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerResultadoDeConversacion, type FalloDeEscritura } from '../entities/escritura'
import { leerResultadoDeEnvio } from '../entities/mensajes'
import { mencionesDelCuerpo } from '../entities/menciones'
import type { RepositorioDeMensajes } from '../entities/repositorios'
import { leerResultadoDeEdicion } from '../entities/reglas-del-mensaje'

// El `hint` de la base es la clave del campo (`id`, `cuerpo`, `responde_a`).
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

// Escribe por RPC con la sesión de quien actúa: la base exige `chat.participar`, ser miembro y el cuerpo válido (42501, 23514, 22023).
export const repositorioDeMensajes: RepositorioDeMensajes = {
  async enviar({ id, conversacion, cuerpo, respondeA, menciones }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('mensaje_enviar', {
      p_id: id,
      p_conversacion: conversacion,
      p_cuerpo: cuerpo,
      ...(respondeA ? { p_responde_a: respondeA } : {}),
      ...(menciones && menciones.length > 0
        ? { p_menciones: menciones.map(({ tipo, id }) => ({ tipo, id })) }
        : {}),
    })
    return error ? falloDeRpc(error) : leerResultadoDeEnvio(data)
  },
  async leer({ conversacion, hasta }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('chat_leer', {
      p_conversacion: conversacion,
      p_hasta: hasta,
    })
    return error ? falloDeRpc(error) : leerResultadoDeConversacion(data)
  },
  // La base exige autor, 15 minutos y la versión leída (42501, 23514, PT409). `p_menciones` son los tokens que quedan en el cuerpo: sin ellas la base
  // rechazaría editar un mensaje con menciones (el conjunto debe ser igual), y quien borra un token a mano la quita (7.10-2).
  async editar({ mensaje, esperado, cuerpo }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('mensaje_editar', {
      p_mensaje: mensaje,
      p_actualizado_en_esperado: esperado,
      p_cuerpo: cuerpo,
      p_menciones: mencionesDelCuerpo(cuerpo).map(({ clase, id }) => ({ tipo: clase, id })),
    })
    return error ? falloDeRpc(error) : leerResultadoDeEdicion(data)
  },
  // El autor o `chat.moderar`, siempre siendo miembro; repetir es `sin_cambios`.
  async eliminar(mensaje) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('mensaje_eliminar', { p_mensaje: mensaje })
    return error ? falloDeRpc(error) : leerResultadoDeConversacion(data)
  },
}
