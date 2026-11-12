'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFases } from '../../../areas/fases/composicion'
import type { RespuestaDeFase } from '../../../entities/fases/respuestas'
import { esquemaCrearFase } from '../schemas/fases'
import { comoResultado, motivoSinPermisoDeFases, sinPermisoDeFases } from './resultado'

// Crea una fase al final del flujo, con el id del intento y la versión que se tenía en pantalla.
export const crearFase = actionClient
  .inputSchema(esquemaCrearFase)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeFase>> => {
    const motivo = motivoSinPermisoDeFases(ctx.permisos, parsedInput.origenId)
    if (motivo !== null) {
      return sinPermisoDeFases(motivo)
    }
    const hecho = comoResultado(await repositorioDeFases.crear(parsedInput))
    if (hecho.ok) {
      // La pantalla relee la lista: ninguna RPC la devuelve. Vehículos lee las fases del origen.
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
      revalidatePath(RUTAS.vehiculos, 'layout')
    }
    return hecho
  })
