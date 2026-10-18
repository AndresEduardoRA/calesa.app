import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { catalogosDeLeadDesde } from '../../entities/catalogos'
import type { LectorDeCatalogosDeLead } from '../../entities/repositorios'

// Los orígenes y los tipos de lead, también los desactivados: nombran la columna «Origen» y «Tipo» de un lead que conserva uno
// apagado, y son las opciones de los filtros y de la ficha. Un solo pedido (`leads_catalogos()`, invoker: la RLS de las dos tablas
// la lee toda sesión) en vez de uno por catálogo: el listado, la ficha y la exportación no suman pedidos por traer los nombres.
// Son a lo sumo 100 filas de cada uno. Los nombres salen de la fila: ningún texto de `src/` los nombra.
export const getCatalogosDeLead: LectorDeCatalogosDeLead = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('leads_catalogos')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const catalogos = catalogosDeLeadDesde(data)
  return catalogos
    ? ok(catalogos)
    : fallo(
        'inesperado',
        'No pudimos leer los orígenes y los tipos de lead. Recarga e intenta de nuevo.',
      )
}
