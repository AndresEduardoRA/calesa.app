'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { alcanceDe } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { leerVehiculo, repositorioVehiculos } from '../../../composicion'
import type { ResultadoDeGuardar } from '../../alta/resultado'
import { esquemaGuardarFechasDeSubasta } from '../schemas/ficha'

// Guarda las fechas de la subasta de un vehículo (A4b) con la versión que tenía en pantalla quien edita: un conflicto dice quién y
// cuándo, y un rechazo de la base vuelve junto a su campo. `vehiculo_guardar` exige `vehiculos.editar` por fila y un origen de subasta.
export const guardarFechasDeSubasta = actionClient
  .inputSchema(esquemaGuardarFechasDeSubasta)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeGuardar<{ actualizadoEn: string }>> => {
    const { vehiculoId, actualizadoEnEsperado, cambios } = parsedInput
    const leido = await leerVehiculo(vehiculoId)
    if (!leido.ok) {
      return leido
    }
    const vehiculo = leido.data
    if (!vehiculo) {
      return fallo('no_encontrado', 'Ese vehículo ya no existe o no tienes acceso.')
    }
    if (alcanceDe(ctx.permisos, 'vehiculos.editar', vehiculo.origenId) === null) {
      return fallo('sin_permiso', 'No tienes permiso para editar este vehículo.')
    }
    const guardado = await repositorioVehiculos.guardarFechasDeSubasta({
      id: vehiculoId,
      actualizadoEnEsperado,
      cambios,
    })
    if (!guardado.ok) {
      const { campo, error } = guardado
      return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
    }
    revalidatePath(RUTAS.vehiculos)
    revalidatePath(`${RUTAS.vehiculos}/${vehiculoId}`)
    return guardado
  })
