import 'server-only'
import { cache } from 'react'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DE_FASES, TOPE_DE_REGLAS } from '../../entities/flujo'
import {
  COLUMNAS_DE_FLUJO_DE_ORIGEN,
  flujoDeOrigenDesde,
} from '../../entities/mover/flujo-de-origen'
import type { LectorDeFlujoDeOrigen } from '../../entities/mover/repositorios'

// Una sola lectura por origen y por request. Cada origen tiene un solo flujo de vehículos (`flujos_origen_unico`), así que `.limit(1)` no corta nada;
// las reglas y las fases son configuración (decenas de filas: `flujos_reglas_pkey` y `fases_flujo_id_nombre_key`) y piden `tope + 1`: si llega, el
// resultado es un error visible. Cualquier cuenta con sesión lee estas tablas (policies `using (true)`).
export const getFlujoDeOrigen: LectorDeFlujoDeOrigen = cache(async (origenId) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flujos')
    .select(COLUMNAS_DE_FLUJO_DE_ORIGEN)
    .eq('origen_id', origenId)
    .eq('ambito', 'vehiculos')
    .limit(1)
    .limit(TOPE_DE_REGLAS + 1, { referencedTable: 'flujos_reglas' })
    .limit(TOPE_DE_FASES + 1, { referencedTable: 'fases' })
    .order('orden', { referencedTable: 'fases' })
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return flujoDeOrigenDesde(data)
})
