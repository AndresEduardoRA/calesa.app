'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeReglas } from '../../../areas/reglas/composicion'
import type { RespuestaDeCambio } from '../../../entities/reglas/impacto'
import { esquemaCambiarRegla } from '../schemas/reglas'
import { comoResultado, motivoSinPermisoDeReglas, sinPermisoDeReglas } from './resultado'

// Enciende o apaga una regla con la versión que se tenía en pantalla. Apagar pregunta primero qué la usa: con uso no escribe y lo dice (`en_uso`); si
// el uso llegó entre la pregunta y la escritura, el `23514` de la base se vuelve a preguntar y se dice igual.
export const cambiarRegla = actionClient
  .inputSchema(esquemaCambiarRegla)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeCambio>> => {
    const motivo = motivoSinPermisoDeReglas(ctx.permisos, null, null)
    if (motivo !== null) {
      return sinPermisoDeReglas(motivo)
    }
    const { flujoId, regla, activa, actualizadoEnEsperado: version } = parsedInput
    if (!activa) {
      const antes = await repositorioDeReglas.impacto({ flujoId, regla })
      if (!antes.ok) {
        return comoResultado(antes)
      }
      if (antes.data.bloquea) {
        return { ok: true, data: { estado: 'en_uso', impacto: antes.data } }
      }
    }
    const hecho = await repositorioDeReglas.cambiar({ flujoId, version, regla, activa })
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
      return { ok: true, data: { estado: 'cambiada', version: hecho.data } }
    }
    if (!activa && hecho.error.codigo === 'regla') {
      const ahora = await repositorioDeReglas.impacto({ flujoId, regla })
      if (ahora.ok && ahora.data.bloquea) {
        return { ok: true, data: { estado: 'en_uso', impacto: ahora.data } }
      }
    }
    return comoResultado(hecho)
  })
