'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeReglas } from '../../../areas/reglas/composicion'
import { esquemaGuardarOferta } from '../schemas/reglas'
import { comoResultado, motivoSinPermisoDeReglas, sinPermisoDeReglas } from './resultado'

// Guarda la oferta de transporte entera (todo o nada; vacío = se ofrece todo) con la versión que se tenía en pantalla. Devuelve la versión nueva.
export const guardarOferta = actionClient
  .inputSchema(esquemaGuardarOferta)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ version: string }>> => {
    const motivo = motivoSinPermisoDeReglas(ctx.permisos, null, null)
    if (motivo !== null) {
      return sinPermisoDeReglas(motivo)
    }
    const { actualizadoEnEsperado, ...resto } = parsedInput
    const hecho = comoResultado(
      await repositorioDeReglas.guardarOferta({ ...resto, version: actualizadoEnEsperado }),
    )
    if (!hecho.ok) {
      return hecho
    }
    revalidatePath(RUTAS.configuracionDeFlujos, 'layout')
    return { ok: true, data: { version: hecho.data } }
  })
