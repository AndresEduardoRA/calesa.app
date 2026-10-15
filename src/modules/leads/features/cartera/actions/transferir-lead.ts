'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCartera } from '../../../composicion'
import type { RespuestaDeCartera } from '../../../entities/cartera'
import { esquemaTransferirLead } from '../schemas/cartera'
import { comoResultado } from './resultado'

// Pasa el lead a otra persona (el saliente queda compartido). Lleva quién creía que era el dueño: si cambió, la base dice quién lo tiene ahora. La base decide quién puede; acá sólo se vuelve a dibujar la ficha y el listado.
export const transferirLead = actionClient
  .inputSchema(esquemaTransferirLead)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<RespuestaDeCartera>> => {
    const resultado = comoResultado(await repositorioDeCartera.transferir(parsedInput))
    if (resultado.ok && resultado.data.resultado !== 'sin_cambios') {
      revalidatePath(`${RUTAS.leads}/${parsedInput.leadId}`)
      revalidatePath(RUTAS.leads)
    }
    return resultado
  })
