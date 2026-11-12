import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_NOTIFICACION,
  LOTE_DE_MARCADO,
  notificacionDesde,
} from '../entities/notificacion'
import type { RepositorioDeNotificaciones } from '../entities/repositorios'

// La RLS `notificaciones: editar` y los grants de columna (`leida_en`, `accionada_en`) acotan lo que se puede
// escribir; el `usuario_id` se pone igual en cada consulta para que el índice conduzca.
const leer: RepositorioDeNotificaciones['leer'] = async (usuarioId, id) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notificaciones')
    .select(COLUMNAS_DE_NOTIFICACION)
    .eq('usuario_id', usuarioId)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data ? notificacionDesde(data) : null)
}

// Idempotente: sólo escribe lo que todavía es nulo, así abrir dos veces no pisa las fechas.
const abrir: RepositorioDeNotificaciones['abrir'] = async (usuarioId, id, accionar) => {
  const supabase = await createClient()
  const ahora = new Date().toISOString()
  const leida = await supabase
    .from('notificaciones')
    .update({ leida_en: ahora })
    .eq('usuario_id', usuarioId)
    .eq('id', id)
    .is('leida_en', null)
  if (leida.error) {
    return { ok: false, error: errorDePostgrest(leida.error) }
  }
  if (accionar) {
    const accionada = await supabase
      .from('notificaciones')
      .update({ accionada_en: ahora })
      .eq('usuario_id', usuarioId)
      .eq('id', id)
      .is('accionada_en', null)
    if (accionada.error) {
      return { ok: false, error: errorDePostgrest(accionada.error) }
    }
  }
  return leer(usuarioId, id)
}

// Por lotes de `LOTE_DE_MARCADO`: primero se leen los ids de un lote (`notificaciones_usuario_abiertas_idx`) y
// luego se marcan por id; así ninguna sentencia toca más de un lote.
const marcarTodasLeidas: RepositorioDeNotificaciones['marcarTodasLeidas'] = async (
  usuarioId,
  lotes,
) => {
  const supabase = await createClient()
  let marcadas = 0
  for (let lote = 0; lote < lotes; lote += 1) {
    const { data: ids, error } = await supabase
      .from('notificaciones')
      .select('id')
      .eq('usuario_id', usuarioId)
      .is('leida_en', null)
      .order('creado_en', { ascending: false })
      .limit(LOTE_DE_MARCADO)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    if (ids.length === 0) {
      return ok({ marcadas, quedanMas: false })
    }
    const { data: hechas, error: errorAlMarcar } = await supabase
      .from('notificaciones')
      .update({ leida_en: new Date().toISOString() })
      .in(
        'id',
        ids.map((fila) => fila.id),
      )
      .is('leida_en', null)
      .select('id')
    if (errorAlMarcar) {
      return { ok: false, error: errorDePostgrest(errorAlMarcar) }
    }
    marcadas += hechas.length
    // El lote no vino lleno: no queda nada más.
    if (ids.length < LOTE_DE_MARCADO) {
      return ok({ marcadas, quedanMas: false })
    }
  }
  return ok({ marcadas, quedanMas: true })
}

export const notificacionesSupabase: RepositorioDeNotificaciones = {
  abrir,
  leer,
  marcarTodasLeidas,
}
