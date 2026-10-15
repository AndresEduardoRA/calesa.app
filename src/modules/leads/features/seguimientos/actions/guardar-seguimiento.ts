'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeSeguimientos } from '../../../composicion'
import type { ResultadoDeSeguimiento } from '../../../entities/repositorios'
import { esquemaGuardarSeguimiento } from '../schemas/seguimientos'
import { comoResultado } from './resultado'

// Guarda lo que cambió de un seguimiento propio, con la versión que tenía en pantalla: una ventana
// vieja recibe el conflicto y no pisa nada. Lo que ya estaba guardado no choca (un reintento).
export const guardarSeguimiento = actionClient
  .inputSchema(esquemaGuardarSeguimiento)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeSeguimiento>> => {
    if (!puede(ctx.permisos, 'leads.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para editar seguimientos.')
    }
    return comoResultado(await repositorioDeSeguimientos.guardar(parsedInput))
  })
