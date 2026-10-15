'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDelPortal } from '../../../composicion'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaLeadDelPortal } from '../schemas/portal'

// Desbloquea el acceso tras cinco intentos fallidos: el cliente puede volver a intentar ya. Idempotente.
export const desbloquearPortal = actionClient
  .inputSchema(esquemaLeadDelPortal)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<null>> => {
    const resultado = comoResultado(await repositorioDelPortal.desbloquear(parsedInput.leadId))
    if (resultado.ok) {
      revalidatePath(`${RUTAS.leads}/${parsedInput.leadId}`)
    }
    return resultado
  })
