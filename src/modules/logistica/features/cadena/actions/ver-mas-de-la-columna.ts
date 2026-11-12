'use server'

import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { leerMasDeLaColumna } from '../../../areas/cadena/composicion'
import type { PaginaDeLaColumna } from '../../../entities/cadena/leer'
import { esquemaDeVerMas } from '../schemas/ver-mas'

// «Ver más» de una columna de la cadena (6.03-1): una lectura, por Server Action para que las tarjetas lleguen con su identidad armada en el servidor, igual que en la primera carga.
// Pide `logistica.ver` del origen antes de leer (la base lo vuelve a exigir) y nunca pasa del tope de lo cargado: lo vigila la entidad, y el cliente no lo decide.
export const verMasDeLaColumna = actionClient
  .inputSchema(esquemaDeVerMas)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<PaginaDeLaColumna>> => {
    if (!puede(ctx.permisos, 'logistica.ver', parsedInput.origenId)) {
      return fallo('sin_permiso', 'No tienes acceso a la logística de este origen.')
    }
    return leerMasDeLaColumna(parsedInput)
  })
