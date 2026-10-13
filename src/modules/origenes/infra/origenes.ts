import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioOrigenes } from '../entities/repositorios'

// Los orígenes se escriben sólo por RPC: permiso, versión (`PT409`), nombre único y las reglas de
// uso. Crear es un solo INSERT: su flujo, sus reglas y sus campos nacen por trigger en la misma
// transacción, así que no queda un origen a medias.
export const respuestaDeCreacion = z.object({ id: z.guid(), actualizado_en: z.string() })

const crear: RepositorioOrigenes['crear'] = async (nuevo) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origen_crear', {
    p_clave: nuevo.clave,
    p_nombre: nuevo.nombre,
    p_sustantivo: nuevo.sustantivo,
    p_genero: nuevo.genero,
    p_tipo: nuevo.tipo,
    p_color: nuevo.color,
    p_apibara_plataformas: nuevo.apibaraPlataformas,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const creado = respuestaDeCreacion.parse(data)
  return ok({ id: creado.id, actualizadoEn: creado.actualizado_en })
}

// Un parámetro que no viaja no toca esa columna (`undefined` no se serializa).
const guardar: RepositorioOrigenes['guardar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origen_guardar', {
    p_origen: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_nombre: pedido.nombre,
    p_sustantivo: pedido.sustantivo,
    p_genero: pedido.genero,
    p_color: pedido.color,
    p_activo: pedido.activo,
    p_apibara_plataformas: pedido.apibaraPlataformas,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const eliminar: RepositorioOrigenes['eliminar'] = async ({ id, actualizadoEnEsperado }) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('origen_eliminar', {
    p_origen: id,
    p_actualizado_en_esperado: actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

export const origenesSupabase: RepositorioOrigenes = { crear, guardar, eliminar }
