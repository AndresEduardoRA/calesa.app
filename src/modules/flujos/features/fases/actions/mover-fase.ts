'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFases } from '../../../areas/fases/composicion'
import type { RespuestaDeFase } from '../../../entities/fases/respuestas'
import { esquemaMoverFase } from '../schemas/fases'
import { comoResultado, motivoSinPermisoDeFases, sinPermisoDeFases } from './resultado'

// La pone después de otra del flujo (nulo = primera). Mover también mueve la versión del flujo.
export const moverFase = actionClient
  .inputSchema(esquemaMoverFase)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeFase>> => {
    const motivo = motivoSinPermisoDeFases(ctx.permisos, parsedInput.origenId)
    if (motivo !== null) {
      return sinPermisoDeFases(motivo)
    }
    const hecho = comoResultado(await repositorioDeFases.mover(parsedInput))
    if (hecho.ok) {
      // La pantalla relee la lista: ninguna RPC la devuelve. Vehículos lee las fases del origen.
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
      revalidatePath(RUTAS.vehiculos, 'layout')
    }
    return hecho
  })
