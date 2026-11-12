'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puedeMoverEn } from '../../../entities/mover/para-mover'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMover } from '../../../areas/mover/composicion'
import { esquemaCambiarFase } from '../schemas/mover'
import { comoResultadoDeMover, sinPermisoDeMover } from './resultado'

// Mueve un vehículo a una fase con su nota. Va con la fase en la que se veía (`faseEsperada`): si otra persona lo movió antes, la base responde un conflicto con su nombre. Sin `revalidatePath`:
// la pantalla se repinta con `router.refresh()` del cliente (D12 de 6.04). Los rechazos traen su código como campo (`requisitos`, `rol`, `nota`, `transicion`, `conflicto`, `acceso`).
export const cambiarFase = actionClient
  .inputSchema(esquemaCambiarFase)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ historialId: number }>> => {
    if (!puedeMoverEn(ctx.permisos, parsedInput.origenId)) return sinPermisoDeMover()
    return comoResultadoDeMover(
      await repositorioDeMover.cambiar({
        vehiculoId: parsedInput.vehiculo,
        faseDestino: parsedInput.faseDestino,
        faseEsperada: parsedInput.faseEsperada,
        nota: parsedInput.nota,
      }),
    )
  })
