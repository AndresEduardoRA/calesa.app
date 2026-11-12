'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCatalogosDeTransporte } from '../../../areas/transporte/composicion'
import type { PuertoDeCatalogo } from '../../../entities/transporte/catalogo'
import { esquemaCrearPuerto } from '../schemas/catalogo'

// Crea un puerto (6.08-1). Lo admite quien tiene `logistica.catalogos.gestionar`: lo exige la RLS de la tabla.
export const crearPuerto = actionClient
  .inputSchema(esquemaCrearPuerto)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<PuertoDeCatalogo>> => {
    return repositorioDeCatalogosDeTransporte.crearPuerto(parsedInput)
  })
