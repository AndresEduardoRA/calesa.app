'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioEmpresa } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { esquemaGuardarIconos } from '../schemas/iconos'

// Deja en los ajustes las rutas de los íconos generados (ya están en Storage), o las quita para
// volver a los neutros. Es la misma fila de los ajustes: misma RPC, misma versión.
export const guardarIconos = actionClient
  .inputSchema(esquemaGuardarIconos)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const { iconos, actualizadoEnEsperado } = parsedInput
    const guardado = await repositorioEmpresa.guardar({
      cambios: { iconos },
      actualizadoEnEsperado,
    })
    if (guardado.ok) {
      // El manifest y los <link> del documento salen de los ajustes.
      revalidatePath(RUTAS.inicio, 'layout')
    }
    return guardado
  })
