'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMarcas } from '../../../areas/comentarios/composicion'
import { esquemaReportar } from '../schemas/marcas'

type Reporte = { resultado: 'reportada' | 'motivo_cambiado' | 'sin_cambios' }

// Reporta la cotización con un motivo (4.27-4); uno por persona: el segundo cambia el motivo. Lo que la base dice del motivo (22023) va bajo el campo.
export const reportar = actionClient
  .inputSchema(esquemaReportar)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<Reporte>> => {
    const resultado = await repositorioDeMarcas.reportar(parsedInput)
    if (!resultado.ok && resultado.error.codigo === 'regla') {
      return { ...resultado, porCampo: { motivo: resultado.error.mensaje } }
    }
    return resultado
  })
