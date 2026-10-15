'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeRecordatorios } from '../../../composicion'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { esquemaCompletarRecordatorio } from '../schemas/recordatorios'
import { comoResultado } from './resultado'

// Completa o reabre un recordatorio propio. Poner, no alternar: repetirlo no cambia nada. Un recordatorio es de su dueño: no pide permiso
// sobre leads (lo sigue siendo aunque haya perdido el lead), y uno ajeno no existe para nadie más.
export const completarRecordatorio = actionClient
  .inputSchema(esquemaCompletarRecordatorio)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ResultadoDeRecordatorio>> =>
    comoResultado(await repositorioDeRecordatorios.completar(parsedInput)),
  )
