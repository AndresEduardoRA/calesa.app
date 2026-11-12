'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGastos } from '../../../areas/dinero/composicion'
import type { GastoProrrateado } from '../../../entities/dinero/repositorio-de-gastos'
import { esquemaProrratearGasto } from '../schemas/gasto'

// Reparte un gasto en partes iguales entre las unidades de un grupo (6.11-4). El lote lo trae el cliente: un reintento devuelve lo ya repartido. La base pide `logistica.gastos.editar` por cada
// unidad y escribe todo o nada. Sin `revalidatePath`: los huecos de una unidad abierta se releen por el evento del navegador.
export const prorratearGasto = actionClient
  .inputSchema(esquemaProrratearGasto)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<GastoProrrateado>> => {
    return repositorioDeGastos.prorratear(parsedInput)
  })
