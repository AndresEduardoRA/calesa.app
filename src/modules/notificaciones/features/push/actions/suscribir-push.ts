'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePush } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_PUSH } from '../../../entities/motivos'
import { esquemaSuscribirPush } from '../schemas/push'

// Guardar la suscripción de este navegador. La base exige `notificaciones.push` igual; se mira antes para no ir a la RPC.
// Sin `revalidatePath`: la sección vuelve a leer sus navegadores con su propio `router.refresh()`.
export const suscribirPush = actionClient
  .inputSchema(esquemaSuscribirPush)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'notificaciones.push')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PUSH)
    }
    return repositorioDePush.suscribir(parsedInput)
  })
