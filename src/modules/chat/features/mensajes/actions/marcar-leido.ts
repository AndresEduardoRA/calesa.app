'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMensajes } from '../../../composicion'
import type { ResultadoDeConversacion } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaDeLectura } from '../schemas/mensajes'

// Marca la conversación leída hasta ese instante (`chat_leer`: sólo avanza). Sin `revalidatePath`: la lista se entera por la señal
// `UPDATE` de `conversaciones_miembros`.
export const marcarLeido = actionClient
  .inputSchema(esquemaDeLectura)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeConversacion>> => {
    return comoResultado(await repositorioDeMensajes.leer(parsedInput))
  })
