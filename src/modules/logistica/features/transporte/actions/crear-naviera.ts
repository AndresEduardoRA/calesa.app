'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCatalogosDeTransporte } from '../../../areas/transporte/composicion'
import type { NavieraDeCatalogo } from '../../../entities/transporte/catalogo'
import { esquemaCrearNaviera } from '../schemas/catalogo'

// Crea una naviera (6.08-1). Lo admite quien tiene `logistica.catalogos.gestionar`: lo exige la RLS de la tabla.
export const crearNaviera = actionClient
  .inputSchema(esquemaCrearNaviera)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<NavieraDeCatalogo>> => {
    return repositorioDeCatalogosDeTransporte.crearNaviera(parsedInput)
  })
