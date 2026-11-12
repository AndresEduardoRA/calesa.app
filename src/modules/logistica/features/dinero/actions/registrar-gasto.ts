'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGastos } from '../../../areas/dinero/composicion'
import type { GastoGuardado } from '../../../entities/dinero/repositorio-de-gastos'
import { esquemaRegistrarGasto } from '../schemas/gasto'

// Registra un gasto de la unidad (6.11-1). El id lo trae el cliente: un reintento no duplica. Lo admite quien puede editar gastos en el origen de la unidad (la base).
// Sin `revalidatePath`: el hueco lleva su propia lista.
export const registrarGasto = actionClient
  .inputSchema(esquemaRegistrarGasto)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<GastoGuardado>> => {
    return repositorioDeGastos.registrar(parsedInput)
  })
