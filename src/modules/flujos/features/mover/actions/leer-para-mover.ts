'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_INESPERADO } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMover } from '../../../areas/mover/composicion'
import {
  puedeMoverEn,
  puedeMoverUnRepuesto,
  TOPE_DE_DESTINOS,
  type DestinoConVista,
  type ParaMover,
} from '../../../entities/mover/para-mover'
import { esquemaLeerParaMover } from '../schemas/mover'

// Todo lo que el hueco «Qué falta» muestra de una unidad en una lectura: dónde está, a dónde puede ir y, por cada destino, su vista previa (hasta `TOPE_DE_DESTINOS` llamadas en paralelo: son las
// salidas de una fase, configuración y no una lista que crece). La vista de un destino que no se pudo leer no tumba a los demás: dice su error. Lo que cada cuenta ve lo decide la base.
export const leerParaMover = actionClient
  .inputSchema(esquemaLeerParaMover)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ParaMover>> => {
    const { unidad: aMover, origenId } = parsedInput
    const repositorio = repositorioDeMover
    const unidad = await repositorio.leerUnidad(aMover)
    if (!unidad.ok) return unidad
    const leidos = await repositorio.leerDestinos({
      ambito:
        aMover.tipo === 'vehiculo' && origenId !== null
          ? { tipo: 'vehiculo', origenId }
          : { tipo: 'repuesto' },
      faseId: unidad.data.faseId,
      tope: TOPE_DE_DESTINOS,
    })
    if (!leidos.ok) return leidos
    const destinos: DestinoConVista[] = await Promise.all(
      leidos.data.destinos.map(async (destino) => {
        const vista = await repositorio.previsualizar({
          unidad: aMover,
          faseDestino: destino.faseId,
        })
        return vista.ok
          ? { ...destino, vista: vista.data, errorDeLaVista: null }
          : { ...destino, vista: null, errorDeLaVista: vista.error.mensaje || MENSAJE_INESPERADO }
      }),
    )
    return {
      ok: true,
      data: {
        faseActualId: unidad.data.faseId,
        fueraDeRegla: unidad.data.fueraDeRegla ? unidad.data.faltanEnSuFase : [],
        destinos,
        puedeMover:
          aMover.tipo === 'vehiculo' && origenId !== null
            ? puedeMoverEn(ctx.permisos, origenId)
            : aMover.tipo === 'repuesto' && puedeMoverUnRepuesto(ctx.permisos),
        hayMasDestinos: leidos.data.hayMas,
      },
    }
  })
