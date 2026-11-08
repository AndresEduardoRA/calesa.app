'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDelDiseno } from '../../../areas/diseno/composicion'
import {
  MOTIVO_SIN_PERMISO_DEL_DISENO,
  type BorradorDelDisenoGuardado,
} from '../../../entities/diseno/edicion-del-diseno'
import { esquemaDeGuardarDiseno } from '../schemas/guardado'

// Guarda el borrador del origen desde la pestaña «Diseño» (`formula_guardar_borrador()`): sobre la publicada lo crea, sobre el borrador lo pisa con su hora. La base
// vuelve a pedir `cotizaciones.configurar` del origen y valida la forma del diseño. Devuelve la fila escrita, para volver a guardar sin releer; sólo si entró, la
// pestaña se vuelve a leer (el editor no se vuelve a montar: su `key` no depende de la versión).
export const guardarDiseno = actionClient
  .inputSchema(esquemaDeGuardarDiseno)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<BorradorDelDisenoGuardado>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DEL_DISENO)
    }
    const hecho = await repositorioDelDiseno.guardarBorrador(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion)
    }
    return hecho
  })
