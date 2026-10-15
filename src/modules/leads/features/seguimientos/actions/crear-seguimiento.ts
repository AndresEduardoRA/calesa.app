'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeSeguimientos } from '../../../composicion'
import type { ResultadoDeSeguimiento } from '../../../entities/repositorios'
import { esquemaCrearSeguimiento } from '../schemas/seguimientos'
import { comoResultado } from './resultado'

// Anota un seguimiento en un lead de la cartera de quien escribe. El intento lleva su id: un
// reintento (o un doble clic) devuelve el mismo. No revalida: la respuesta trae el seguimiento y
// la línea de tiempo lo pone en su lugar; la versión del lead no se mueve.
export const crearSeguimiento = actionClient
  .inputSchema(esquemaCrearSeguimiento)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeSeguimiento>> => {
    if (!puede(ctx.permisos, 'leads.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para anotar seguimientos.')
    }
    return comoResultado(await repositorioDeSeguimientos.crear(parsedInput))
  })
