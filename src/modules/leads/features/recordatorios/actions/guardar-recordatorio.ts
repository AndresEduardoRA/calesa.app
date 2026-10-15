'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRecordatorios } from '../../../composicion'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { esquemaGuardarRecordatorio } from '../schemas/recordatorios'
import { comoResultado } from './resultado'

// Cambia el título o la hora de un recordatorio propio, con su versión. Cambiar la hora lo vuelve a
// dejar por avisar. Un recordatorio es de su dueño: no pide permiso
// sobre leads (lo sigue siendo aunque haya perdido el lead), y uno ajeno no existe para nadie más.
export const guardarRecordatorio = actionClient
  .inputSchema(esquemaGuardarRecordatorio)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeRecordatorio>> =>
    comoResultado(await repositorioDeRecordatorios.guardar(parsedInput)),
  )
