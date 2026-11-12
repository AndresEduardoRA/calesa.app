'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioIntegraciones } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { esquemaGuardarPushWeb } from '../schemas/integraciones'

// Prender o apagar los avisos push de la empresa. Encender no exige la clave pública: sin ella nadie puede activar el aviso
// en su navegador, y la tarjeta lo dice. Cada persona lo enciende en su perfil.
export const guardarPushWeb = actionClient
  .inputSchema(esquemaGuardarPushWeb)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const guardada = await repositorioIntegraciones.guardar({
      clave: 'push_web',
      actualizadoEnEsperado: parsedInput.actualizadoEnEsperado,
      activa: parsedInput.activa,
    })
    if (guardada.ok) {
      revalidatePath(RUTAS.empresa)
    }
    return guardada
  })
