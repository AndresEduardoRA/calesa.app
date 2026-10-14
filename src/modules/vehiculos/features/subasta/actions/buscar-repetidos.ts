'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioVehiculos } from '../../../composicion'
import { esquemaBuscarRepetidos } from '../schemas/repetidos'

// Antes de mostrar lo que trajo apibara: cuáles ya están en el inventario. La RLS decide si quien
// pregunta ve a quien lo tiene: si no, sabe que existe y nada más.
export const buscarRepetidos = actionClient
  .inputSchema(esquemaBuscarRepetidos)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'vehiculos.crear', parsedInput.origenId)) {
      return fallo('sin_permiso', 'No tienes permiso para dar de alta en este origen.')
    }
    return repositorioVehiculos.repetidos(parsedInput)
  })
