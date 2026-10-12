'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioEmpresa } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { esquemaAjustes } from '../schemas/ajustes'

// Guarda marca, datos legales, región y políticas de una vez. La base repite el permiso, compara
// la versión (`PT409`) y cuida la moneda base (`empresa_guardar_ajustes`).
export const guardarAjustes = actionClient
  .inputSchema(esquemaAjustes)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const { actualizadoEnEsperado, ...cambios } = parsedInput
    const guardado = await repositorioEmpresa.guardar({ cambios, actualizadoEnEsperado })
    if (guardado.ok) {
      // Nombre, logo, color y zona horaria están en el marco de toda la app.
      revalidatePath(RUTAS.inicio, 'layout')
    }
    return guardado
  })
