'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLaPlantilla } from '../../../areas/plantilla/composicion'
import { MOTIVO_SIN_PERMISO_DE_PLANTILLA } from '../../../entities/plantilla/escritura-de-la-plantilla'
import { esquemaDePublicar } from '../schemas/escritura'

// Publica el borrador de la plantilla del origen (`plantilla_publicar()`): la base vuelve a pedir el permiso, la nota, la versión esperada y valida la plantilla contra la
// fórmula publicada y el catálogo de tonos. Devuelve el id de la publicada; sólo si entró, la pestaña se vuelve a leer.
export const publicarBorrador = actionClient
  .inputSchema(esquemaDePublicar)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<string>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_PLANTILLA)
    }
    const hecho = await repositorioDeLaPlantilla.publicar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion)
    }
    return hecho
  })
