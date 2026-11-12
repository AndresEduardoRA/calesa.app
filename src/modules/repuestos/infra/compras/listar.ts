import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_COMPRA,
  TOPE_DE_COMPRAS,
  filasDeCompraDesde,
  type FilaDeCompra,
} from '../../entities/compras/compra'

// Las compras de un proyecto para la pestaña «Compras» (8.11-2, C2): una consulta con el ítem embebido. `limit 201` (el tope más uno) sobre
// `repuestos_compras_proyecto_id_idx`: ordena sólo las compras de un proyecto, así que no crece con la tabla. La RLS decide (vivas y con
// `repuestos.costos.ver`): sin el permiso devuelve cero filas. Las más recientes primero.
export async function leerComprasDelProyecto(
  proyectoId: string,
): Promise<Resultado<{ filas: FilaDeCompra[]; hayMas: boolean }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_compras')
    .select(COLUMNAS_DE_COMPRA)
    .eq('proyecto_id', proyectoId)
    .is('eliminado_en', null)
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DE_COMPRAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDeCompraDesde(data)
  return filas === null
    ? fallo('inesperado', 'No se pudieron cargar las compras.')
    : ok(cortarAlTope(filas, TOPE_DE_COMPRAS))
}
