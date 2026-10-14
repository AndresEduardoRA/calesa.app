'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioVehiculos } from '../../../composicion'
import { validarVehiculo } from '../../../entities/esquema'
import { fuentesDeValidacion } from '../fuentes'
import { noValido, type ResultadoDeGuardar } from '../resultado'
import { esquemaCrearVehiculo } from '../schemas/vehiculo'

type Creado = { id: string; numero: number; actualizadoEn: string }

// Da de alta un vehículo. El permiso se comprueba acá y de nuevo en `vehiculo_crear`. El layout
// se vuelve a leer y se valida con el mismo esquema que usó el formulario.
export const crearVehiculo = actionClient
  .inputSchema(esquemaCrearVehiculo)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeGuardar<Creado>> => {
    const { id, origenId, valores, consulta } = parsedInput
    if (!puede(ctx.permisos, 'vehiculos.crear', origenId)) {
      return fallo('sin_permiso', 'No tienes permiso para dar de alta en este origen.')
    }
    const leido = await fuentesDeValidacion(origenId, null)
    if (!leido.ok) {
      return leido
    }
    if (!leido.data.origen.activo) {
      return fallo(
        'regla',
        `${leido.data.origen.nombre} está desactivado: no recibe registros nuevos.`,
      )
    }
    const validacion = validarVehiculo(leido.data.fuentes, valores)
    if (!validacion.ok) {
      return noValido(validacion.porCampo)
    }
    if (consulta && leido.data.origen.tipo !== 'subasta') {
      return fallo('regla', 'Sólo un origen de subasta trae datos de una subasta.')
    }
    const creado = await repositorioVehiculos.crear({
      id,
      origenId,
      datos: validacion.datos,
      ...(consulta ? { consulta } : {}),
    })
    if (!creado.ok) {
      const { campo, error } = creado
      return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
    }
    revalidatePath(RUTAS.vehiculos)
    return creado
  })
