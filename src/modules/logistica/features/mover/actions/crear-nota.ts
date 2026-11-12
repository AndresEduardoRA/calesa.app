'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeNotas } from '../../../areas/mover/composicion'
import type { NotaGuardada } from '../../../entities/mover/repositorio-de-notas'
import { esquemaCrearNota } from '../schemas/nota'

// Escribe una nota en una unidad (6.04-2). Quien ve la unidad (`logistica.ver` en su origen; `repuestos.ver` si es un ítem) escribe; el autor es quien pide, nunca lo que mande el navegador.
export const crearNota = actionClient
  .inputSchema(esquemaCrearNota)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<NotaGuardada>> => {
    const { vehiculo, repuesto, origenId, cuerpo } = parsedInput
    // Un vehículo se ve con `logistica.ver` en su origen; un ítem, con `repuestos.ver` (D8 de 8.13-2).
    const permitido =
      vehiculo !== undefined
        ? puede(ctx.permisos, 'logistica.ver', origenId)
        : puede(ctx.permisos, 'repuestos.ver')
    if (!permitido) {
      return fallo('sin_permiso', 'No tienes permiso para escribir notas en esta unidad.')
    }
    const autorId = ctx.usuarioId
    if (vehiculo !== undefined)
      return repositorioDeNotas.crear({ vehiculoId: vehiculo, cuerpo, autorId })
    if (repuesto !== undefined)
      return repositorioDeNotas.crear({ repuestoId: repuesto, cuerpo, autorId })
    return fallo('inesperado', 'La nota no dice de qué unidad es.')
  })
