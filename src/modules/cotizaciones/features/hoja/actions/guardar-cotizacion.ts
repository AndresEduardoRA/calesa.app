'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { ok } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { guardadorDeCotizacion } from '../../../areas/nucleo/composicion'
import type { ResultadoDeCrear } from '../../../entities/guardado'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { esquemaDeEdicion } from '../schemas/edicion'

// Guarda los cambios de una cotización guardada (`cotizacion_guardar()`, 4.15-3). **Siempre responde `ok(ResultadoDeCrear)` cuando corre**, también con su propio rechazo: así la hoja
// distingue lo que la base contestó (suelta el intento pendiente) de lo que no llegó o lanzó (lo conserva, 4-21). No decide permisos: `cotizacion_guardar` los pide antes y después de
// tomar la fila. Revalida la página de la cotización **sólo** si lo guardado entró (también un `repetido`): vuelve con la versión nueva; nunca en un rechazo ni en una pérdida.
export const guardarCotizacion = actionClient
  .inputSchema(esquemaDeEdicion)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeCrear>> => {
    const resultado = await guardadorDeCotizacion(parsedInput)
    if (resultado.tipo === 'guardada') {
      revalidatePath(rutaDeLaCotizacion(parsedInput.cotizacionId))
    }
    return ok(resultado)
  })
