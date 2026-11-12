'use server'

import { fallo, ok } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDePush } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_PUSH } from '../../../entities/motivos'
import { conPreferencia } from '../../../entities/preferencia-de-push'
import { esquemaGuardarPreferenciaDePush } from '../schemas/preferencias'

// Encender o apagar el push de un tipo. Lee la fila, aplica el cambio y, si ya no queda nada apagado, la borra (vuelve a
// «todo encendido»). Dos pestañas a la vez pueden pisarse una clave: es una preferencia propia y un clic la corrige.
export const guardarPreferenciaDePush = actionClient
  .inputSchema(esquemaGuardarPreferenciaDePush)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'notificaciones.push')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_PUSH)
    }
    const actual = await repositorioDePush.leerPreferencia(ctx.usuarioId)
    if (!actual.ok) {
      return actual
    }
    const guardada = await repositorioDePush.guardarPreferencia(
      ctx.usuarioId,
      conPreferencia(actual.data, parsedInput.tipo, parsedInput.encendido),
    )
    return guardada.ok ? ok(null) : guardada
  })
