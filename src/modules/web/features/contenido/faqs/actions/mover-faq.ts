'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFaqs } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_CONTENIDO } from '../../../../entities/contenido/errores'
import { esquemaMoverFaq } from '../schemas/faq'

// Sube o baja una pregunta un lugar (8.02-1, D6): el servidor relee la lista, renumera y escribe cada fila con su versión. No es atómico.
export const moverFaq = actionClient
  .inputSchema(esquemaMoverFaq)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<null>> => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CONTENIDO)
    }
    const hecho = await repositorioDeFaqs.mover(parsedInput)
    // Aun con un rechazo a medias, algo pudo haberse escrito: la lista se vuelve a leer.
    revalidatePath(RUTAS.configuracionDeWeb)
    return hecho
  })
