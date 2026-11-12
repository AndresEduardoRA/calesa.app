// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz de
// `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de `infra/`.
import 'server-only'
import type {
  LectorDePaginaDeConversaciones,
  LectorDeUnaConversacion,
} from './entities/repositorios'
import { getConversacion } from './infra/conversacion'
import { getPaginaDeConversaciones } from './infra/conversaciones'

export const leerPaginaDeConversaciones: LectorDePaginaDeConversaciones = getPaginaDeConversaciones
export const leerConversacion: LectorDeUnaConversacion = getConversacion
