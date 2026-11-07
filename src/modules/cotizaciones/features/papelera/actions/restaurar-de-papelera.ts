'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePapeleraDeCotizaciones } from '../../../areas/papelera/composicion'
import { RUTA_DEL_LISTADO } from '../../../entities/ruta-de-la-hoja'
import type { ResultadoDeRestaurar } from '../../../entities/papelera/resultados'
import { esquemaSobreUnLote } from '../schemas/papelera'

// Restaura un lote, entero o por partes, con la versión del lote que había en pantalla. Lo que choca (una versión nueva cuando ya hay otra, un vehículo en la
// papelera…) sigue adentro, con el motivo. Lo restaura quien lo envió o quien puede vaciar la papelera: la base lo decide, como en leads.
export const restaurarCotizacionesDePapelera = actionClient
  .inputSchema(esquemaSobreUnLote)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeRestaurar>> => {
    const resultado = await repositorioDePapeleraDeCotizaciones.restaurar(parsedInput)
    if (resultado.ok) {
      // El listado, la guardada y la papelera misma (todo bajo `/cotizaciones`) ven lo restaurado.
      revalidatePath(RUTA_DEL_LISTADO, 'layout')
    }
    return resultado
  })
