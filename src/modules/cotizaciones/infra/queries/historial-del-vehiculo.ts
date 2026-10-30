import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { conteoAcotado, type ConteoAcotado } from '@/shared/lib/conteo'
import { POR_ALTA, TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import { createClient } from '@/shared/lib/supabase/server'

const esquemaDeVehiculo = z.guid()

// «Cotizado (n)» de un vehículo: la primera página del historial con una fila de más, nunca un `count`. Con la RLS de quien mira: cuenta las que ve.
// La sostiene `cotizaciones_vehiculo_creado_idx (vehiculo_id, creado_en desc, id desc)` (4.14-1; `supabase/tests/medir-historial-del-vehiculo.sql`).
export async function contarCotizacionesDelVehiculo(
  vehiculoId: string,
): Promise<Resultado<ConteoAcotado>> {
  const vehiculo = esquemaDeVehiculo.safeParse(vehiculoId)
  if (!vehiculo.success) {
    return fallo('validacion', 'Ese vehículo no es válido.')
  }
  const supabase = await createClient()
  const { data, error } = await ordenarPorCursor(
    supabase.from('cotizaciones').select('id').eq('vehiculo_id', vehiculo.data),
    null,
    POR_ALTA,
  ).limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(conteoAcotado(data.length, TAMANO_DE_VER_MAS))
}
