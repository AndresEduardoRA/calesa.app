'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePapeleraDeLeads } from '../../../composicion'
import type { ResultadoDeRestaurar } from '../../../entities/papelera'
import { esquemaSobreUnLote } from '../schemas/papelera'

// Restaura un lote, entero o por partes, con la versión del lote que había en pantalla. Lo que choca
// con un teléfono que ya tomó otro lead sigue adentro, con el motivo. Lo restaura quien lo envió o
// quien puede vaciar la papelera: la base lo decide.
export const restaurarLeadsDePapelera = actionClient
  .inputSchema(esquemaSobreUnLote)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeRestaurar>> => {
    const resultado = await repositorioDePapeleraDeLeads.restaurar(parsedInput)
    if (resultado.ok) {
      revalidatePath(RUTAS.leads, 'layout')
    }
    return resultado
  })
