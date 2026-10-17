import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { personasDesde, vistaPreviaDesde } from '../../entities/persona'
import type { LectorDeEquipo, LectorDeVistaPreviaDeBaja } from '../../entities/repositorios-equipo'

// Todas las personas con sus roles, en una ida. `perfiles` la lee cualquier cuenta activa; quién
// ve la pantalla lo decide `equipo.usuarios.ver` en la página (hoy sin enforcement en la base).
export const getEquipo: LectorDeEquipo = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select(
      // `usuarios_roles` apunta dos veces a `perfiles` (la persona y quien le asignó el rol).
      'id, nombre, email, avatar_ruta, avatar_miniatura_ruta, activo, bloqueado, bloqueo_motivo, invitado_en, invitacion_aceptada_en, equipo_bajas!equipo_bajas_usuario_id_fkey(terminada_en), usuarios_roles!usuarios_roles_usuario_id_fkey(es_principal, roles(id, clave, nombre, color, orden))',
    )
    .order('nombre')
    .order('email')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(personasDesde(data))
})

// Cuántos leads irían al limbo si esa persona saliera ahora. Sólo conteos: la RPC comprueba
// `equipo.usuarios.gestionar` y no devuelve ningún lead.
export const getVistaPreviaDeBaja: LectorDeVistaPreviaDeBaja = async (personaId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('equipo_vista_previa_baja', { p_usuario: personaId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(vistaPreviaDesde(data))
}
