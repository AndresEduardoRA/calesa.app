'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLaFormula } from '../../../areas/formula/composicion'
import { MOTIVO_SIN_PERMISO_DE_FORMULA } from '../../../entities/formula/publicacion'
import { esquemaDeRevertir } from '../schemas/publicacion'

// Publica la N+1 como copia de una versión archivada, con su diseño (`formula_revertir()`); el borrador no cambia. La base vuelve a pedir el permiso, la nota y la
// publicada esperada. Devuelve el id de la versión nueva; sólo si entró, la pestaña se vuelve a leer.
export const revertirVersion = actionClient
  .inputSchema(esquemaDeRevertir)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<string>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULA)
    }
    const hecho = await repositorioDeLaFormula.revertir(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion)
    }
    return hecho
  })
