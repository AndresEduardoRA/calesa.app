'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { leerVehiculo, repositorioDeLimpieza } from '../../../composicion'
import { esquemaConservar } from '../schemas/conservar'

// Marca o desmarca «Conservar»: la limpieza automática no toca lo marcado. Lo hace quien puede
// editar el vehículo (se comprueba acá y de nuevo en la RPC). No lleva la versión de la ficha ni
// la mueve: la marca es de otra tabla, así que no le da un conflicto a quien la está editando.
export const conservarVehiculo = actionClient
  .inputSchema(esquemaConservar)
  .action(async ({ parsedInput, ctx }) => {
    const leido = await leerVehiculo(parsedInput.vehiculoId)
    if (!leido.ok) {
      return leido
    }
    if (!leido.data) {
      return fallo('no_encontrado', 'Ese vehículo ya no existe o no tienes acceso.')
    }
    if (!puede(ctx.permisos, 'vehiculos.editar', leido.data.origenId)) {
      return fallo('sin_permiso', 'No tienes permiso para editar este vehículo.')
    }
    const hecho = await repositorioDeLimpieza.conservar(parsedInput)
    // También si falló: tras un conflicto la pantalla quedó vieja.
    revalidatePath(RUTAS.vehiculos)
    revalidatePath(`${RUTAS.vehiculos}/${parsedInput.vehiculoId}`)
    return hecho
  })
