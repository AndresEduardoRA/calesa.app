'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMensajes } from '../../../composicion'
import { esquemaDeEnvio } from '../schemas/mensajes'

// Envía un mensaje con el `id` del navegador (reenviarlo responde `repetido`). Sin `revalidatePath`: el hilo y la lista se enteran por Realtime.
export const enviarMensaje = actionClient
  .inputSchema(esquemaDeEnvio)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<{ id: string; creadoEn: string }>> => {
    const resultado = await repositorioDeMensajes.enviar(parsedInput)
    if (resultado.ok) {
      return resultado
    }
    const { campo, error } = resultado
    return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
  })
