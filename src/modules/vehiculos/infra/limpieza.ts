import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeLimpieza } from '../entities/repositorios'

const conservado = z.object({ conservado: z.boolean() })

// «Conservar» por `vehiculo_conservar`: el estado deseado, sin versión (no toca la ficha).
const conservar: RepositorioDeLimpieza['conservar'] = async ({ vehiculoId, conservar: valor }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_conservar', {
    p_vehiculo: vehiculoId,
    p_conservar: valor,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leido = conservado.safeParse(data)
  return ok({ conservado: leido.success ? leido.data.conservado : valor })
}

export const limpiezaSupabase: RepositorioDeLimpieza = { conservar }
