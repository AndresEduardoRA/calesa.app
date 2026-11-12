import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { leerMargen, type MargenDelProyecto } from '../../entities/compras/margen'

// El margen de un proyecto (8.11-2, C3): lo calcula `repuestos_proyecto_margen` (8.11-1) por moneda, con `repuestos.costos.ver` y `repuestos.ver`
// (sin ellos, 42501). Acá no hay aritmética: se lee con `leerMargen`, que deja el margen en nulo si hay ítems sin precio.
export async function leerMargenDelProyecto(
  proyectoId: string,
): Promise<Resultado<MargenDelProyecto>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuestos_proyecto_margen', {
    p_proyecto: proyectoId,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leido = leerMargen(data)
  return leido.ok ? ok(leido.datos) : fallo('inesperado', leido.error)
}
