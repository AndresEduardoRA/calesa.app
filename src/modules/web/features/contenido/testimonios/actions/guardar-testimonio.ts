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
import { esquemaGuardarTestimonio } from '../schemas/testimonio'

// Guarda sólo lo que cambió de un testimonio con la versión que se vio (8.02-2). Cambiar el cliente, el texto o la foto de uno consentido anula el consentimiento (lo hace la base).
export const guardarTestimonio = actionClient
  .inputSchema(esquemaGuardarTestimonio)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<Testimonio>> => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_TESTIMONIOS)
    }
    const hecho = await repositorioDeTestimonios.guardar(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeWeb)
    return hecho
  })
