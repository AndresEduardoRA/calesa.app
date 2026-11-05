import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

// Tope de una consulta de títulos: lo que cabe en una página de cualquier listado.
const MAXIMO_DE_IDS = 100

const esquemaDeIds = z.array(z.guid()).max(MAXIMO_DE_IDS)
const esquemaDeFila = z.array(z.object({ id: z.guid(), titulo: z.string() }))

// Los títulos de unos vehículos (los de una página de otro listado, p. ej. `/cotizaciones`) con la sesión de quien mira: la RLS de `vehiculos` decide qué llega, y uno en la
// papelera no se nombra (como `leerVehiculo`). Por clave primaria (`vehiculos_pkey`), a lo sumo 100 ids, una vez por página. Sin ids no consulta.
export async function getTitulosDeVehiculos(
  ids: readonly string[],
): Promise<Resultado<Map<string, string>>> {
  const validos = esquemaDeIds.safeParse(ids)
  if (!validos.success) {
    return fallo('validacion', 'Esos vehículos no son válidos.')
  }
  if (validos.data.length === 0) {
    return ok(new Map())
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehiculos')
    .select('id, titulo')
    .in('id', validos.data)
    .is('eliminado_en', null)
    .limit(validos.data.length)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDeFila.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer los títulos de los vehículos.')
  }
  return ok(new Map(filas.data.map((fila) => [fila.id, fila.titulo])))
}
