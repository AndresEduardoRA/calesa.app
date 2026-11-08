'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLaPlantilla } from '../../../areas/plantilla/composicion'
import { MOTIVO_SIN_PERMISO_DE_PLANTILLA } from '../../../entities/plantilla/escritura-de-la-plantilla'
import { esquemaDeDescartar } from '../schemas/escritura'

// Descarta el borrador de la plantilla del origen (`plantilla_descartar_borrador()`): la base vuelve a pedir el permiso y la versión esperada; la publicada no cambia. Sólo
// si entró, la pestaña se vuelve a leer.
export const descartarBorrador = actionClient
  .inputSchema(esquemaDeDescartar)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<null>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_PLANTILLA)
    }
    const hecho = await repositorioDeLaPlantilla.descartar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion)
    }
    return hecho
  })
