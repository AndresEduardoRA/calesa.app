'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLaFormula } from '../../../areas/formula/composicion'
import { MOTIVO_SIN_PERMISO_DE_FORMULA } from '../../../entities/formula/publicacion'
import { esquemaDeDescartar } from '../schemas/descarte'

// Descarta el borrador del origen (`formula_descartar_borrador()`): la base vuelve a pedir `cotizaciones.configurar` del origen y borra el que haya; la publicada no
// cambia. Sólo si entró, la pestaña se vuelve a leer.
export const descartarBorrador = actionClient
  .inputSchema(esquemaDeDescartar)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<null>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULA)
    }
    const hecho = await repositorioDeLaFormula.descartar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion)
    }
    return hecho
  })
