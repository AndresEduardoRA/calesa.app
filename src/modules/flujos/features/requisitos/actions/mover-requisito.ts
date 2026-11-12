'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRequisitos } from '../../../areas/requisitos/composicion'
import type { VersionNueva } from '../../../entities/requisitos/respuestas'
import { esquemaMoverRequisito } from '../schemas/requisitos'
import { comoResultado, motivoSinPermisoDeRequisitos, sinPermisoDeRequisitos } from './resultado'

// Lo pone después de otro de su fase (nulo = primero).
export const moverRequisito = actionClient
  .inputSchema(esquemaMoverRequisito)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<VersionNueva>> => {
    const motivo = motivoSinPermisoDeRequisitos(ctx.permisos, parsedInput.ambito)
    if (motivo !== null) {
      return sinPermisoDeRequisitos(motivo)
    }
    const { ambito: _ambito, ...pedido } = parsedInput
    const hecho = comoResultado(await repositorioDeRequisitos.mover(pedido))
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
