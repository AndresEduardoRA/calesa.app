'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePagos } from '../../../areas/dinero/composicion'
import type { PagoGuardado } from '../../../entities/dinero/repositorio-de-pagos'
import { esquemaRegistrarPago } from '../schemas/pago'

// Registra un pago de la unidad (6.11-2). El id lo trae el cliente: un reintento no duplica. Lo admite quien puede editar pagos en el origen de la unidad (la base). Sin `revalidatePath`: el hueco lleva su propia lista.
export const registrarPago = actionClient
  .inputSchema(esquemaRegistrarPago)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<PagoGuardado>> => {
    return repositorioDePagos.registrar(parsedInput)
  })
