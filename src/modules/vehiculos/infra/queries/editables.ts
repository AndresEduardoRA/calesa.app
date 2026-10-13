import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { ConsultaDeEditables } from '../../entities/repositorios'

// De estos vehículos, cuáles puede editar quien llama. Lo responde la base con la misma regla
// que usan sus RPC (`puede_vehiculo`), acotado a los ids que se le pasan.
export const getEditables: ConsultaDeEditables = async (ids) => {
  if (ids.length === 0) {
    return ok([])
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculos_editables', { p_ids: [...ids] })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(z.array(z.guid()).parse(data))
}
