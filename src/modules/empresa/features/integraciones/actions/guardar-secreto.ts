'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioIntegraciones } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { esquemaGuardarSecreto } from '../schemas/integraciones'

// Guarda o reemplaza el secreto de una integración. Va a Vault con la sesión de quien lo carga y
// de acá no vuelve: la respuesta es la versión nueva de la integración. No se registra en el log.
export const guardarSecreto = actionClient
  .inputSchema(esquemaGuardarSecreto)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const guardado = await repositorioIntegraciones.guardarSecreto(parsedInput)
    if (guardado.ok) {
      revalidatePath(RUTAS.empresa)
    }
    return guardado
  })
