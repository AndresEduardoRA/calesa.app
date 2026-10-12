import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { RepositorioIntegraciones } from '../entities/repositorios'

const guardar: RepositorioIntegraciones['guardar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('integracion_guardar', {
    p_clave: pedido.clave,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_activa: pedido.activa,
    p_config: pedido.config as Json | undefined,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

// El secreto viaja una sola vez, hacia Vault, con la sesión de quien lo carga. La RPC devuelve
// la versión nueva de la integración, nunca el secreto; acá no se guarda ni se registra.
const guardarSecreto: RepositorioIntegraciones['guardarSecreto'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('integracion_guardar_secreto', {
    p_clave: pedido.clave,
    p_secreto: pedido.secreto,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

export const integracionesSupabase: RepositorioIntegraciones = { guardar, guardarSecreto }
