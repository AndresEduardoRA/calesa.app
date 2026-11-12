'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMover } from '../../../areas/mover/composicion'
import type { VistaPrevia } from '../../../entities/mover/vista-previa'
import { esquemaPrevisualizarCambio } from '../schemas/mover'

// La vista previa de una unidad hacia una fase (`previsualizar_cambio_fase`): para releer el motivo junto al botón tras un rechazo. Quien no ve la unidad recibe `acceso`.
export const previsualizarCambio = actionClient
  .inputSchema(esquemaPrevisualizarCambio)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<VistaPrevia>> => {
    const lectura = await repositorioDeMover.previsualizar({
      vehiculoId: parsedInput.vehiculo,
      faseDestino: parsedInput.faseDestino,
    })
    return lectura.ok ? lectura : { ok: false, error: lectura.error }
  })
