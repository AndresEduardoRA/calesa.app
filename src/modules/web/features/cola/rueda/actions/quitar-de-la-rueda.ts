'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { configurarEnLaRueda as configurarEnLaBase } from '../../../../areas/cola/composicion'
import { MOTIVO_SIN_PERMISO_COLA } from '../../../../entities/cola/rueda'
import { esquemaEnLaRueda } from '../schemas/rueda'

// Quita a alguien de la rueda conservando su cupo, prioridad y orden (`cola_web_configurar` los pisa: llegan los que tenía), para que «Deshacer» la deje
// como estaba. La base repite el permiso.
export const quitarDeLaRueda = actionClient
  .inputSchema(esquemaEnLaRueda)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'web.cola.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_COLA)
    }
    const guardado = await configurarEnLaBase({ ...parsedInput, habilitado: false })
    if (guardado.ok) {
      revalidatePath(RUTAS.configuracionDeColaWeb)
    }
    return guardado
  })
