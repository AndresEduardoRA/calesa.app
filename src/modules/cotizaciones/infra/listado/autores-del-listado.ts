import 'server-only'
import { z } from 'zod'
import { autorVisible } from '../../entities/historial-del-vehiculo'
import { MAXIMO_DE_PAGINA_DE_COTIZACIONES } from '../../entities/listado/listado'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

const esquemaDeIds = z.array(z.guid()).max(MAXIMO_DE_PAGINA_DE_COTIZACIONES)
const esquemaDeFila = z.array(z.object({ id: z.guid(), nombre: z.string(), email: z.string() }))

// Quién hizo cada cotización de una página del listado: sus nombres, por la clave primaria de `perfiles` (`perfiles_pkey`; la lee todo usuario activo) y sólo los de la página
// (a lo sumo 100 ids, una vez por página, nunca por fila). Sin ids no consulta.
export async function getAutoresDeCotizaciones(
  ids: readonly string[],
): Promise<Resultado<Map<string, string>>> {
  const validos = esquemaDeIds.safeParse(ids)
  if (!validos.success) {
    return fallo('validacion', 'Esos autores no son válidos.')
  }
  if (validos.data.length === 0) {
    return ok(new Map())
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, email')
    .in('id', validos.data)
    .limit(validos.data.length)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquemaDeFila.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer quién hizo las cotizaciones.')
  }
  return ok(new Map(filas.data.map((fila) => [fila.id, autorVisible(fila)])))
}
