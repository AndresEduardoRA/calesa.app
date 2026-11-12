'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTransporte } from '../../../areas/transporte/composicion'
import type { TransporteGuardado } from '../../../entities/transporte/repositorio-de-transporte'
import { esquemaGuardarTransporte } from '../schemas/transporte'

// Guarda el transporte de un vehículo con la versión que se tenía en pantalla (6.08-2). Pide logistica.transporte.editar del origen: la base lo exige.
export const guardarTransporte = actionClient
  .inputSchema(esquemaGuardarTransporte)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<TransporteGuardado>> => {
    return repositorioDeTransporte.guardar(parsedInput)
  })
