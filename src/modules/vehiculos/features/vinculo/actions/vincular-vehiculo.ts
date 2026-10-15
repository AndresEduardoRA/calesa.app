'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeVinculo } from '../../../composicion'
import type { RespuestaDeVinculo } from '../../../entities/vehiculos-del-lead'
import { esquemaVincular } from '../schemas/vinculo'
import { comoResultado } from './resultado'
import { revalidarVinculo } from './revalidar'

// Vincula el vehículo a un lead (o lo desvincula, con `leadId` nulo), con la versión del vehículo.
// Quién puede lo decide la base: vincular pide la cartera del lead; desvincular, editar el vehículo.
export const vincularVehiculo = actionClient
  .inputSchema(esquemaVincular)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<RespuestaDeVinculo>> => {
    const resultado = comoResultado(await repositorioDeVinculo.vincular(parsedInput))
    if (resultado.ok && resultado.data.resultado !== 'sin_cambios') {
      revalidarVinculo()
    }
    return resultado
  })
