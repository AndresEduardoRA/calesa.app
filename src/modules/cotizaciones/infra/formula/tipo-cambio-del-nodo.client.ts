// El tipo de cambio que nombra el nodo de una celda al abrir su ⚙ (4.20-3c; lo monta el panel del 4.20-3d), desde el navegador y con la sesión de quien lo abre: una
// lectura por pedido. La RPC y sus índices están en `consulta-del-tipo-cambio-del-nodo.ts`.
import { z } from 'zod'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { TipoCambioDelNodo } from '../../entities/formula/tipo-cambio'
import { esquemaId } from '../../entities/nodos'
import { leerTipoCambioDelNodoSobre } from './consulta-del-tipo-cambio-del-nodo'

// `formulaId`: la versión que dibuja la hoja (la publicada o la de una guardada).
export type PedidoDelTipoCambioDelNodo = { formulaId: string; nodo: string }

const esquemaDelPedido = z.object({ formulaId: z.guid(), nodo: esquemaId })

export async function leerTipoCambioDelNodo(
  pedido: PedidoDelTipoCambioDelNodo,
): Promise<Resultado<TipoCambioDelNodo | null>> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success) {
    return fallo('validacion', 'Ese pedido del tipo de cambio no es válido.')
  }
  return leerTipoCambioDelNodoSobre(createClient(), valido.data.formulaId, valido.data.nodo)
}
