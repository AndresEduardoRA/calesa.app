'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeSeguimientos } from '../../../composicion'
import type { ResultadoDeSeguimiento } from '../../../entities/repositorios'
import { esquemaVersionDeSeguimiento } from '../schemas/seguimientos'
import { comoResultado } from './resultado'

// Elimina un seguimiento propio (lógico: «Deshacer» lo restaura). Repetirlo no cambia nada.
export const eliminarSeguimiento = actionClient
  .inputSchema(esquemaVersionDeSeguimiento)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeSeguimiento>> => {
    if (!puede(ctx.permisos, 'leads.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para editar seguimientos.')
    }
    return comoResultado(await repositorioDeSeguimientos.eliminar(parsedInput))
  })
