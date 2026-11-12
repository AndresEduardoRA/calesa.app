import 'server-only'
import { cache } from 'react'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { bandejaDesde, type LectorDeLaBandeja } from '../../entities/alertas/bandeja'

// La bandeja de logística en Inicio (6.12-2) se lee con `logistica_bandeja()` (6.12-1) y la sesión de quien mira: la base decide el alcance por origen.
// Demoradas por `vehiculos_cadena_idx` (por cada par origen/fase), por aprobar por `documentos_por_revisar_idx`; la base acota el tope a 5…20 y pide
// uno de más para `hay_mas`. Memorizada por request: los tres bloques de Inicio hacen una sola llamada.
export const leerBandejaDeLaBase: LectorDeLaBandeja = cache(async (tope) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('logistica_bandeja', { p_tope: tope })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return bandejaDesde(data)
})
