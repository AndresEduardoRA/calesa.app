import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeOrigenesDeLead } from '../../entities/repositorios'

// Todos los orígenes de lead, también los desactivados: nombran la columna «Origen» de un lead que
// entró por uno apagado y son las opciones del filtro. Los nombres salen de la fila.
export const getOrigenesDeLead: LectorDeOrigenesDeLead = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('origenes_lead')
    .select('id, clave, nombre')
    .order('orden')
    .order('nombre')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data)
}
