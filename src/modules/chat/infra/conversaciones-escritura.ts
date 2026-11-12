import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerResultadoDeConversacion, type FalloDeEscritura } from '../entities/escritura'
import type { RepositorioDeConversaciones } from '../entities/repositorios'

// El `hint` de la base es la clave del campo del formulario (`nombre`, `miembros`, `usuario`).
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

// Escribe por RPC con la sesión de quien actúa: la base decide quién puede (42501), quién puede conversar (23514) y los límites (22023).
export const repositorioDeConversaciones: RepositorioDeConversaciones = {
  async abrirDirecta(usuario) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('chat_directa', { p_usuario: usuario })
    return error ? falloDeRpc(error) : leerResultadoDeConversacion(data)
  },
  async crearGrupo({ id, nombre, miembros }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('chat_grupo_crear', {
      p_id: id,
      p_nombre: nombre,
      p_miembros: [...miembros],
    })
    return error ? falloDeRpc(error) : leerResultadoDeConversacion(data)
  },
  async entrarAlGlobal() {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('chat_global_entrar')
    return error ? falloDeRpc(error) : leerResultadoDeConversacion(data)
  },
  async silenciar({ conversacion, silenciada }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('chat_silenciar', {
      p_conversacion: conversacion,
      p_silenciada: silenciada,
    })
    return error ? falloDeRpc(error) : leerResultadoDeConversacion(data)
  },
  async salir(conversacion) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('chat_salir', { p_conversacion: conversacion })
    return error ? falloDeRpc(error) : leerResultadoDeConversacion(data)
  },
}
