// Lo que la aduana lee, dicho como interfaz (6.09-1). La implementación (Supabase, por RPC con la sesión de quien mira) vive en `infra/aduana/listas.ts` y se la entrega
// `areas/aduana/composicion.ts`. 6.09-2 le suma `guardar`, `ponerVehiculos` y `asignarCanal`.
import type { Resultado } from '@/shared/lib/errores'
import type { Pagina } from '@/shared/lib/paginacion'
import type { DeclaracionLeida, FilaDeDeclaracion } from './declaracion'
import type { PedidoDeAduana } from './filtros'

export type RepositorioDeAduana = {
  // Una página de declaraciones (la base pide una fila de más para saber si hay otra).
  listar: (pedido: PedidoDeAduana) => Promise<Resultado<Pagina<FilaDeDeclaracion>>>
  // Una declaración con su composición; `no-encontrado` si no existe o no se ve (la base da el mismo `P0002`).
  leer: (id: string) => Promise<Resultado<DeclaracionLeida>>
}
