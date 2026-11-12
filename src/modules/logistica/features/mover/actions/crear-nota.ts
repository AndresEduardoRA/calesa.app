'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeNotas } from '../../../areas/mover/composicion'
import type { NotaGuardada } from '../../../entities/mover/repositorio-de-notas'
import { esquemaCrearNota } from '../schemas/nota'

// Escribe una nota en una unidad (6.04-2). Quien ve la unidad (`logistica.ver` en su origen) escribe; el autor es quien pide, nunca lo que mande el navegador.
export const crearNota = actionClient
  .inputSchema(esquemaCrearNota)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<NotaGuardada>> => {
    if (!puede(ctx.permisos, 'logistica.ver', parsedInput.origenId)) {
      return fallo('sin_permiso', 'No tienes permiso para escribir notas en esta unidad.')
    }
    return repositorioDeNotas.crear({
      vehiculoId: parsedInput.vehiculo,
      cuerpo: parsedInput.cuerpo,
      autorId: ctx.usuarioId,
    })
  })
