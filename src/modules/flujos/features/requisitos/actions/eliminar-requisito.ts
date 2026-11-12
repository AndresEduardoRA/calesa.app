'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRequisitos } from '../../../areas/requisitos/composicion'
import type { VersionNueva } from '../../../entities/requisitos/respuestas'
import { esquemaEliminarRequisito } from '../schemas/requisitos'
import { comoResultado, motivoSinPermisoDeRequisitos, sinPermisoDeRequisitos } from './resultado'

// Quita un requisito de su fase. Es irreversible: la pantalla lo confirma antes.
export const eliminarRequisito = actionClient
  .inputSchema(esquemaEliminarRequisito)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<VersionNueva>> => {
    const motivo = motivoSinPermisoDeRequisitos(ctx.permisos, parsedInput.ambito)
    if (motivo !== null) {
      return sinPermisoDeRequisitos(motivo)
    }
    const { ambito: _ambito, ...pedido } = parsedInput
    const hecho = comoResultado(await repositorioDeRequisitos.eliminar(pedido))
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
