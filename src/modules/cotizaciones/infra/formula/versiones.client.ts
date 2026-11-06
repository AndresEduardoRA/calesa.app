// «Ver más» e «Ir a la versión» de la lista de versiones de la fórmula (4.20-2a), desde el navegador y con la sesión de quien mira: cada pedido lee su página y los
// nombres de esa página, sin ir al servidor. La consulta y su índice están en `consulta-de-versiones.ts`.
import { z } from 'zod'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { MAXIMA_VERSION, type PaginaConAutores } from '../../entities/formula/versiones'
import { leerPaginaConAutores } from './consulta-de-versiones'

export type PedidoDeVersiones = { origenId: string; cursor: number | null }

const esquemaDelPedido = z.object({
  origenId: z.guid(),
  cursor: z
    .number()
    .int()
    .min(2)
    .max(MAXIMA_VERSION + 1)
    .nullable(),
})

export async function leerPaginaDeVersiones(
  pedido: PedidoDeVersiones,
): Promise<Resultado<PaginaConAutores>> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success) {
    return fallo('validacion', 'Ese pedido de versiones no es válido.')
  }
  return leerPaginaConAutores(createClient(), valido.data.origenId, valido.data.cursor)
}
