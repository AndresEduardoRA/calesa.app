'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLaFormula } from '../../../areas/formula/composicion'
import { MOTIVO_SIN_PERMISO_DE_FORMULA } from '../../../entities/formula/publicacion'
import { esquemaDePublicar } from '../schemas/publicacion'

// Publica el borrador del origen como la N+1 (`formula_publicar()`): la base vuelve a pedir el permiso, la nota y la publicada esperada, y valida el borrador. Devuelve el
// id de la versión publicada; sólo si entró, la pestaña se vuelve a leer.
export const publicarBorrador = actionClient
  .inputSchema(esquemaDePublicar)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<string>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULA)
    }
    const hecho = await repositorioDeLaFormula.publicar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion)
    }
    return hecho
  })
