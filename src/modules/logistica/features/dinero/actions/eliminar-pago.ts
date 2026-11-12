'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePagos } from '../../../areas/dinero/composicion'
import { esquemaDeUnPago } from '../schemas/pago'

// Elimina un pago sin confirmar (borrado suave) con la versión que se tenía en pantalla (6.11-2). Uno confirmado no se elimina: se anula.
export const eliminarPago = actionClient
  .inputSchema(esquemaDeUnPago)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<{ id: string }>> => {
    return repositorioDePagos.eliminar(parsedInput)
  })
