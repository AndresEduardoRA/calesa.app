import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

// Tope de una consulta de nombres: lo que cabe en una página de cualquier listado.
const MAXIMO_DE_IDS = 100

const esquemaDeIds = z.array(z.guid()).max(MAXIMO_DE_IDS)
const esquemaDeFila = z.array(z.object({ id: z.guid(), nombre: z.string() }))

// Los nombres de unos leads (los de una página de otro listado, p. ej. `/cotizaciones`) con la sesión de quien mira. `leads_vista_por_ids()` es invocadora: la RLS de `leads`
// decide, así que un lead que no se ve no llega (y no se distingue de uno que no existe). Por clave primaria, a lo sumo 100 ids, una vez por página. Sin ids no consulta.
export async function getNombresDeLeads(
  ids: readonly string[],
): Promise<Resultado<Map<string, string>>> {
  const validos = esquemaDeIds.safeParse(ids)
  if (!validos.success) {
    return fallo('validacion', 'Esos leads no son válidos.')
  }
  if (validos.data.length === 0) {
    return ok(new Map())
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('leads_vista_por_ids', { p_leads: validos.data })
    .select('id, nombre')
    .limit(validos.data.length)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDeFila.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer los nombres de los clientes.')
  }
  return ok(new Map(filas.data.map((fila) => [fila.id, fila.nombre])))
}
