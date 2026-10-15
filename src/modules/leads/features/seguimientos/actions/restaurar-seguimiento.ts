'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeSeguimientos } from '../../../composicion'
import type { ResultadoDeSeguimiento } from '../../../entities/repositorios'
import { esquemaVersionDeSeguimiento } from '../schemas/seguimientos'
import { comoResultado } from './resultado'

// «Deshacer» de eliminar: vuelve a ponerlo con su contenido y su fecha.
export const restaurarSeguimiento = actionClient
  .inputSchema(esquemaVersionDeSeguimiento)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeSeguimiento>> => {
    if (!puede(ctx.permisos, 'leads.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para editar seguimientos.')
    }
    return comoResultado(await repositorioDeSeguimientos.restaurar(parsedInput))
  })
