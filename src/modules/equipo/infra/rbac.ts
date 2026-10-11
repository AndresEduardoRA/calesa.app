import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioRoles } from '../entities/repositorios-equipo'

// Los roles y sus concesiones se escriben sólo por las RPC `rbac_*`: ahí viven el permiso, la
// dominancia, el control de versión (`PT409`) y el registro de actividad.

const crear: RepositorioRoles['crear'] = async ({ clave, nombre, color }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rbac_crear_rol', {
    p_clave: clave,
    p_nombre: nombre,
    p_color: color,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ id: data })
}

const eliminar: RepositorioRoles['eliminar'] = async ({ rolId, actualizadoEnEsperado }) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('rbac_eliminar_rol', {
    p_rol: rolId,
    p_actualizado_en_esperado: actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

const otorgar: RepositorioRoles['otorgar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rbac_otorgar', {
    p_rol: pedido.rolId,
    p_clave: pedido.clave,
    // Sin origen = todos los orígenes: el parámetro se omite y la RPC usa su valor por defecto.
    ...(pedido.origenId === null ? {} : { p_origen: pedido.origenId }),
    p_alcance: pedido.alcance,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const revocar: RepositorioRoles['revocar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rbac_revocar', {
    p_rol: pedido.rolId,
    p_clave: pedido.clave,
    ...(pedido.origenId === null ? {} : { p_origen: pedido.origenId }),
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ actualizadoEn: data })
}

const dominado: RepositorioRoles['dominado'] = async (rolId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rol_dominado', { p_rol: rolId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data)
}

export const rolesSupabase: RepositorioRoles = { crear, eliminar, otorgar, revocar, dominado }
