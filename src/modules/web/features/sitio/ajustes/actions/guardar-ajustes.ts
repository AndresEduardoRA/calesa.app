'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { guardarAjustesDelSitio as guardarEnLaBase } from '../../../../areas/sitio/composicion'
import {
  MOTIVO_SIN_PERMISO_AJUSTES_DEL_SITIO,
  cambiosDeAjustes,
} from '../../../../entities/sitio/ajustes'
import { esquemaAjustesDelSitio } from '../schemas/ajustes'

// Guarda los ajustes del sitio de una vez: sólo las claves del sitio (nunca `legales` ni la política de la cola). La base repite el
// permiso, valida cada clave y compara la versión (`PT409`, `web_ajustes_guardar`).
export const guardarAjustesDelSitio = actionClient
  .inputSchema(esquemaAjustesDelSitio)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES_DEL_SITIO)
    }
    const { actualizadoEnEsperado, ...entrada } = parsedInput
    const guardado = await guardarEnLaBase({
      cambios: cambiosDeAjustes(entrada),
      actualizadoEnEsperado,
    })
    if (guardado.ok) {
      revalidatePath(RUTAS.configuracionDeWeb)
    }
    return guardado
  })
