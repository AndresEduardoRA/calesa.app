import 'server-only'
import { fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { NO_SE_LEYO_LA_RESPUESTA, rechazoDeStock } from '../../entities/stock/errores'
import { respuestaDeMoverDesde } from '../../entities/stock/mover'
import type { RepositorioDeStock } from '../../entities/stock/repositorio'

// Mover el stock es sólo por RPC (`repuesto_stock_mover`, 8.10-1): pide `repuestos.editar`, toma el candado del ítem, compara el stock que se vio (`PT409` si cambió),
// nunca deja negativo y registra el movimiento. Devuelve el ítem tras el cambio; la nota vacía no viaja (la base la guarda nula).
export const moverStock: RepositorioDeStock['mover'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuesto_stock_mover', {
    p_item: pedido.itemId,
    p_unidades: pedido.unidades,
    p_motivo: pedido.motivo,
    p_stock_esperado: pedido.stockEsperado,
    ...(pedido.nota ? { p_nota: pedido.nota } : {}),
  })
  if (error) {
    return rechazoDeStock(error)
  }
  const respuesta = respuestaDeMoverDesde(data)
  return respuesta === null
    ? fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
    : { ok: true, data: respuesta }
}
