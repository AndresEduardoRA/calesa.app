import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeRelaciones } from '../../entities/repositorios'
import { relacionesDesde } from '../../entities/vinculo'

// El vínculo (con su historial) y los interesados de un vehículo. Las dos funciones corren con
// la RLS de quien llama y devuelven el nombre del lead sólo si lo ve: este módulo no lee `leads`.
export const getRelaciones: LectorDeRelaciones = async (vehiculoId) => {
  const supabase = await createClient()
  const [vinculos, interesados] = await Promise.all([
    supabase.rpc('vehiculo_vinculos', { p_vehiculo: vehiculoId }),
    supabase.rpc('vehiculo_interesados', { p_vehiculo: vehiculoId }),
  ])
  const error = vinculos.error ?? interesados.error
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(relacionesDesde(vinculos.data, interesados.data))
}
