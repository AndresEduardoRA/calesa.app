'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioVehiculos } from '../../../composicion'
import { PERMISO_DE_ALTA } from '../../../entities/permisos'
import { esquemaBuscarRepetidos } from '../schemas/repetidos'

// Antes de mostrar lo que trajo apibara: cuáles ya están en el inventario. La RLS decide si quien
// pregunta ve a quien lo tiene: si no, sabe que existe y nada más.
export const buscarRepetidos = actionClient
  .inputSchema(esquemaBuscarRepetidos)
  .action(async ({ parsedInput, ctx }) => {
    // Antes de un alta, suelta o desde la hoja de cotizar: vale cualquiera de las dos.
    const { origenId } = parsedInput
    if (
      !puede(ctx.permisos, PERMISO_DE_ALTA.suelto, origenId) &&
      !puede(ctx.permisos, PERMISO_DE_ALTA.cotizar, origenId)
    ) {
      return fallo('sin_permiso', 'No tienes permiso para dar de alta en este origen.')
    }
    return repositorioVehiculos.repetidos(parsedInput)
  })
