'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeMover } from '../../../areas/mover/composicion'
import type { VistaPreviaDeUnaUnidad } from '../../../entities/mover/vista-previa'
import { esquemaPrevisualizarCambioLote } from '../schemas/mover'

// La vista previa de hasta 200 unidades hacia una fase, en una llamada y en el orden pedido. Cada unidad dice por sí misma si puede entrar y qué le falta.
export const previsualizarCambioLote = actionClient
  .inputSchema(esquemaPrevisualizarCambioLote)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<VistaPreviaDeUnaUnidad[]>> => {
    const lectura = await repositorioDeMover.previsualizarLote({
      vehiculos: parsedInput.vehiculos,
      faseDestino: parsedInput.fase,
    })
    return lectura.ok ? lectura : { ok: false, error: lectura.error }
  })
