'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRecordatorios } from '../../../composicion'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { esquemaVersionDeRecordatorio } from '../schemas/recordatorios'
import { comoResultado } from './resultado'

// «Deshacer» de eliminar. Un recordatorio es de su dueño: no pide permiso
// sobre leads (lo sigue siendo aunque haya perdido el lead), y uno ajeno no existe para nadie más.
export const restaurarRecordatorio = actionClient
  .inputSchema(esquemaVersionDeRecordatorio)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeRecordatorio>> =>
    comoResultado(await repositorioDeRecordatorios.restaurar(parsedInput)),
  )
