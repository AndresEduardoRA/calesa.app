'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { puedeMoverEn } from '../../../entities/mover/para-mover'
import { repositorioDeMover } from '../../../areas/mover/composicion'
import { esquemaGanarLaSubasta } from '../schemas/mover'
import { comoResultadoDeMover, sinPermisoDeMover } from './resultado'

// «La ganamos»: mover un vehículo cuya subasta está sin resolver a una fase que no es la subasta y anotarla ganada, en una transacción
// (`vehiculo_subasta_ganada`, que llama a `cambiar_fase`). Como `cambiarFase`: `puedeMoverEn` por comodidad (la base vuelve a decidir, también
// `logistica.ver`), sin `revalidatePath` y con los rechazos como campo (`conflicto`, `requisitos`, `rol`, `nota`, `transicion`, `acceso`, `permiso`).
export const ganarLaSubasta = actionClient
  .inputSchema(esquemaGanarLaSubasta)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ historialId: number }>> => {
    if (!puedeMoverEn(ctx.permisos, parsedInput.origenId)) return sinPermisoDeMover()
    return comoResultadoDeMover(
      await repositorioDeMover.ganarLaSubasta({
        vehiculoId: parsedInput.vehiculo,
        faseDestino: parsedInput.faseDestino,
        faseEsperada: parsedInput.faseEsperada,
        nota: parsedInput.nota,
      }),
    )
  })
