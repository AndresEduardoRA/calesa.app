// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz de
// `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de `infra/`.
import 'server-only'
import type {
  LectorDePaginaDeConversaciones,
  LectorDeUnaConversacion,
} from './entities/repositorios'
import { repositorioDeConversaciones } from './infra/conversaciones-escritura'
import { repositorioDeFichas } from './infra/fichas-escritura'
import { repositorioDeMensajes } from './infra/mensajes-escritura'
import { getConversacion } from './infra/conversacion'
import { getPaginaDeConversaciones } from './infra/conversaciones'

export const leerPaginaDeConversaciones: LectorDePaginaDeConversaciones = getPaginaDeConversaciones
export const leerConversacion: LectorDeUnaConversacion = getConversacion
export { repositorioDeConversaciones, repositorioDeFichas, repositorioDeMensajes }
