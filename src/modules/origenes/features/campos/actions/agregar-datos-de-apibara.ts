'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaAgregarDatosDeApibara } from '../schemas/datos-nuevos'

// Un campo por cada dato nuevo que trajo apibara: nace activo, sin tocar los vehículos que ya
// están (se llena desde el próximo alta o refresco), con la ruta como nombre para renombrarlo.
export const agregarDatosDeApibara = actionClient
  .inputSchema(esquemaAgregarDatosDeApibara)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const agregados = await repositorioCampos.agregarDeApibara(parsedInput)
    if (agregados.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return agregados
  })
