'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCartera } from '../../../composicion'
import type { RespuestaDeCartera } from '../../../entities/cartera'
import { esquemaQuitarAcceso } from '../schemas/cartera'
import { comoResultado } from './resultado'

// Quita el acceso de un compartido. Al dueño no se le quita: se transfiere. La base decide quién puede; acá sólo se vuelve a dibujar la ficha y el listado.
export const quitarAcceso = actionClient
  .inputSchema(esquemaQuitarAcceso)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<RespuestaDeCartera>> => {
    const resultado = comoResultado(await repositorioDeCartera.revocar(parsedInput))
    if (resultado.ok && resultado.data.resultado !== 'sin_cambios') {
      revalidatePath(`${RUTAS.leads}/${parsedInput.leadId}`)
      revalidatePath(RUTAS.leads)
    }
    return resultado
  })
