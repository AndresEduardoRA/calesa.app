'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDelPortal } from '../../../composicion'
import { comoResultado } from '../../marcas/actions/resultado'
import { esquemaLeadDelPortal } from '../schemas/portal'

// Revoca el acceso del cliente: el código deja de valer y su sesión se cierra. Idempotente.
export const revocarPortal = actionClient
  .inputSchema(esquemaLeadDelPortal)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<null>> => {
    const resultado = comoResultado(await repositorioDelPortal.revocar(parsedInput.leadId))
    if (resultado.ok) {
      revalidatePath(`${RUTAS.leads}/${parsedInput.leadId}`)
    }
    return resultado
  })
