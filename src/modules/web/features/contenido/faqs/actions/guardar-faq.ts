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
import { esquemaGuardarFaq } from '../schemas/faq'

// Edita una pregunta o la publica y despublica, con sólo lo que cambió y la versión que se vio (8.02-1): con otra versión, conflicto.
export const guardarFaq = actionClient
  .inputSchema(esquemaGuardarFaq)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<Faq>> => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CONTENIDO)
    }
    const hecho = await repositorioDeFaqs.guardar(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeWeb)
    return hecho
  })
