'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeNotas } from '../../../areas/mover/composicion'
import type { NotaGuardada } from '../../../entities/mover/repositorio-de-notas'
import { esquemaEditarNota } from '../schemas/nota'

// Corrige el cuerpo de una nota propia (6.04-2). Sin versión (D26): dos ventanas de la misma persona, gana la última. La que dejó un cambio de fase no se edita (D9): el filtro del repositorio no la toca.
export const editarNota = actionClient
  .inputSchema(esquemaEditarNota)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<NotaGuardada>> => {
    const { origenId, tipo } = parsedInput
    const permitido =
      tipo === 'repuesto'
        ? puede(ctx.permisos, 'repuestos.ver')
        : puede(ctx.permisos, 'logistica.ver', origenId ?? undefined)
    if (!permitido) {
      return fallo('sin_permiso', 'No tienes permiso para editar notas en esta unidad.')
    }
    return repositorioDeNotas.editar({
      id: parsedInput.id,
      cuerpo: parsedInput.cuerpo,
      autorId: ctx.usuarioId,
    })
  })
