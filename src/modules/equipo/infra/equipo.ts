import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioEquipo } from '../entities/repositorios-equipo'

// Roles de una persona, bloqueo y baja: todo por RPC (`rbac_*`, `equipo_*`). El permiso, la
// dominancia sobre el rol y el guardián los aplica la base.

const asignarRol: RepositorioEquipo['asignarRol'] = async ({ personaId, rolId, principal }) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('rbac_asignar_rol', {
    p_usuario: personaId,
    p_rol: rolId,
    p_principal: principal,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

const quitarRol: RepositorioEquipo['quitarRol'] = async ({ personaId, rolId }) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('rbac_quitar_rol', { p_usuario: personaId, p_rol: rolId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

const bloquear: RepositorioEquipo['bloquear'] = async ({ personaId, bloquear: valor, motivo }) => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('equipo_bloquear', {
    p_usuario: personaId,
    p_bloquear: valor,
    ...(motivo ? { p_motivo: motivo } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

const darDeBaja: RepositorioEquipo['darDeBaja'] = async (personaId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('equipo_dar_de_baja', { p_usuario: personaId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({ leadsAlLimbo: data })
}

const aceptarInvitacion: RepositorioEquipo['aceptarInvitacion'] = async () => {
  const supabase = await createClient()
  const { error } = await supabase.rpc('equipo_aceptar_invitacion')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

export const equipoSupabase: RepositorioEquipo = {
  asignarRol,
  quitarRol,
  bloquear,
  darDeBaja,
  aceptarInvitacion,
}
