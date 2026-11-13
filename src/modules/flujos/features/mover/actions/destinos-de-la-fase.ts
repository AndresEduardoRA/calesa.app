'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMover } from '../../../areas/mover/composicion'
import {
  puedeMoverEn,
  TOPE_DE_DESTINOS,
  type DestinoDeMover,
} from '../../../entities/mover/para-mover'
import { esquemaDestinosDeLaFase } from '../schemas/mover'
import { sinPermisoDeMover } from './resultado'

// A dónde se puede mover desde una fase (6.04-3): las salidas de la fase, sin vista previa (un lote elige la fase y revisa a sus unidades con `previsualizarCambioLote`). Son configuración,
// no una lista que crece: hasta `TOPE_DE_DESTINOS`.
export const destinosDeLaFase = actionClient
  .inputSchema(esquemaDestinosDeLaFase)
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<ResultadoDeAccion<{ destinos: DestinoDeMover[]; hayMas: boolean }>> => {
      if (!puedeMoverEn(ctx.permisos, parsedInput.origenId)) return sinPermisoDeMover()
      return repositorioDeMover.leerDestinos({
        ambito: { tipo: 'vehiculo', origenId: parsedInput.origenId },
        faseId: parsedInput.faseId,
        tope: TOPE_DE_DESTINOS,
      })
    },
  )
