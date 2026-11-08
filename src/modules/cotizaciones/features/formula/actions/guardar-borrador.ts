'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLaFormula } from '../../../areas/formula/composicion'
import { MOTIVO_SIN_PERMISO_DE_FORMULA } from '../../../entities/formula/publicacion'
import type { BorradorGuardado } from '../../../entities/formula/repositorio'
import { esquemaDeGuardarBorrador } from '../schemas/guardado'

// Guarda el borrador del origen desde el editor (`formula_guardar_borrador()`, 4.21-2): sobre la publicada lo crea, sobre el borrador lo pisa con su hora. La base
// vuelve a pedir `cotizaciones.configurar` del origen y valida la fórmula y la forma del diseño. Devuelve la fila escrita, para volver a guardar sin releer; sólo si
// entró, la pestaña se vuelve a leer (el editor no se vuelve a montar: su `key` no depende de la versión).
export const guardarBorrador = actionClient
  .inputSchema(esquemaDeGuardarBorrador)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<BorradorGuardado>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_FORMULA)
    }
    const hecho = await repositorioDeLaFormula.guardarBorrador(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion)
    }
    return hecho
  })
