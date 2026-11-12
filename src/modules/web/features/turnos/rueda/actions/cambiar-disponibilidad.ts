'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest, fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { TEXTO_SIN_RUEDA } from '../../../../entities/turnos/rueda'
import { esquemaCambiarDisponibilidad } from '../schemas/disponibilidad'

const NO_SE_GUARDO = 'No pudimos guardarlo.'

// «Disponible para recibir turnos» (8.05-2): escribe sólo `cola_web_asesores.disponible` de la fila propia (`usuario_id` sale de la sesión). La base lo repite
// (policy `usuario_id = auth.uid()` y grant por columna). Sin fila (`.single()`, PK) = la persona no está en la cola o la policy no la dejó: no se dice que quedó guardado.
// Un turno que ya tiene asignado no se toca: sigue hasta que lo confirme o venza.
export const cambiarDisponibilidad = actionClient
  .inputSchema(esquemaCambiarDisponibilidad)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<null>> => {
    if (!puede(ctx.permisos, 'web.cola.participar')) {
      return fallo('sin_permiso', TEXTO_SIN_RUEDA)
    }
    const { error } = await ctx.supabase
      .from('cola_web_asesores')
      .update({ disponible: parsedInput.disponible })
      .eq('usuario_id', ctx.usuarioId)
      .select('usuario_id')
      .single()
    if (error) {
      // `.single()` sin fila (PGRST116): no está en la cola o la policy no la dejó.
      return error.code === 'PGRST116'
        ? fallo('no_encontrado', NO_SE_GUARDO)
        : { ok: false, error: errorDePostgrest(error) }
    }
    return { ok: true, data: null }
  })
