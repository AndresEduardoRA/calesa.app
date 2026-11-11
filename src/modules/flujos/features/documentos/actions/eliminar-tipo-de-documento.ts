'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTiposDeDocumento } from '../../../areas/documentos/composicion'
import type { RespuestaDeEliminar } from '../../../entities/documentos/tipo-de-documento'
import { esquemaEliminarTipoDeDocumento } from '../schemas/tipos-de-documento'
import { comoResultado, motivoSinPermisoDelGrupo, sinPermisoDeTipos } from './resultado'

// Sin uso lo borra; con uso lo desactiva y dice cuántos documentos y requisitos lo usan.
export const eliminarTipoDeDocumento = actionClient
  .inputSchema(esquemaEliminarTipoDeDocumento)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeEliminar>> => {
    const motivo = motivoSinPermisoDelGrupo(ctx.permisos, parsedInput.flujoId)
    if (motivo !== null) {
      return sinPermisoDeTipos(motivo)
    }
    const hecho = comoResultado(await repositorioDeTiposDeDocumento.eliminar(parsedInput))
    if (hecho.ok) {
      // La pantalla relee la lista: ninguna RPC la devuelve.
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
