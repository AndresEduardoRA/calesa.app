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

// `/chat?con=<usuario>`: abre (o reencuentra) la directa con esa persona; la base decide si se puede (`chat_directa`). Devuelve el
// mensaje legible de la base, no el error entero: la página sólo lo dice.
export async function abrirConversacionCon(
  usuarioId: string,
): Promise<{ ok: true; data: { id: string } } | { ok: false; error: string }> {
  const abierta = await repositorioDeConversaciones.abrirDirecta(usuarioId)
  return abierta.ok
    ? { ok: true, data: { id: abierta.data.id } }
    : { ok: false, error: abierta.error.mensaje }
}

export { repositorioDeConversaciones, repositorioDeFichas, repositorioDeMensajes }
