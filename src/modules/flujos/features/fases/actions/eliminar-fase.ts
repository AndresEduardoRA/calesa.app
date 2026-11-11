'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFases } from '../../../areas/fases/composicion'
import type { RespuestaDeEliminarFase } from '../../../entities/fases/respuestas'
import { esquemaEliminarFase } from '../schemas/fases'
import { comoResultado, motivoSinPermisoDeFases, sinPermisoDeFases } from './resultado'

// Sin unidades ni historial la elimina; con ellos la jubila. La base decide y lo dice en la respuesta.
export const eliminarFase = actionClient
  .inputSchema(esquemaEliminarFase)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeEliminarFase>> => {
    const motivo = motivoSinPermisoDeFases(ctx.permisos, parsedInput.origenId)
    if (motivo !== null) {
      return sinPermisoDeFases(motivo)
    }
    const hecho = comoResultado(await repositorioDeFases.eliminar(parsedInput))
    if (hecho.ok) {
      // La pantalla relee la lista: ninguna RPC la devuelve. Vehículos lee las fases del origen.
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
      revalidatePath(RUTAS.vehiculos, 'layout')
    }
    return hecho
  })
