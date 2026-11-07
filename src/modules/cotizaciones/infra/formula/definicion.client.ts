// La definición de una versión de la fórmula al abrir el editor (4.21-3a-1), desde el navegador y con la sesión de quien lo abre: una lectura por apertura. La
// consulta y su índice están en `consulta-de-la-definicion.ts`.
import { z } from 'zod'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { FormulaParaEditar } from '../../entities/formula/edicion'
import { leerDefinicionSobre } from './consulta-de-la-definicion'

export type PedidoDeLaDefinicion = { formulaId: string }

const esquemaDelPedido = z.object({ formulaId: z.guid() })

export async function leerDefinicionParaEditar(
  pedido: PedidoDeLaDefinicion,
): Promise<Resultado<FormulaParaEditar | null>> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success) {
    return fallo('validacion', 'Ese pedido de la fórmula no es válido.')
  }
  return leerDefinicionSobre(createClient(), valido.data.formulaId)
}
