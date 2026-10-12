'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioIntegraciones } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { esquemaGuardarApibara } from '../schemas/integraciones'

// Prender o apagar apibara, o cambiar su configuración no secreta. La base no la deja activa sin
// su clave guardada.
export const guardarApibara = actionClient
  .inputSchema(esquemaGuardarApibara)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const { actualizadoEnEsperado, activa, endpoint, plataformas } = parsedInput
    const guardada = await repositorioIntegraciones.guardar({
      clave: 'apibara',
      actualizadoEnEsperado,
      activa,
      // Sólo lo que este schema conoce: una clave de más en la configuración no llega a la base.
      config: endpoint && plataformas ? { endpoint, plataformas } : undefined,
    })
    if (guardada.ok) {
      revalidatePath(RUTAS.empresa)
    }
    return guardada
  })
