'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeComprobantes } from '../../../areas/comprobantes/composicion'
import { puedeEmitirComprobantes } from '../../../entities/comprobantes/acceso'
import type { ComprobanteEmitido } from '../../../entities/comprobantes/repositorio'
import { RUTA_DEL_LISTADO } from '../../../entities/ruta-de-la-hoja'
import { esquemaEmitirComprobante } from '../schemas/comprobantes'

// Emite el comprobante de una cotización (4.26-2). Sin la clave no se llama a la base; la final activa, la versión y el vigente los mira la base, que pone la
// serie y `datos` y devuelve el motivo para la persona.
export const emitirComprobante = actionClient
  .inputSchema(esquemaEmitirComprobante)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ComprobanteEmitido>> => {
    if (!puedeEmitirComprobantes(ctx.permisos)) {
      return fallo('sin_permiso', 'No tienes permiso para emitir comprobantes.')
    }
    const resultado = await repositorioDeComprobantes.emitir(
      parsedInput.cotizacionId,
      parsedInput.cotizacionEsperada,
    )
    if (resultado.ok) {
      // La guardada pasa a tener el comprobante y la papelera ya no la acepta: todo bajo `/cotizaciones`.
      revalidatePath(RUTA_DEL_LISTADO, 'layout')
    }
    return resultado
  })
