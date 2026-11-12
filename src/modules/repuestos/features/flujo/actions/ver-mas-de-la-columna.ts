'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDelFlujo } from '../../../areas/flujo/composicion'
import type { PaginaDeLaColumnaDeRepuestos } from '../../../entities/flujo/cadena'
import { esquemaDeVerMasDeRepuestos } from '../schemas/cadena'

// «Ver más» de una columna de la Cadena de repuestos (8.13-3): una lectura bajo la RLS de quien mira (sin `repuestos.ver` no vuelven filas). Nunca pasa del tope de lo cargado: lo vigila la
// entidad y el cliente no lo decide.
export const verMasDeLaColumnaDeRepuestos = actionClient
  .inputSchema(esquemaDeVerMasDeRepuestos)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<PaginaDeLaColumnaDeRepuestos>> => {
    return repositorioDelFlujo.columna(parsedInput)
  })
