'use server'

import { z } from 'zod'
import { ok } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeNotificaciones } from '../../../composicion'
import { accionaAlAbrir } from '../../../entities/tipos'
import { esquemaDeIdDeNotificacion } from '../../../entities/notificacion'

// Abrir un aviso lo marca leído, y accionado sólo si su tipo lo dice (`accionaAlAbrir`). La persona sale de la
// sesión, nunca del pedido; la RLS lo impone igual. Sin `revalidatePath`: la campana se entera por Realtime.
export const abrirNotificacion = actionClient
  .inputSchema(z.object({ id: esquemaDeIdDeNotificacion }))
  .action(async ({ parsedInput, ctx }) => {
    const propia = await repositorioDeNotificaciones.leer(ctx.usuarioId, parsedInput.id)
    if (!propia.ok) {
      return propia
    }
    if (!propia.data) {
      return ok(null)
    }
    return repositorioDeNotificaciones.abrir(
      ctx.usuarioId,
      parsedInput.id,
      accionaAlAbrir(propia.data.tipo, propia.data.requiereAccion),
    )
  })
