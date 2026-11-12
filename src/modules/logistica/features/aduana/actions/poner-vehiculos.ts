'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeAduana } from '../../../areas/aduana/composicion'
import type { DeclaracionGuardada } from '../../../entities/aduana/escritura'
import { esquemaPonerVehiculos } from '../schemas/declaracion'

// Agrega y quita vehículos de una declaración de una vez, con la versión que se tenía (6.09-2). Con canal asignado la base no lo admite.
export const ponerVehiculos = actionClient
  .inputSchema(esquemaPonerVehiculos)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<DeclaracionGuardada>> => {
    return repositorioDeAduana.ponerVehiculos(parsedInput)
  })
