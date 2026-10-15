'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDelPortal } from '../../../composicion'
import type { AccesoOtorgado } from '../../../entities/portal'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaOtorgarPortal } from '../schemas/portal'

// Otorga o vuelve a otorgar el acceso del cliente. La clave (la escrita o la que genera la base) vuelve
// sólo en esta respuesta: nada de acá la escribe en un registro (`logging.serverFunctions` está apagado
// en `next.config.ts` para que el servidor de desarrollo no imprima los argumentos).
export const otorgarPortal = actionClient
  .inputSchema(esquemaOtorgarPortal)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<AccesoOtorgado>> => {
    const resultado = comoResultado(await repositorioDelPortal.otorgar(parsedInput))
    if (resultado.ok) {
      revalidatePath(`${RUTAS.leads}/${parsedInput.leadId}`)
    }
    return resultado
  })
