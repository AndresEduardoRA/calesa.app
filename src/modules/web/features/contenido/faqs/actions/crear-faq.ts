'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFaqs } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_CONTENIDO } from '../../../../entities/contenido/errores'
import type { Faq } from '../../../../entities/contenido/faqs'
import { esquemaCrearFaq } from '../schemas/faq'

// Crea una pregunta frecuente al final de la lista (8.02-1). El permiso se mira antes de escribir; lo que protege es la RLS.
export const crearFaq = actionClient
  .inputSchema(esquemaCrearFaq)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<Faq>> => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CONTENIDO)
    }
    const hecho = await repositorioDeFaqs.crear(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeWeb)
    return hecho
  })
