'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGastos } from '../../../areas/dinero/composicion'
import type { GastoGuardado } from '../../../entities/dinero/repositorio-de-gastos'
import { esquemaGuardarGasto } from '../schemas/gasto'

// Corrige un gasto con la versión que se tenía en pantalla (6.11-1): si otra persona lo cambió, la base responde `PT409` y la interfaz ofrece «Recargar».
export const guardarGasto = actionClient
  .inputSchema(esquemaGuardarGasto)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<GastoGuardado>> => {
    return repositorioDeGastos.guardar(parsedInput)
  })
