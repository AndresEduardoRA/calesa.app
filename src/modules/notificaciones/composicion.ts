// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz de
// `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de `infra/`.
import 'server-only'
import type {
  LectorDeApagadosDePush,
  LectorDePaginaDeNotificaciones,
  LectorDeSuscripciones,
  RepositorioDeNotificaciones,
  RepositorioDePush,
} from './entities/repositorios'
import { notificacionesSupabase } from './infra/notificaciones'
import { pushSupabase } from './infra/push'
import { getPaginaDeNotificaciones } from './infra/queries/notificaciones'
import { getApagadosDePush, getMisSuscripciones } from './infra/queries/push'

export const repositorioDeNotificaciones: RepositorioDeNotificaciones = notificacionesSupabase
export const leerPaginaDeNotificaciones: LectorDePaginaDeNotificaciones = getPaginaDeNotificaciones
export const repositorioDePush: RepositorioDePush = pushSupabase
export const leerMisSuscripciones: LectorDeSuscripciones = getMisSuscripciones
export const leerApagadosDePush: LectorDeApagadosDePush = getApagadosDePush
