'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { leerImpactoDeFase } from '../../../areas/fases/composicion'
import type { ImpactoDeFase } from '../../../entities/fases/vista-de-impacto'
import { esquemaLeerImpactoDeFase } from '../schemas/fases'
import { motivoSinPermisoDeFases, sinPermisoDeFases } from './resultado'

// Lo que usa una fase y qué haría jubilarla o eliminarla: la confirmación lo pide al abrirse. Una lectura, no escribe.
export const leerImpactoDeUnaFase = actionClient
  .inputSchema(esquemaLeerImpactoDeFase)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ImpactoDeFase>> => {
    const motivo = motivoSinPermisoDeFases(ctx.permisos, parsedInput.origenId)
    if (motivo !== null) {
      return sinPermisoDeFases(motivo)
    }
    return leerImpactoDeFase(parsedInput.id)
  })
