// El valor por defecto de unas constantes al abrir el ⚙ de una celda (4.20-3a; lo monta el panel del 4.20-3b), desde el navegador y con la sesión de quien lo abre: una
// lectura por pedido. La consulta y su índice están en `consulta-del-valor-por-defecto.ts`.
import { z } from 'zod'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { ValorPorDefecto } from '../../entities/formula/ajuste'
import { esquemaId } from '../../entities/nodos'
import { leerValorPorDefectoSobre } from './consulta-del-valor-por-defecto'

export type PedidoDelValorPorDefecto = { origenId: string; nodos: readonly string[] }

// Una celda ajusta a lo sumo dos nodos: ella y su secundario.
const esquemaDelPedido = z.object({
  origenId: z.guid(),
  nodos: z.array(esquemaId).min(1).max(2),
})

export async function leerValorPorDefecto(
  pedido: PedidoDelValorPorDefecto,
): Promise<Resultado<ValorPorDefecto | null>> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success) {
    return fallo('validacion', 'Ese pedido del valor por defecto no es válido.')
  }
  return leerValorPorDefectoSobre(createClient(), valido.data.origenId, valido.data.nodos)
}
