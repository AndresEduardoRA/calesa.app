'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeVinculo } from '../../../composicion'
import type { RespuestaDeInteres } from '../../../entities/vehiculos-del-lead'
import { esquemaQuitarInteres } from '../schemas/vinculo'
import { comoResultado } from './resultado'
import { revalidarVinculo } from './revalidar'

// Quita el interés. Devuelve la nota que tenía: «Deshacer» la vuelve a poner.
export const quitarInteres = actionClient
  .inputSchema(esquemaQuitarInteres)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<RespuestaDeInteres>> => {
    const resultado = comoResultado(await repositorioDeVinculo.quitarInteres(parsedInput))
    if (resultado.ok && resultado.data.resultado !== 'sin_cambios') {
      revalidarVinculo()
    }
    return resultado
  })
