'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLaPlantilla } from '../../../areas/plantilla/composicion'
import { MOTIVO_SIN_PERMISO_DE_PLANTILLA } from '../../../entities/plantilla/escritura-de-la-plantilla'
import {
  mensajeDeTextoDeLaBase,
  revisarTextoParaLaBase,
} from '../../../entities/plantilla/texto-de-la-base'
import { esquemaDeGuardar } from '../schemas/escritura'

// Guarda el borrador de la plantilla del origen (`plantilla_guardar_borrador()`): la base vuelve a pedir `cotizaciones.configurar` del origen, la versión esperada y la
// forma. Antes de llamarla se ataja lo que no puede leer (un `\u0000`, un surrogate suelto, un valor demasiado hondo): vuelve con su ruta en `porCampo` y no llega a la
// base. Devuelve el `actualizado_en` nuevo; sólo si entró, la pestaña se vuelve a leer.
export const guardarBorrador = actionClient
  .inputSchema(esquemaDeGuardar)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<string>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_PLANTILLA)
    }
    // Sin plantilla no hay nada que guardar: la base recibiría un parámetro que falta.
    const problema =
      parsedInput.definicion === undefined
        ? { donde: 'definicion', motivo: 'no_json' as const }
        : revisarTextoParaLaBase(parsedInput.definicion)
    if (problema !== null) {
      const mensaje = mensajeDeTextoDeLaBase(problema)
      return {
        ok: false,
        error: { codigo: 'validacion', mensaje },
        porCampo: { [problema.donde]: mensaje },
      }
    }
    const hecho = await repositorioDeLaPlantilla.guardar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion)
    }
    return hecho
  })
