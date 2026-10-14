import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { datosNuevosDesde } from '../../entities/datos-nuevos-de-apibara'
import type { LectorDeDatosNuevos } from '../../entities/repositorios'

// Lo que la API trajo a los vehículos del origen (los últimos 200) y el origen no tiene como
// campo. Sólo quien gestiona orígenes lo puede pedir: la RPC lo exige.
export const getDatosNuevos: LectorDeDatosNuevos = async (origenId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origen_apibara_rutas_sin_campo', {
    p_origen: origenId,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(datosNuevosDesde(data))
}
