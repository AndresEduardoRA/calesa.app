import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import { COLUMNAS_DE_ITEM, filasDeItemDesde } from '../../entities/nucleo/item'
import {
  NO_SE_LEYO_EL_ITEM,
  elItemCambio,
  elItemYaNoExiste,
  rechazoDeCelda,
} from '../../entities/items/errores'
import type { RepositorioDeItems } from '../../entities/items/repositorio'
import { crearItemSupabase } from './crear'
import { eliminarItemSupabase } from './eliminar'
import { leerItem } from './leer'

// Guardar una celda es un `update` directo por columna (la tabla da UPDATE por columna a `repuestos.editar`: el grant y la policy son el límite) y la tabla NO revisa la versión: la revisa
// este repositorio con `.eq('actualizado_en', …)`. Cero filas nunca es éxito (patrón de `catalogos/escribir.ts`): o el ítem ya no existe, o cambió desde que se vio. Las filas ya borradas
// (`eliminado_en`) no se tocan. Sostiene la consulta la clave primaria.
async function guardar({
  id,
  fila,
  actualizadoEn,
}: Parameters<RepositorioDeItems['guardar']>[0]): ReturnType<RepositorioDeItems['guardar']> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_items')
    .update(fila)
    .eq('id', id)
    .eq('actualizado_en', actualizadoEn)
    .is('eliminado_en', null)
    .select(COLUMNAS_DE_ITEM)
    .limit(1)
  if (error) {
    return rechazoDeCelda(Object.keys(fila)[0] ?? '', error)
  }
  const filas = filasDeItemDesde(data)
  if (filas === null) {
    return { ok: false, error: { codigo: 'inesperado', mensaje: NO_SE_LEYO_EL_ITEM } }
  }
  const guardada = filas[0]
  if (guardada !== undefined) {
    return { ok: true, data: guardada }
  }
  // Cero filas: se relee para decir por qué.
  const actual = await leerItem(id)
  if (!actual.ok) {
    return actual
  }
  return actual.data === null ? elItemYaNoExiste() : elItemCambio()
}

export const itemsSupabase: RepositorioDeItems = {
  guardar,
  crear: crearItemSupabase,
  eliminar: eliminarItemSupabase,
}
