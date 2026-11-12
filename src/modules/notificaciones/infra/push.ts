import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDePush } from '../entities/repositorios'
import { CLAVE_DE_PREFERENCIA_DE_PUSH } from '../entities/preferencia-de-push'

const MENSAJE_ENDPOINT = 'Este navegador no admite avisos push de este servicio.'
const MENSAJE_CLAVES = 'Las claves del navegador no son válidas.'

// `suscripciones_push` se escribe sólo por RPC (`push_suscribir` exige `notificaciones.push`; `push_desuscribir`, no).
const suscribir: RepositorioDePush['suscribir'] = async ({ endpoint, claves, userAgent }) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('push_suscribir', {
    p_endpoint: endpoint,
    p_claves: claves,
    ...(userAgent === null ? {} : { p_user_agent: userAgent }),
  })
  if (!error) {
    return ok(null)
  }
  // El 22023 lleva en `hint` qué falló: el texto de la base es técnico para quien tiene un navegador raro.
  if (error.code === '22023') {
    return fallo('regla', error.hint === 'claves' ? MENSAJE_CLAVES : MENSAJE_ENDPOINT)
  }
  return { ok: false, error: errorDePostgrest(error) }
}

const desuscribir: RepositorioDePush['desuscribir'] = async (endpoint) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('push_desuscribir', { p_endpoint: endpoint })
  return error ? { ok: false, error: errorDePostgrest(error) } : ok(null)
}

// La preferencia es una fila propia bajo RLS (`usuario_id = auth.uid()`); no otorga permisos, así que se escribe directo.
const leerPreferencia: RepositorioDePush['leerPreferencia'] = async (usuarioId) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('preferencias_usuario')
    .select('valor')
    .eq('usuario_id', usuarioId)
    .eq('clave', CLAVE_DE_PREFERENCIA_DE_PUSH)
    .maybeSingle()
  return error ? { ok: false, error: errorDePostgrest(error) } : ok(data?.valor ?? null)
}

const guardarPreferencia: RepositorioDePush['guardarPreferencia'] = async (usuarioId, apagados) => {
  const supabase = await createClient()
  const { error } =
    apagados === null
      ? await supabase
          .from('preferencias_usuario')
          .delete()
          .eq('usuario_id', usuarioId)
          .eq('clave', CLAVE_DE_PREFERENCIA_DE_PUSH)
      : await supabase
          .from('preferencias_usuario')
          .upsert({ usuario_id: usuarioId, clave: CLAVE_DE_PREFERENCIA_DE_PUSH, valor: apagados })
  return error ? { ok: false, error: errorDePostgrest(error) } : ok(null)
}

export const pushSupabase: RepositorioDePush = {
  suscribir,
  desuscribir,
  leerPreferencia,
  guardarPreferencia,
}
