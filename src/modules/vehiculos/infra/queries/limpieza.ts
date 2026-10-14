import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { limpiezaDesdeRespuesta, ultimaLimpiezaDesde } from '../../entities/limpieza'
import type {
  LectorDeLimpiezaAutomatica,
  LectorDeUltimaLimpieza,
} from '../../entities/repositorios'

// Qué dice la base de la limpieza de un vehículo (`vehiculo_limpieza`): si le toca, cuándo se va y
// si está conservado. La regla es de la base: acá sólo se lee.
export const getLimpiezaAutomatica: LectorDeLimpiezaAutomatica = async (vehiculoId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_limpieza', { p_vehiculo: vehiculoId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data === null ? null : limpiezaDesdeRespuesta(data))
}

// La última noche de la limpieza. Nula si todavía no corrió o si quien pregunta no puede vaciar
// la papelera.
export const getUltimaLimpieza: LectorDeUltimaLimpieza = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('limpieza_ultima')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data === null ? null : ultimaLimpiezaDesde(data))
}
