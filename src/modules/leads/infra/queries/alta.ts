import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { contextoDeAltaDesde } from '../../entities/alta'
import type { LectorDeContextoDeAlta } from '../../entities/repositorios'

// Lo que el drawer «Nuevo lead» necesita, en un viaje: los orígenes y los tipos de seguimiento
// activos, el último origen de esta persona, el código de país y la ciudad y el país de la empresa.
export const getContextoDeAlta: LectorDeContextoDeAlta = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_alta_contexto')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(contextoDeAltaDesde(data))
}
