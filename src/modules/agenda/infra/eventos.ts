import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  leerResultadoDeEscritura,
  type FalloDeEscritura,
  type RepositorioDeEventos,
} from '../entities/escritura'

// El `hint` de la base es la clave del campo del formulario (`titulo`, `inicia_en`, `destinatarios`…).
export function falloDeRpc(error: {
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

// Escribe por RPC con la sesión de quien actúa: la base decide quién puede (42501) y la versión (PT409).
export const repositorioDeEventos: RepositorioDeEventos = {
  async crear({ id, datos, destinatarios }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('evento_crear', {
      p_id: id,
      p_datos: datos,
      p_destinatarios: [...destinatarios],
    })
    return error ? falloDeRpc(error) : leerResultadoDeEscritura(data)
  },
  async guardar({ id, actualizadoEnEsperado, datos, destinatarios }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('evento_guardar', {
      p_evento: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_datos: datos,
      p_destinatarios: [...destinatarios],
    })
    return error ? falloDeRpc(error) : leerResultadoDeEscritura(data)
  },
  async eliminar({ id, actualizadoEnEsperado }) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('evento_eliminar', {
      p_evento: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? falloDeRpc(error) : leerResultadoDeEscritura(data)
  },
}
