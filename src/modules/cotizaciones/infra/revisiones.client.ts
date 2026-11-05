// Las revisiones de una cotización desde el navegador, con la sesión de quien mira: `cotizacion_revisiones` pide ver la cotización y recorta cada diff a lo que su nivel ve.
// Una página de `TAMANO_DE_VER_MAS` por cursor (el id de la última de la anterior), sostenida por `cotizaciones_revisiones_cotizacion_idx (cotizacion_id, id desc)`.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { revisionesDesde, type PaginaDeRevisiones } from '../entities/revisiones'

export type PedidoDeRevisiones = { cotizacionId: string; antes: number | null }

export async function leerRevisiones({
  cotizacionId,
  antes,
}: PedidoDeRevisiones): Promise<Resultado<PaginaDeRevisiones>> {
  const { data, error } = await createClient().rpc('cotizacion_revisiones', {
    p_cotizacion: cotizacionId,
    p_tamano: TAMANO_DE_VER_MAS,
    ...(antes === null ? {} : { p_antes: antes }),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = revisionesDesde(data)
  return pagina === null ? fallo('inesperado', 'No se pudieron cargar las revisiones.') : ok(pagina)
}
