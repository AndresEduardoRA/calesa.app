'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioIntegraciones } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { esquemaGuardarWebPublica } from '../schemas/integraciones'

// Prender o apagar la web pública, o cambiar su dirección de revalidación. Encender no exige
// dirección ni secreto: sin ellos, la base no avisa al sitio y no pierde lo pendiente.
export const guardarWebPublica = actionClient
  .inputSchema(esquemaGuardarWebPublica)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const { actualizadoEnEsperado, activa, revalidarUrl } = parsedInput
    const guardada = await repositorioIntegraciones.guardar({
      clave: 'web_publica',
      actualizadoEnEsperado,
      activa,
      // Con la configuración viaja siempre `revalidar_url`: sin ella, la base la borra.
      config: revalidarUrl === undefined ? undefined : { revalidar_url: revalidarUrl },
    })
    if (guardada.ok) {
      revalidatePath(RUTAS.empresa)
    }
    return guardada
  })
