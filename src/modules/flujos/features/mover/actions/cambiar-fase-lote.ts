'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMover } from '../../../areas/mover/composicion'
import { puedeMoverEn } from '../../../entities/mover/para-mover'
import type { FilaDelLote } from '../../../entities/mover/vista-previa'
import { esquemaCambiarFaseLote } from '../schemas/mover'
import { comoResultadoDeMover, sinPermisoDeMover } from './resultado'

// Mueve hasta 200 vehículos a una fase con una nota común. Cada uno va con la fase en la que se veía y se resuelve por sí mismo: la respuesta trae una fila por unidad, en el orden del pedido,
// con su código y su motivo si no pasó (resultado parcial, no todo o nada). Un lote mal formado no mueve nada.
export const cambiarFaseLote = actionClient
  .inputSchema(esquemaCambiarFaseLote)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<FilaDelLote[]>> => {
    if (!puedeMoverEn(ctx.permisos, parsedInput.origenId)) return sinPermisoDeMover()
    return comoResultadoDeMover(
      await repositorioDeMover.cambiarLote({
        unidades: parsedInput.unidades.map((u) => ({
          vehiculoId: u.vehiculo,
          faseEsperada: u.faseEsperada,
        })),
        faseDestino: parsedInput.faseDestino,
        nota: parsedInput.nota,
      }),
    )
  })
