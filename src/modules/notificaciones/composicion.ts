// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz de
// `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de `infra/`.
import 'server-only'
import type {
  LectorDePaginaDeNotificaciones,
  RepositorioDeNotificaciones,
} from './entities/repositorios'
import { notificacionesSupabase } from './infra/notificaciones'
import { getPaginaDeNotificaciones } from './infra/queries/notificaciones'

export const repositorioDeNotificaciones: RepositorioDeNotificaciones = notificacionesSupabase
export const leerPaginaDeNotificaciones: LectorDePaginaDeNotificaciones = getPaginaDeNotificaciones
