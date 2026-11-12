'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePagos } from '../../../areas/dinero/composicion'
import type { PagoGuardado } from '../../../entities/dinero/repositorio-de-pagos'
import { esquemaGuardarPago } from '../schemas/pago'

// Corrige un pago sin confirmar con la versión que se tenía en pantalla (6.11-2): si otra persona lo cambió o ya lo confirmó, la base responde `PT409`.
export const guardarPago = actionClient
  .inputSchema(esquemaGuardarPago)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<PagoGuardado>> => {
    return repositorioDePagos.guardar(parsedInput)
  })
