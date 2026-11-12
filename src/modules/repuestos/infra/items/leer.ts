import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_ITEM,
  TOPE_DE_ITEMS_DE_LA_HOJA,
  filaDeItemDesde,
  filasDeItemDesde,
  type FilaDeItem,
} from '../../entities/nucleo/item'
import { armarHoja, type HojaLeida } from '../../entities/items/hoja'

const NO_SE_LEYERON = 'No se pudieron cargar los ítems.'

// Los ítems de un proyecto para la hoja (8.09-2, C2): una consulta, con la fase embebida. `limit 201` (el tope más uno) sobre `repuestos_items_proyecto_id_idx`: ordena sólo las filas de un
// proyecto, así que no crece con la tabla. La RLS (`repuestos.ver`, no eliminado) decide qué se ve. Antiguos primero, para que la fila nueva caiga al final.
export async function leerItemsDelProyecto(proyectoId: string): Promise<Resultado<HojaLeida>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_items')
    .select(COLUMNAS_DE_ITEM)
    .eq('proyecto_id', proyectoId)
    .is('eliminado_en', null)
    .order('creado_en')
    .order('id')
    .limit(TOPE_DE_ITEMS_DE_LA_HOJA + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = filasDeItemDesde(data)
  return filas === null ? fallo('inesperado', NO_SE_LEYERON) : ok(armarHoja(filas))
}

// Un ítem por su clave, con su fase: lo que devuelven guardar y crear para reemplazar la fila en la hoja. Nulo si ya no existe (borrado) o no se ve.
export async function leerItem(id: string): Promise<Resultado<FilaDeItem | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_items')
    .select(COLUMNAS_DE_ITEM)
    .eq('id', id)
    .is('eliminado_en', null)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const fila = filaDeItemDesde(data)
  return fila === null ? fallo('inesperado', NO_SE_LEYERON) : ok(fila)
}
