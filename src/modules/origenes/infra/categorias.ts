import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioCategorias } from '../entities/repositorios'
import { respuestaDeCreacion } from './origenes'

// Las categorías se escriben sólo por RPC: un solo nivel de anidado, un nombre por lugar, y las
// que tienen vehículos o subcategorías no se eliminan (se desactivan).

const crear: RepositorioCategorias['crear'] = async ({ origenId, nombre, padreId }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('categoria_crear', {
    p_origen: origenId,
    p_nombre: nombre,
    p_padre: padreId ?? undefined,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const creada = respuestaDeCreacion.parse(data)
  return ok({ id: creada.id, actualizadoEn: creada.actualizado_en })
}

const guardar: RepositorioCategorias['guardar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('categoria_guardar', {
    p_categoria: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_nombre: pedido.nombre,
    p_activa: pedido.activa,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const mover: RepositorioCategorias['mover'] = async ({ id, despuesDe, actualizadoEnEsperado }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('categoria_mover', {
    p_categoria: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
    // Sin parámetro = primera.
    ...(despuesDe === null ? {} : { p_despues_de: despuesDe }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const eliminar: RepositorioCategorias['eliminar'] = async ({ id, actualizadoEnEsperado }) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('categoria_eliminar', {
    p_categoria: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

export const categoriasSupabase: RepositorioCategorias = { crear, guardar, mover, eliminar }
