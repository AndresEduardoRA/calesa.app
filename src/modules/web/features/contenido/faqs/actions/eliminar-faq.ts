'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFaqs } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_CONTENIDO } from '../../../../entities/contenido/errores'
import { esquemaEliminarFaq } from '../schemas/faq'

// Elimina una pregunta con la versión que se vio (8.02-1). Deja de verse en la web pública en cuanto el trigger de revalidación avisa al sitio.
export const eliminarFaq = actionClient
  .inputSchema(esquemaEliminarFaq)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ id: string }>> => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_CONTENIDO)
    }
    const hecho = await repositorioDeFaqs.eliminar(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeWeb)
    return hecho
  })
