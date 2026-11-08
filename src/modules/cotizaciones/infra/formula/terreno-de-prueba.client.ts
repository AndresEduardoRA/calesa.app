// Lo de prueba de la vista previa del editor de la fórmula (4.21-3a-2), desde el navegador y con la sesión de quien edita. Las consultas y sus índices están en
// `consulta-del-terreno-de-prueba.ts`.
import { z } from 'zod'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { TerrenoDePrueba } from '../../entities/formula/terreno-de-prueba'
import { esquemaId } from '../../entities/nodos'
import { leerElTerrenoSobre, type PedidoDelTerreno } from './consulta-del-terreno-de-prueba'

export type { PedidoDelTerreno }

// Las listas llevan ids de la fórmula (`esquemaId`), acotadas: una fórmula puede nombrar muchas más de las que se leen (la lectura corta y lo avisa).
const esquemaDelPedido = z.object({
  origenId: z.guid(),
  tablas: z.array(esquemaId).max(2000),
  cambios: z.array(esquemaId).max(2000),
})

export async function leerElTerrenoDePrueba(
  pedido: PedidoDelTerreno,
): Promise<Resultado<TerrenoDePrueba>> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success) {
    return fallo('validacion', 'Ese pedido de las cifras de prueba no es válido.')
  }
  return leerElTerrenoSobre(createClient(), valido.data)
}
