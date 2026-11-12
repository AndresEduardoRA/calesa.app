// Lo que la aduana lee, dicho como interfaz (6.09-1). La implementación (Supabase, por RPC con la sesión de quien mira) vive en `infra/aduana/listas.ts` y se la entrega
// `areas/aduana/composicion.ts`. 6.09-2 le suma las escrituras: `guardar`, `ponerVehiculos` y `asignarCanal`, siempre con la versión que se leyó (`PT409` si cambió).
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'
import type { Pagina } from '@/shared/lib/paginacion'
import type { CanalDeAforo, DeclaracionLeida, FilaDeDeclaracion } from './declaracion'
import type { CambiosDeDeclaracion, DeclaracionGuardada } from './escritura'
import type { PedidoDeAduana } from './filtros'

export type LecturasDeAduana = {
  // Una página de declaraciones (la base pide una fila de más para saber si hay otra).
  listar: (pedido: PedidoDeAduana) => Promise<Resultado<Pagina<FilaDeDeclaracion>>>
  // Una declaración con su composición; `no-encontrado` si no existe o no se ve (la base da el mismo `P0002`).
  leer: (id: string) => Promise<Resultado<DeclaracionLeida>>
}

export type EscriturasDeAduana = {
  // Crear (id y versión nulos) o editar. `datos` lleva sólo las claves que cambiaron; `null` vacía el dato.
  guardar: (p: {
    id: string | null
    actualizadoEnEsperado: string | null
    datos: CambiosDeDeclaracion
  }) => Promise<ResultadoDeAccion<DeclaracionGuardada>>
  // Agregar y quitar vehículos de una vez (hasta 200); con canal asignado la base no lo admite.
  ponerVehiculos: (p: {
    declaracionId: string
    actualizadoEnEsperado: string
    agregar: string[]
    quitar: string[]
  }) => Promise<ResultadoDeAccion<DeclaracionGuardada>>
  // Asignar o cambiar el canal de aforo; fija la composición.
  asignarCanal: (p: {
    declaracionId: string
    actualizadoEnEsperado: string
    canal: CanalDeAforo
  }) => Promise<ResultadoDeAccion<DeclaracionGuardada>>
}

export type RepositorioDeAduana = LecturasDeAduana & EscriturasDeAduana
