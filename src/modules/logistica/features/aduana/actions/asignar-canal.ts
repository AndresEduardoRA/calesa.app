'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeAduana } from '../../../areas/aduana/composicion'
import type { DeclaracionGuardada } from '../../../entities/aduana/escritura'
import { esquemaAsignarCanal } from '../schemas/declaracion'

// Asigna o cambia el canal de aforo (6.09-2). Fija la composición: la base no admite quitarlo.
export const asignarCanal = actionClient
  .inputSchema(esquemaAsignarCanal)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<DeclaracionGuardada>> => {
    return repositorioDeAduana.asignarCanal(parsedInput)
  })
