'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioTiposCambio } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import { esquemaGuardarMoneda } from '../schemas/tipos-cambio'

// El código no cambia: lo referencian los montos. La base no deja desactivar la moneda base ni
// una que use un tipo de cambio activo.
export const guardarMoneda = actionClient
  .inputSchema(esquemaGuardarMoneda)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.tipos_cambio.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_TIPOS_CAMBIO)
    }
    const guardada = await repositorioTiposCambio.guardarMoneda(parsedInput)
    if (guardada.ok) {
      // El símbolo y los decimales de una moneda se ven en los montos de toda la app.
      revalidatePath(RUTAS.inicio, 'layout')
    }
    return guardada
  })
