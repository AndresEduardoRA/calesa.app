import 'server-only'
import { connection } from 'next/server'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { apagadosDesde, CLAVE_DE_PREFERENCIA_DE_PUSH } from '../../entities/preferencia-de-push'
import type { LectorDeApagadosDePush, LectorDeSuscripciones } from '../../entities/repositorios'
import { TOPE_DE_SUSCRIPCIONES } from '../../entities/suscripcion'

// Las suscripciones de la persona, las más recientes primero. `suscripciones_push_usuario_id_idx`; la base impone el tope
// de 10 por persona (`push_suscribir`), así que el límite sólo es una guarda. Nunca se lee `claves`.
export const getMisSuscripciones: LectorDeSuscripciones = async (usuarioId) => {
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('suscripciones_push')
    .select('endpoint, user_agent, creado_en')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false })
    .limit(TOPE_DE_SUSCRIPCIONES)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(
    data.map((fila) => ({
      endpoint: fila.endpoint,
      userAgent: fila.user_agent,
      creadoEn: fila.creado_en,
    })),
  )
}

// Una sola fila: `preferencias_usuario` por (usuario_id, clave).
export const getApagadosDePush: LectorDeApagadosDePush = async (usuarioId) => {
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('preferencias_usuario')
    .select('valor')
    .eq('usuario_id', usuarioId)
    .eq('clave', CLAVE_DE_PREFERENCIA_DE_PUSH)
    .limit(1)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(apagadosDesde(data?.valor))
}
