import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioTiposCambio } from '../entities/repositorios'

// Monedas y tipos de cambio se escriben sólo por RPC: permiso, versión (`PT409`), un solo tipo
// por defecto entre dos monedas. El historial de valores lo escribe un trigger.

const crear: RepositorioTiposCambio['crear'] = async (nuevo) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('tipo_cambio_crear', {
    p_clave: nuevo.clave,
    p_nombre: nuevo.nombre,
    p_moneda_de: nuevo.monedaDe,
    p_moneda_a: nuevo.monedaA,
    p_valor: nuevo.valor,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ id: data })
}

// Un parámetro que no viaja no toca esa columna (`undefined` no se serializa).
const guardar: RepositorioTiposCambio['guardar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('tipo_cambio_guardar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_nombre: pedido.nombre,
    p_valor: pedido.valor,
    p_activo: pedido.activo,
    p_es_default: pedido.esDefault,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const crearMoneda: RepositorioTiposCambio['crearMoneda'] = async (nueva) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('moneda_crear', {
    p_codigo: nueva.codigo,
    p_nombre: nueva.nombre,
    p_simbolo: nueva.simbolo,
    p_decimales: nueva.decimales,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const guardarMoneda: RepositorioTiposCambio['guardarMoneda'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('moneda_guardar', {
    p_codigo: pedido.codigo,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_nombre: pedido.nombre,
    p_simbolo: pedido.simbolo,
    p_decimales: pedido.decimales,
    p_activa: pedido.activa,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

export const tiposCambioSupabase: RepositorioTiposCambio = {
  crear,
  guardar,
  crearMoneda,
  guardarMoneda,
}
