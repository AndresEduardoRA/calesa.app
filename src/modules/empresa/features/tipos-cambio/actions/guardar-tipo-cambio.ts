'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioTiposCambio } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import { esquemaGuardarTipoCambio } from '../schemas/tipos-cambio'

// Cambiar el valor (lo de todos los días), el nombre, si está activo o si es el por defecto. El
// valor anterior queda en el historial por un trigger; las cotizaciones guardadas no se mueven.
export const guardarTipoCambio = actionClient
  .inputSchema(esquemaGuardarTipoCambio)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.tipos_cambio.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_TIPOS_CAMBIO)
    }
    const guardado = await repositorioTiposCambio.guardar(parsedInput)
    if (guardado.ok) {
      // Los tipos de cambio vigentes están en la barra superior de toda la app.
      revalidatePath(RUTAS.inicio, 'layout')
    }
    return guardado
  })
