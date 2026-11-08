'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMarcas } from '../../../areas/comentarios/composicion'
import { esquemaRetirarReporte } from '../schemas/marcas'

// Retira el reporte de quien mira (4.27-4). Es reversible: el aviso ofrece «Deshacer», que vuelve a reportar con el mismo motivo.
export const retirarReporte = actionClient
  .inputSchema(esquemaRetirarReporte)
  .action(
    async ({
      parsedInput,
    }): Promise<ResultadoDeAccion<{ resultado: 'retirado' | 'sin_cambios' }>> => {
      return repositorioDeMarcas.retirarReporte(parsedInput)
    },
  )
