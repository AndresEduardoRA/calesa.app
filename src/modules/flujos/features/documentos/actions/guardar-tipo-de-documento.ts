'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTiposDeDocumento } from '../../../areas/documentos/composicion'
import type { RespuestaDeEscritura } from '../../../entities/documentos/respuestas'
import { esquemaGuardarTipoDeDocumento } from '../schemas/tipos-de-documento'
import { comoResultado, motivoSinPermisoDelGrupo, sinPermisoDeTipos } from './resultado'

// Guarda lo que cambió, con la versión que se tenía en pantalla.
export const guardarTipoDeDocumento = actionClient
  .inputSchema(esquemaGuardarTipoDeDocumento)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeEscritura>> => {
    const motivo = motivoSinPermisoDelGrupo(ctx.permisos, parsedInput.flujoId)
    if (motivo !== null) {
      return sinPermisoDeTipos(motivo)
    }
    const hecho = comoResultado(await repositorioDeTiposDeDocumento.guardar(parsedInput))
    if (hecho.ok) {
      // La pantalla relee la lista: ninguna RPC la devuelve.
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
