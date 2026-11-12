'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePagos } from '../../../areas/dinero/composicion'
import type { PagoConfirmado } from '../../../entities/dinero/repositorio-de-pagos'
import { esquemaDeUnPago } from '../schemas/pago'

// Confirma un pago (6.11-2): lo sella. Pide `logistica.pagos.confirmar` y ver el pago (la base); quién y cuándo los pone la base, no el cliente.
export const confirmarPago = actionClient
  .inputSchema(esquemaDeUnPago)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<PagoConfirmado>> => {
    return repositorioDePagos.confirmar(parsedInput)
  })
