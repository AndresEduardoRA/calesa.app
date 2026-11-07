'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePapeleraDeCotizaciones } from '../../../areas/papelera/composicion'
import { puedeEnviarCotizacionesALaPapelera } from '../../../entities/papelera/acceso'
import type { ResultadoDeEnvio } from '../../../entities/papelera/resultados'
import { RUTA_DEL_LISTADO } from '../../../entities/ruta-de-la-hoja'
import { esquemaEnviarAPapelera } from '../schemas/papelera'

// Envía cotizaciones a la papelera (4.24-3), cada una con la versión que estaba en pantalla. La base decide cuál puede (verla antes del candado, el permiso de su
// clase, la versión) y deja en `rechazados` la que no, con su motivo. Sin editar, moderar ni gestionar finales en algún origen no se llama a la base.
export const enviarCotizacionesAPapelera = actionClient
  .inputSchema(esquemaEnviarAPapelera)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeEnvio>> => {
    if (!puedeEnviarCotizacionesALaPapelera(ctx.permisos)) {
      return fallo('sin_permiso', 'No tienes permiso para enviar cotizaciones a la papelera.')
    }
    const resultado = await repositorioDePapeleraDeCotizaciones.enviar(parsedInput.cotizaciones)
    if (resultado.ok && resultado.data.enviados.length > 0) {
      // El listado, la guardada y la papelera (todo bajo `/cotizaciones`) ya ven lo enviado. Si nada entró, la página sigue con la versión que vio.
      revalidatePath(RUTA_DEL_LISTADO, 'layout')
    }
    return resultado
  })
