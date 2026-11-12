import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeMiFichaEnLaWeb } from '../../entities/turnos/ficha'

// Mi lugar en la cola y mi ficha (8.05-2): dos lecturas por clave primaria, de la fila propia (`cola_web_asesores.usuario_id` y `perfiles.id`, con el id verificado de
// `getClaims()`). Sin lista ni volumen. Si la persona no tiene fila en la cola (no debería pasar: la crea el alta del perfil) vale «no habilitada».
export const getMiFichaEnLaWeb: LectorDeMiFichaEnLaWeb = cache(async () => {
  const supabase = await createClient()
  const { data: sesion } = await supabase.auth.getClaims()
  const yo = sesion?.claims.sub
  if (!yo) {
    return ok(null)
  }
  const [cola, perfil] = await Promise.all([
    supabase
      .from('cola_web_asesores')
      .select('habilitado, disponible')
      .eq('usuario_id', yo)
      .maybeSingle(),
    supabase
      .from('perfiles')
      .select(
        'handle, cargo_web, whatsapp_web, bio_web, especialidades, publico_web, actualizado_en',
      )
      .eq('id', yo)
      .maybeSingle(),
  ])
  if (cola.error) {
    return { ok: false, error: errorDePostgrest(cola.error) }
  }
  if (perfil.error) {
    return { ok: false, error: errorDePostgrest(perfil.error) }
  }
  if (!perfil.data) {
    return ok(null)
  }
  return ok({
    habilitado: cola.data?.habilitado ?? false,
    disponible: cola.data?.disponible ?? false,
    handle: perfil.data.handle,
    cargo: perfil.data.cargo_web,
    whatsapp: perfil.data.whatsapp_web,
    presentacion: perfil.data.bio_web,
    especialidades: perfil.data.especialidades,
    publicoWeb: perfil.data.publico_web,
    actualizadoEn: perfil.data.actualizado_en,
  })
})
