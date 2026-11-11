'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEventos } from '../../../composicion'
import type { ResultadoDeEscritura } from '../../../entities/escritura'
import { comoResultado } from '../../resultado'
import { esquemaCrearEvento } from '../schemas/eventos'

// Crea un evento (idempotente por el id del intento). La base decide quién puede publicar.
export const crearEvento = actionClient
  .inputSchema(esquemaCrearEvento)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEscritura>> => {
    const resultado = comoResultado(await repositorioDeEventos.crear(parsedInput))
    if (resultado.ok) {
      revalidatePath('/agenda')
    }
    return resultado
  })
