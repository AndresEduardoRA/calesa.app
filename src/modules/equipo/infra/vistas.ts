import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioVistas } from '../entities/repositorios-vistas'
import { vistasDesde } from '../entities/vista'

// Las vistas son de quien las guarda y no otorgan nada: se escriben directo bajo la RLS de fila
// propia (como las preferencias), sin RPC ni versión. Guardar con el mismo nombre es reemplazar.

const guardar: RepositorioVistas['guardar'] = async ({ usuarioId, pantalla, nombre, params }) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vistas_guardadas')
    .upsert(
      { usuario_id: usuarioId, pantalla, nombre, params },
      { onConflict: 'usuario_id,pantalla,nombre' },
    )
    .select('id, nombre, params, orden')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const [vista] = vistasDesde(data)
  return vista ? ok(vista) : fallo('inesperado', 'No se pudo guardar la vista.')
}

const eliminar: RepositorioVistas['eliminar'] = async ({ usuarioId, id }) => {
  const supabase = await createClient()
  const { error } = await supabase
    .from('vistas_guardadas')
    .delete()
    .eq('id', id)
    .eq('usuario_id', usuarioId)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

export const vistasSupabase: RepositorioVistas = { guardar, eliminar }
