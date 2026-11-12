'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeAduana } from '../../../areas/aduana/composicion'
import type { DeclaracionGuardada } from '../../../entities/aduana/escritura'
import { esquemaGuardarDeclaracion } from '../schemas/declaracion'

// Crea o edita una declaración con la versión que se tenía en pantalla (6.09-2). Pide logistica.aduana.gestionar: la base lo exige.
export const guardarDeclaracion = actionClient
  .inputSchema(esquemaGuardarDeclaracion)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<DeclaracionGuardada>> => {
    return repositorioDeAduana.guardar(parsedInput)
  })
