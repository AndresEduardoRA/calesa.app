'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTablas } from '../../../areas/tablas/composicion'
import {
  MOTIVO_SIN_PERMISO_DE_TABLA,
  type PublicacionDeTabla,
} from '../../../entities/tablas/publicacion'
import { esquemaDePublicarTabla } from '../schemas/publicar-tabla'

// Publica una tabla de referencia entera (`tabla_referencia_publicar()`): la base reemplaza sus filas, sube su versión y publica la N+1 de cada fórmula que la usa, y vuelve a
// pedir el permiso (en una compartida, el de cada origen que la usa). `puede()` sólo evita pedir lo que se va a rechazar: con una compartida alcanza el de algún origen.
// Sólo si entró, la pestaña se vuelve a leer.
export const publicarTabla = actionClient
  .inputSchema(esquemaDePublicarTabla)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<PublicacionDeTabla>> => {
    if (!puede(ctx.permisos, 'cotizaciones.configurar', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_TABLA)
    }
    const hecho = await repositorioDeTablas.publicar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeCotizacion)
    }
    return hecho
  })
