'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePagos } from '../../../areas/dinero/composicion'
import { esquemaAnularPago } from '../schemas/pago'

// Anula un pago confirmado con un motivo de 1 a 500 letras (6.11-2). La base rechaza si la fase actual pide pagos confirmados y la anulación la deja sin cumplir.
export const anularPago = actionClient
  .inputSchema(esquemaAnularPago)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<{ id: string }>> => {
    return repositorioDePagos.anular(parsedInput)
  })
