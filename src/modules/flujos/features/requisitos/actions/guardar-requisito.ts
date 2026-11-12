'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRequisitos } from '../../../areas/requisitos/composicion'
import type { VersionNueva } from '../../../entities/requisitos/respuestas'
import { esquemaGuardarRequisito } from '../schemas/requisitos'
import { comoResultado, motivoSinPermisoDeRequisitos, sinPermisoDeRequisitos } from './resultado'

// Guarda lo que cambió de un requisito (`null` vacía el campo). `bloqueante` lo manda el interruptor de la fila, después de su aviso de impacto.
export const guardarRequisito = actionClient
  .inputSchema(esquemaGuardarRequisito)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<VersionNueva>> => {
    const motivo = motivoSinPermisoDeRequisitos(ctx.permisos, parsedInput.ambito)
    if (motivo !== null) {
      return sinPermisoDeRequisitos(motivo)
    }
    const { ambito: _ambito, ...pedido } = parsedInput
    const hecho = comoResultado(await repositorioDeRequisitos.guardar(pedido))
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    }
    return hecho
  })
