'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { ok } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { cotizadorEncima } from '../../../composicion'
import type { ResultadoDeEncima } from '../../../entities/resultado-de-encima'
import { rutaDeLaCotizacion } from '../../../entities/ruta-de-la-hoja'
import { esquemaDeEncima } from '../schemas/encima'

// Cotiza encima de una guardada (`cotizacion_encima()`, 4.15-3b). **Siempre responde `ok(ResultadoDeEncima)` cuando corre**, también con su propio rechazo: así la pantalla distingue
// lo que la base contestó (suelta el intento) de lo que no llegó (lo conserva y reintenta con el mismo). No decide permisos: la base los pide todos (`puede_cotizar_encima` sólo dibuja
// el botón). Revalida la página de la anterior **sólo** si la nueva entró: su cadena cambió y la caché del cliente la olvida.
export const cotizarEncima = actionClient
  .inputSchema(esquemaDeEncima)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeEncima>> => {
    const resultado = await cotizadorEncima(parsedInput)
    if (resultado.tipo === 'creada') {
      revalidatePath(rutaDeLaCotizacion(parsedInput.anterior))
    }
    return ok(resultado)
  })
