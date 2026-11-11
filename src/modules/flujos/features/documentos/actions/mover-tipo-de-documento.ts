'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTiposDeDocumento } from '../../../areas/documentos/composicion'
import type { RespuestaDeEscritura } from '../../../entities/documentos/respuestas'
import { esquemaMoverTipoDeDocumento } from '../schemas/tipos-de-documento'
import { comoResultado, motivoSinPermisoDelGrupo, sinPermisoDeTipos } from './resultado'

// Lo pone después de otro de su grupo (nulo = primero). Ordenar no mueve la versión.
export const moverTipoDeDocumento = actionClient
  .inputSchema(esquemaMoverTipoDeDocumento)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeEscritura>> => {
    const motivo = motivoSinPermisoDelGrupo(ctx.permisos, parsedInput.flujoId)
    if (motivo !== null) {
      return sinPermisoDeTipos(motivo)
    }
    const hecho = comoResultado(await repositorioDeTiposDeDocumento.mover(parsedInput))
    if (hecho.ok) {
      // La pantalla relee la lista: ninguna RPC la devuelve.
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
