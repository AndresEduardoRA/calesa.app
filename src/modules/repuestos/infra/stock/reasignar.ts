import 'server-only'
import { fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { NO_SE_LEYO_LA_RESPUESTA, rechazoDeStock } from '../../entities/stock/errores'
import { respuestaDeReasignarDesde } from '../../entities/stock/reasignar'
import type { RepositorioDeStock } from '../../entities/stock/repositorio'

// Reasignar es sólo por RPC (`repuesto_stock_reasignar`, 8.10-1): pide `repuestos.editar`, toma el candado del ítem de origen y, todo o nada, descuenta las unidades y
// crea el ítem en el proyecto destino. Idempotente por `p_id`: el reintento con el mismo id devuelve el mismo ítem; con otro destino, 23505 (`hint = 'id'`).
export const reasignarStock: RepositorioDeStock['reasignar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuesto_stock_reasignar', {
    p_item: pedido.itemId,
    p_proyecto_destino: pedido.proyectoDestinoId,
    p_unidades: pedido.unidades,
    p_id: pedido.id,
  })
  if (error) {
    return rechazoDeStock(error)
  }
  const respuesta = respuestaDeReasignarDesde(data)
  return respuesta === null
    ? fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
    : { ok: true, data: respuesta }
}
