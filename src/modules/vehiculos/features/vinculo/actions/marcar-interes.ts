'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeVinculo } from '../../../composicion'
import type { RespuestaDeInteres } from '../../../entities/vehiculos-del-lead'
import { esquemaMarcarInteres } from '../schemas/vinculo'
import { comoResultado } from './resultado'
import { revalidarVinculo } from './revalidar'

// Marca el interés de un lead en un vehículo (o le cambia la nota): «poner», sin versión.
export const marcarInteres = actionClient
  .inputSchema(esquemaMarcarInteres)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<RespuestaDeInteres>> => {
    const resultado = comoResultado(
      await repositorioDeVinculo.marcarInteres({
        ...parsedInput,
        nota: parsedInput.nota === '' ? null : parsedInput.nota,
      }),
    )
    if (resultado.ok && resultado.data.resultado !== 'sin_cambios') {
      revalidarVinculo()
    }
    return resultado
  })
