import 'server-only'
import { z } from 'zod'
import type { FilaDelListado } from '../../entities/listado'
import { idDelResumen, idSiguiente, UNA } from '../../entities/resumen-del-listado'
import { getListadoDeCotizaciones } from './listado'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

const esquemaDeLaClave = z.array(
  z.object({ id: z.guid(), origen_id: z.guid(), creado_en: z.string() }),
)

// Una cotización del listado por su id, para el resumen `?cotizacion=` cuando no está en la página (recargar, un enlace compartido, «Siguiente» con el resumen abierto). Dos pasos, los dos
// como quien mira (la RLS decide):
//  1. su fila por la clave primaria (`cotizaciones_pkey`): sin fila (no existe, está en la papelera o no se ve: lo mismo) es `null` y no se pide nada más;
//  2. `cotizaciones_listado()` de tamaño `UNA` con el cursor `(creado_en, id + 1)`: en el orden del listado la primera fila estrictamente anterior es ella misma (entre `id` e `id + 1`
//     no cabe ningún uuid), con su «Vencida» y su visibilidad calculadas por la misma función que arma la página. Si la primera es otra, es `null`.
// Sólo manda el origen de la fila, no los filtros de la URL: la cotización del enlace se abre aunque el filtro la deje fuera de la lista.
export async function getUnaDelListado(id: string): Promise<Resultado<FilaDelListado | null>> {
  const guid = idDelResumen(id)
  const siguiente = guid === null ? null : idSiguiente(guid)
  if (guid === null || siguiente === null) {
    return ok(null)
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id, origen_id, creado_en')
    .eq('id', guid)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const claves = esquemaDeLaClave.safeParse(data)
  if (!claves.success) {
    return fallo('inesperado', 'No pudimos leer la cotización.')
  }
  const clave = claves.data[0]
  if (clave === undefined) {
    return ok(null)
  }
  const pagina = await getListadoDeCotizaciones({
    origenId: clave.origen_id,
    cursor: { instante: clave.creado_en, id: siguiente, sentido: 'siguiente' },
    tamano: UNA,
  })
  if (!pagina.ok) {
    return pagina
  }
  const primera = pagina.data.filas[0]
  return ok(primera !== undefined && primera.id === guid ? primera : null)
}
