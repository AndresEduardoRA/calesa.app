'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRecordatorios } from '../../../composicion'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { esquemaCrearRecordatorio } from '../schemas/recordatorios'
import { comoResultado } from './resultado'

// Agenda un recordatorio sobre un lead de la cartera de quien lo pide. El intento lleva su id: un
// reintento devuelve el mismo.
export const crearRecordatorio = actionClient
  .inputSchema(esquemaCrearRecordatorio)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ResultadoDeRecordatorio>> => {
    if (!puede(ctx.permisos, 'leads.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para agendar recordatorios sobre leads.')
    }
    return comoResultado(await repositorioDeRecordatorios.crear(parsedInput))
  })
