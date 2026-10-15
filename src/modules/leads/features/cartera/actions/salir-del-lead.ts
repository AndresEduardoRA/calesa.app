'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCartera } from '../../../composicion'
import type { RespuestaDeCartera } from '../../../entities/cartera'
import { esquemaSalirDelLead } from '../schemas/cartera'
import { comoResultado } from './resultado'

// Quien lo tiene compartido se sale. El dueño no: lo transfiere antes. La base decide quién puede; acá sólo se vuelve a dibujar la ficha y el listado.
export const salirDelLead = actionClient
  .inputSchema(esquemaSalirDelLead)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<RespuestaDeCartera>> => {
    const resultado = comoResultado(await repositorioDeCartera.salir(parsedInput))
    if (resultado.ok && resultado.data.resultado !== 'sin_cambios') {
      revalidatePath(`${RUTAS.leads}/${parsedInput.leadId}`)
      revalidatePath(RUTAS.leads)
    }
    return resultado
  })
