'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { alcanceDe } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { leerVehiculo, repositorioVehiculos } from '../../../composicion'
import { validarVehiculo } from '../../../entities/esquema'
import { fuentesDeValidacion } from '../fuentes'
import { noValido, type ResultadoDeGuardar } from '../resultado'
import { esquemaGuardarVehiculo } from '../schemas/vehiculo'

// Guarda la ficha de un vehículo con la versión que tenía en pantalla quien edita: si otra
// persona lo cambió, la base responde `conflicto` diciendo quién y cuándo, y no se pisa nada.
export const guardarVehiculo = actionClient
  .inputSchema(esquemaGuardarVehiculo)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeGuardar<{ actualizadoEn: string }>> => {
    const { id, actualizadoEnEsperado, valores } = parsedInput
    const leido = await leerVehiculo(id)
    if (!leido.ok) {
      return leido
    }
    const vehiculo = leido.data
    if (!vehiculo) {
      return fallo('no_encontrado', 'Ese vehículo ya no existe o no tienes acceso.')
    }
    // Sin el permiso en ese origen, ni se intenta. Con alcance «propios» decide la base, que sabe
    // además si el vehículo está vinculado a un lead de la cartera de quien edita.
    if (alcanceDe(ctx.permisos, 'vehiculos.editar', vehiculo.origenId) === null) {
      return fallo('sin_permiso', 'No tienes permiso para editar este vehículo.')
    }
    const fuentes = await fuentesDeValidacion(vehiculo.origenId, vehiculo)
    if (!fuentes.ok) {
      return fuentes
    }
    const validacion = validarVehiculo(fuentes.data.fuentes, valores)
    if (!validacion.ok) {
      return noValido(validacion.porCampo)
    }
    const guardado = await repositorioVehiculos.guardar({
      id,
      actualizadoEnEsperado,
      datos: validacion.datos,
    })
    if (!guardado.ok) {
      const { campo, error } = guardado
      return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
    }
    revalidatePath(RUTAS.vehiculos)
    revalidatePath(`${RUTAS.vehiculos}/${id}`)
    return guardado
  })
