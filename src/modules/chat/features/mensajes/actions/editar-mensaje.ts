'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMensajes } from '../../../composicion'
import type { ResultadoDeEdicion } from '../../../entities/reglas-del-mensaje'
import { esquemaDeEdicion } from '../schemas/mensajes'

// Edita el texto de un mensaje propio (la base exige autor, 15 minutos y la versión leída). Sin `revalidatePath`: la señal `UPDATE` avisa a las dos sesiones.
export const editarMensaje = actionClient
  .inputSchema(esquemaDeEdicion)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEdicion>> => {
    const resultado = await repositorioDeMensajes.editar(parsedInput)
    if (resultado.ok) {
      return resultado
    }
    const { campo, error } = resultado
    return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
  })
