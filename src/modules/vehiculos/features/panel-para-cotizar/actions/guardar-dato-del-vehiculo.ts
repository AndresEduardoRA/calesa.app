'use server'

import { revalidatePath } from 'next/cache'
import { esquemaDeValor, type Dato } from '@/shared/lib/campos'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { alcanceDe } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { leerVehiculo, repositorioVehiculos } from '../../../composicion'
import { campoQueSeElige } from '../../../entities/dato-para-elegir'
import type { Fuentes } from '../../../entities/esquema'
import { fuentesDeValidacion } from '../../alta/fuentes'
import { esquemaGuardarDatoDelVehiculo } from '../schemas/dato-del-vehiculo'

const SE_ESCRIBE_EN_LA_FICHA = 'Este dato se escribe en la ficha del vehículo.'

// El campo tiene que ser uno que el panel ofrece (activo, de texto) y el valor pasa su esquema, el de la ficha.
function datoElegido(
  fuentes: Fuentes,
  campo: string,
  valor: string,
  guardado: unknown,
): Resultado<Dato> {
  const delLayout = fuentes.campos.find((uno) => uno.clave === campo)
  if (!delLayout || !campoQueSeElige(delLayout)) {
    return fallo('validacion', SE_ESCRIBE_EN_LA_FICHA)
  }
  const { locale, zona } = fuentes
  const leido = esquemaDeValor(delLayout, { locale, zona, guardado }).safeParse(valor)
  if (!leido.success || leido.data === null) {
    return fallo('validacion', leido.error?.issues[0]?.message ?? 'Ese valor no vale.')
  }
  return ok(leido.data)
}

// Guarda en el vehículo el dato elegido en el panel de la hoja de cotizar (4.14-2c3), sólo ese atributo y con la versión que tenía en pantalla: la base lo funde con los demás
// (`vehiculo_guardar`, que vuelve a exigir `vehiculos.editar` por fila).
export const guardarDatoDelVehiculo = actionClient
  .inputSchema(esquemaGuardarDatoDelVehiculo)
  .action(async ({ parsedInput, ctx }): Promise<Resultado<{ actualizadoEn: string }>> => {
    const { id, actualizadoEnEsperado, campo, valor } = parsedInput
    const leido = await leerVehiculo(id)
    if (!leido.ok) {
      return leido
    }
    const vehiculo = leido.data
    if (!vehiculo) {
      return fallo('no_encontrado', 'Ese vehículo ya no existe o no tienes acceso.')
    }
    // Sin el permiso en ese origen, ni se intenta. Con alcance «propios» decide la base.
    if (alcanceDe(ctx.permisos, 'vehiculos.editar', vehiculo.origenId) === null) {
      return fallo('sin_permiso', 'No tienes permiso para editar este vehículo.')
    }
    const fuentes = await fuentesDeValidacion(vehiculo.origenId, vehiculo)
    if (!fuentes.ok) {
      return fuentes
    }
    const dato = datoElegido(fuentes.data.fuentes, campo, valor, vehiculo.atributos[campo])
    if (!dato.ok) {
      return dato
    }
    const guardado = await repositorioVehiculos.guardar({
      id,
      actualizadoEnEsperado,
      datos: { comunes: {}, atributos: { [campo]: dato.data } },
    })
    if (!guardado.ok) {
      return { ok: false, error: guardado.error }
    }
    revalidatePath(RUTAS.vehiculos)
    revalidatePath(`${RUTAS.vehiculos}/${id}`)
    return guardado
  })
