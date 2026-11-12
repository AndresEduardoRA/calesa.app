// Lo que `/logistica/embarques` lee, dicho como interfaz (6.08-3). La implementación (Supabase, por RPC con la sesión de quien mira) vive en `infra/transporte/grupos.ts` y se la entrega
// `areas/transporte/composicion.ts`. 6.08-4 le suma la escritura del grupo.
import type { Resultado } from '@/shared/lib/errores'
import type { GrupoLeido, PaginaDeGrupos } from './grupos'
import type { PedidoDeGrupos } from './filtros'

export type LecturasDeGrupos = {
  // Una página de grupos por cursor opaco.
  listar: (pedido: PedidoDeGrupos) => Promise<Resultado<PaginaDeGrupos>>
  // Las unidades de un grupo (hasta 200); una clave que no existe o que no se ve da el grupo sin unidades.
  leer: (tipo: 'booking' | 'contenedor', clave: string) => Promise<Resultado<GrupoLeido>>
}
