'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeSituacion } from '../../../composicion'
import { puedeResolverLaSubasta } from '../../../entities/situacion'
import { esquemaNoGanada } from '../schemas/no-ganada'

// «No la ganamos» y su «Deshacer»: quien puede mover de fase en el origen y ve su logística (se comprueba acá y de nuevo en la RPC). Sin versión y
// sin moverla: el estado hace de versión. Revalida la ficha y el inventario (la ficha no tiene nada a medio tipear).
export const marcarNoGanada = actionClient
  .inputSchema(esquemaNoGanada)
  .action(async ({ parsedInput, ctx }) => {
    if (!puedeResolverLaSubasta(ctx.permisos, parsedInput.origenId)) {
      return fallo(
        'sin_permiso',
        'Para resolver la subasta hace falta poder mover de fase en este origen.',
      )
    }
    const hecho = await repositorioDeSituacion.marcarNoGanada(parsedInput)
    // También si falló: tras un conflicto la pantalla quedó vieja.
    revalidatePath(RUTAS.vehiculos)
    revalidatePath(`${RUTAS.vehiculos}/${parsedInput.vehiculoId}`)
    return hecho
  })
