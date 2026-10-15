'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCartera } from '../../../composicion'
import type { RespuestaDeCartera } from '../../../entities/cartera'
import { esquemaCompartirLead } from '../schemas/cartera'
import { comoResultado } from './resultado'

// Comparte el lead con otra persona: es la que se da acceso a un lead; no pide el permiso de editarlo. La base decide quién puede; acá sólo se vuelve a dibujar la ficha y el listado.
export const compartirLead = actionClient
  .inputSchema(esquemaCompartirLead)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<RespuestaDeCartera>> => {
    const resultado = comoResultado(await repositorioDeCartera.compartir(parsedInput))
    if (resultado.ok && resultado.data.resultado !== 'sin_cambios') {
      revalidatePath(`${RUTAS.leads}/${parsedInput.leadId}`)
      revalidatePath(RUTAS.leads)
    }
    return resultado
  })
