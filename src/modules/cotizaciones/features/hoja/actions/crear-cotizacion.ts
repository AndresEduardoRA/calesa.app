'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { ok } from '@/shared/lib/errores'
import { actionClient } from '@/shared/lib/safe-action'
import { creadorDeCotizacion } from '../../../composicion'
import type { ResultadoDeCrear } from '../../../entities/guardado'
import { puedeCotizarEn } from '../../../entities/origenes-para-cotizar'
import { esquemaDeGuardado } from '../schemas/guardado'

// Guarda la hoja como una cotización nueva (preventa). **Siempre responde `ok(ResultadoDeCrear)` cuando corre**, también con su propio rechazo: así la hoja distingue lo que
// la base contestó (suelta el intento pendiente) de lo que no llegó o lanzó (lo conserva, 4-21). La regla de `puedeCotizarEn` es comodidad: la base vuelve a exigirla.
// **Sin `revalidatePath`:** ninguna pantalla lista cotizaciones todavía (4.16, 4.17), y revalidar `/cotizaciones/nuevo` la volvería a dibujar con otra hoja abierta.
export const crearCotizacion = actionClient
  .inputSchema(esquemaDeGuardado)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeCrear>> => {
    if (!puedeCotizarEn(ctx.permisos, parsedInput.origenId)) {
      return ok({ tipo: 'rechazo', motivo: 'sin_acceso' })
    }
    return ok(await creadorDeCotizacion(parsedInput))
  })
