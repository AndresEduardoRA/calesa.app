'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFinal } from '../../../areas/final/composicion'
import { puedeMarcarFinales } from '../../../entities/final/acceso'
import { RUTA_DEL_LISTADO } from '../../../entities/ruta-de-la-hoja'
import { esquemaMarcarFinal } from '../schemas/final'

// Marca final una cotización (4.25-2). Sin gestionar finales en algún origen no se llama a la base; el origen, el lead, el vehículo y las preventas los mira
// la base, que devuelve el motivo para la persona.
export const marcarFinal = actionClient
  .inputSchema(esquemaMarcarFinal)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<null>> => {
    if (!puedeMarcarFinales(ctx.permisos)) {
      return fallo('sin_permiso', 'No tienes permiso para marcar la final.')
    }
    const resultado = await repositorioDeFinal.marcar(parsedInput.id)
    if (resultado.ok) {
      // La guardada pasa a «Final», el listado la ve y la papelera tiene las preventas del vehículo: todo bajo `/cotizaciones`.
      revalidatePath(RUTA_DEL_LISTADO, 'layout')
    }
    return resultado
  })
