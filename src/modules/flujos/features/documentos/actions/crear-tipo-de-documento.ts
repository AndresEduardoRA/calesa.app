'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTiposDeDocumento } from '../../../areas/documentos/composicion'
import type { RespuestaDeEscritura } from '../../../entities/documentos/respuestas'
import { esquemaCrearTipoDeDocumento } from '../schemas/tipos-de-documento'
import { comoResultado, motivoSinPermisoDelGrupo, sinPermisoDeTipos } from './resultado'

// Crea uno al final de su grupo, con el id del intento: repetirlo devuelve el mismo.
export const crearTipoDeDocumento = actionClient
  .inputSchema(esquemaCrearTipoDeDocumento)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeEscritura>> => {
    const motivo = motivoSinPermisoDelGrupo(ctx.permisos, parsedInput.flujoId)
    if (motivo !== null) {
      return sinPermisoDeTipos(motivo)
    }
    const hecho = comoResultado(await repositorioDeTiposDeDocumento.crear(parsedInput))
    if (hecho.ok) {
      // La pantalla relee la lista: ninguna RPC la devuelve.
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
