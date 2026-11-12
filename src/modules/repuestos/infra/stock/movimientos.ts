import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_MOVIMIENTO,
  movimientosDesde,
  paginaDeMovimientos,
} from '../../entities/stock/movimientos'
import type { RepositorioDeStock } from '../../entities/stock/repositorio'

const NO_SE_LEYO = 'No se pudo cargar el historial.'

// El historial de un ítem (8.10-2, C6), con la sesión de quien mira: sin `repuestos.ver` la RLS devuelve cero filas. Por `repuestos_stock_movimientos_item_id_idx`
// (ordena sólo los movimientos del ítem: pocos, D13 de 8.10-1), de a `TAMANO_DE_VER_MAS` por `id desc` con el `id` como cursor; se pide uno de más.
export const leerMovimientos: RepositorioDeStock['movimientos'] = async ({ itemId, cursor }) => {
  const supabase = await createClient()
  let consulta = supabase
    .from('repuestos_stock_movimientos')
    .select(COLUMNAS_DE_MOVIMIENTO)
    .eq('item_id', itemId)
  if (cursor !== null) {
    consulta = consulta.lt('id', cursor)
  }
  const { data, error } = await consulta
    .order('id', { ascending: false })
    .limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = movimientosDesde(data)
  return filas === null
    ? fallo('inesperado', NO_SE_LEYO)
    : ok(paginaDeMovimientos(filas, TAMANO_DE_VER_MAS))
}
