import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeVisitas } from '../entities/repositorios'

// `visita_registrar` es invocadora y sólo toca la fila propia (7.12-1): upsert, con tope de 50 por persona.
export const visitasSupabase: RepositorioDeVisitas = {
  async registrar(tipo, id) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('visita_registrar', { p_tipo: tipo, p_id: id })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    return ok(null)
  },
}
