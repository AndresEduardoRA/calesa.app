'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFichas } from '../../../composicion'
import type { ResultadoDeConversacion } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaDeEventoDelChat } from '../schemas/fichas'

// Crea el evento y su ficha en el hilo. Con invitados es «seleccionados» (pide `agenda.eventos.publicar`); sin ese permiso nace privado y sin invitados.
export const crearEventoDelChat = actionClient
  .inputSchema(esquemaDeEventoDelChat)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeConversacion>> =>
    comoResultado(await repositorioDeFichas.crearEvento(parsedInput)),
  )
