'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTestimonios } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_TESTIMONIOS } from '../../../../entities/contenido/errores'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import { esquemaCrearTestimonio } from '../schemas/testimonio'

// Crea un testimonio al final de la lista, sin publicar y sin consentimiento (8.02-2). El permiso se mira antes de escribir; lo que protege es la RLS.
export const crearTestimonio = actionClient
  .inputSchema(esquemaCrearTestimonio)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<Testimonio>> => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_TESTIMONIOS)
    }
    const hecho = await repositorioDeTestimonios.crear(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeWeb)
    return hecho
  })
