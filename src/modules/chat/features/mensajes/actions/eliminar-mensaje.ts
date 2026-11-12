'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMensajes } from '../../../composicion'
import type { ResultadoDeConversacion } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaDeBorrado } from '../schemas/mensajes'

// Borra un mensaje: el autor o quien tiene `chat.moderar` (la base lo exige). Vacía el texto; la señal `UPDATE` lo muestra como «Mensaje eliminado».
export const eliminarMensaje = actionClient
  .inputSchema(esquemaDeBorrado)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeConversacion>> => {
    return comoResultado(await repositorioDeMensajes.eliminar(parsedInput.mensaje))
  })
